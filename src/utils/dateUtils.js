/**
 * File: dateUtils.js
 * Module: utils
 * Purpose: All date/time formatting and conversion functions.
 *          Centralizes WIB (UTC+7) timezone handling so it is
 *          never duplicated across components.
 * Author: Utility Monitoring System
 * Last Modified: 2026-07
 */

const WIB_OFFSET_HOURS = 7;
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const WIB_TZ = 'Asia/Jakarta';

/**
 * Formats a UTC timestamp to date string in WIB.
 * @param {string|Date} utcStr
 * @returns {string} e.g. "10 Juli 2026"
 */
export function formatDate(utcStr) {
  if (!utcStr) return '-';
  const d = new Date(utcStr);
  if (isNaN(d)) return '-';
  const wib = new Date(d.toLocaleString('en-US', { timeZone: WIB_TZ }));
  return `${wib.getDate()} ${BULAN_PANJANG[wib.getMonth()]} ${wib.getFullYear()}`;
}

/**
 * Formats a UTC timestamp to time string in WIB.
 * @param {string|Date} utcStr
 * @returns {string} e.g. "08:15 WIB"
 */
export function formatTime(utcStr) {
  if (!utcStr) return '-';
  const d = new Date(utcStr);
  if (isNaN(d)) return '-';
  return d.toLocaleTimeString('id-ID', { timeZone: WIB_TZ, hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

/**
 * Formats a UTC timestamp to full datetime in WIB.
 * @param {string|Date} utcStr
 * @returns {string} e.g. "10 Juli 2026, 08:15 WIB"
 */
export function formatDateTime(utcStr) {
  if (!utcStr) return '-';
  const d = formatDate(utcStr);
  const t = formatTime(utcStr);
  if (d === '-') return '-';
  return `${d}, ${t}`;
}

/**
 * Formats duration between two timestamps in human-readable form.
 * @param {string} fromStr - UTC ISO start time
 * @param {string} toStr - UTC ISO end time
 * @returns {string} e.g. "1 Jam 13 Menit" or "-"
 */
export function formatDuration(fromStr, toStr) {
  if (!fromStr || !toStr) return '-';
  const ms = new Date(toStr) - new Date(fromStr);
  if (ms <= 0) return '-';
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} Menit`;
  if (m === 0) return `${h} Jam`;
  return `${h} Jam ${m} Menit`;
}

/**
 * Converts a local datetime-local input string (WIB) to UTC ISO string
 * before storing in Supabase. Appends +07:00 offset explicitly.
 *
 * @param {string} localDatetimeStr - Value from <input type="datetime-local">
 * @returns {string|null} ISO string with WIB offset, or null if empty
 */
export function toWIBISO(localDatetimeStr) {
  if (!localDatetimeStr) return null;
  return localDatetimeStr + ':00+07:00';
}

/**
 * Converts a UTC timestamp from Supabase back to datetime-local
 * input format in WIB, for pre-filling form fields.
 *
 * @param {string} utcStr - ISO timestamp from Supabase
 * @returns {string} e.g. "2026-07-10T08:15"
 */
export function toLocalInput(utcStr) {
  if (!utcStr) return '';
  const d = new Date(new Date(utcStr).getTime() + WIB_OFFSET_HOURS * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

/**
 * Formats a UTC timestamp for display in WIB timezone.
 * @param {string} utcString
 * @returns {string}
 */
export function formatWIB(utcString) {
  if (!utcString) return '-';
  return new Date(utcString).toLocaleString('id-ID', { timeZone: WIB_TZ });
}

/**
 * Formats a date string (YYYY-MM-DD) to Indonesian long format for WA messages.
 * @param {string} dateStr
 * @returns {string} e.g. "Senin, 07-Jul-2026"
 */
export function formatTanggalWA(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const hari = d.toLocaleDateString('id-ID', { weekday: 'long' });
  const dd = String(d.getDate()).padStart(2, '0');
  const mmm = BULAN[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${hari}, ${dd}-${mmm}-${yyyy}`;
}

/**
 * Calculates the actual working duration in hours from two UTC timestamp strings.
 * @param {string} waktuMulai
 * @param {string} waktuSelesai
 * @returns {number|null}
 */
export function hitungDurasiAktual(waktuMulai, waktuSelesai) {
  if (!waktuMulai || !waktuSelesai) return null;
  const ms = new Date(waktuSelesai) - new Date(waktuMulai);
  return ms > 0 ? ms / 3600000 : null;
}

/**
 * Formats duration between start and end timestamps (legacy, used in admin detail).
 * @param {string} mulai
 * @param {string} selesai
 * @returns {string}
 */
export function formatDurasi(mulai, selesai) {
  return formatDuration(mulai, selesai);
}
