/**
 * File: waUtils.js
 * Module: utils
 * Purpose: Pure function for generating the WhatsApp daily shift message.
 *          Extracted from admin/wa/page.js to make it independently testable
 *          and reusable. The UI component only needs to call generatePesanWA()
 *          with the required data.
 * Author: Utility Monitoring System
 * Last Modified: 2026-07
 */

import { formatTanggalWA } from './dateUtils';

/**
 * Generates the formatted WhatsApp daily shift message text.
 *
 * @param {Object} params
 * @param {string} params.tanggal - Date string YYYY-MM-DD
 * @param {string} params.shift - Shift name e.g. "Shift 1"
 * @param {Object[]} params.rolesTerisi - Array of role definitions that have a person assigned
 * @param {Function} params.getNama - Function to get person name from user ID
 * @param {Object} params.form - Form state containing tugasKey values and keterangan fields
 * @param {Object} params.woPerOrang - Map of user_id -> array of WO description strings
 * @param {string} params.linkUpload - URL for the upload link at the end of the message
 * @returns {{ text: string, ringkasanPerRole: Object }} Generated message and per-role summaries
 */
export function generatePesanWA({ tanggal, shift, rolesTerisi, getNama, form, woPerOrang, linkUpload }) {
  let text = `Tim Utility\n${formatTanggalWA(tanggal)} ${shift}\n\n`;

  // Section: Personil
  text += `Personil\n`;
  rolesTerisi.forEach((r, i) => {
    text += `${i + 1}. Pak ${getNama(form[r.key])} (${r.tugas})\n`;
  });

  if (form.catatan?.trim()) {
    text += `${form.catatan.trim()}\n`;
  }

  // Section: Pekerjaan hari ini
  text += `\nPekerjaan hari ini\n`;
  const ringkasanPerRole = {};

  rolesTerisi.forEach((r) => {
    const picId = form[r.key];
    text += `\nPak ${getNama(picId)}\n`;

    const tugasManual = form[r.tugasKey]?.trim();
    const woNya = woPerOrang[picId] || [];

    const daftarPekerjaan = [];
    if (tugasManual) daftarPekerjaan.push(tugasManual);
    daftarPekerjaan.push(...woNya);
    if (daftarPekerjaan.length === 0) {
      daftarPekerjaan.push('Tidak ada WO terjadwal hari ini');
    }

    daftarPekerjaan.forEach((line, i) => {
      text += `${i + 1}. ${line}\n`;
    });

    // Save compact version for tabular export
    ringkasanPerRole[r.key] = `${getNama(picId)}\n` +
      daftarPekerjaan.map((l, i) => `${i + 1}. ${l}`).join('\n');
  });

  // Section: NBL / Cepha
  if (form.keterangan_nbl?.trim()) text += `\nNBL: ${form.keterangan_nbl.trim()}`;
  if (form.keterangan_cepha?.trim()) text += `\nCepha: ${form.keterangan_cepha.trim()}`;

  // Section: Link upload
  text += `\n\nUpload hasil pekerjaan pada:\n${linkUpload}`;

  return { text, ringkasanPerRole };
}
