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

/**
 * Converts a local datetime-local input string (WIB) to UTC ISO string
 * before storing in Supabase. Supabase stores all timestamps as UTC.
 *
 * @param {string} localDatetimeStr - Value from <input type="datetime-local">
 * @returns {string|null} UTC ISO string, or null if input is empty
 */
export function toUTC(localDatetimeStr) {
  if (!localDatetimeStr) return null;
  const local = new Date(localDatetimeStr);
  return new Date(local.getTime() - WIB_OFFSET_HOURS * 60 * 60 * 1000).toISOString();
}

/**
 * Formats a UTC timestamp from Supabase for display in WIB timezone.
 *
 * @param {string} utcString - ISO timestamp from Supabase
 * @returns {string} Formatted datetime in WIB, e.g. "6/7/2026, 10.00.00"
 */
export function formatWIB(utcString) {
  if (!utcString) return '-';
  return new Date(utcString).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
}

/**
 * Formats a date string (YYYY-MM-DD) to Indonesian long format.
 * Used in the WhatsApp daily message generator.
 *
 * @param {string} dateStr - Date string in YYYY-MM-DD format
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
 *
 * @param {string} waktuMulai - UTC ISO start time from Supabase
 * @param {string} waktuSelesai - UTC ISO end time from Supabase
 * @returns {number|null} Duration in hours (decimal), or null if data is incomplete
 */
export function hitungDurasiAktual(waktuMulai, waktuSelesai) {
  if (!waktuMulai || !waktuSelesai) return null;
  const ms = new Date(waktuSelesai) - new Date(waktuMulai);
  return ms > 0 ? ms / 3600000 : null;
}

/**
 * Formats a duration in hours to a human-readable string.
 *
 * @param {string} mulai - UTC ISO start time
 * @param {string} selesai - UTC ISO end time
 * @returns {string} e.g. "2 jam 30 menit" or "-"
 */
export function formatDurasi(mulai, selesai) {
  const hours = hitungDurasiAktual(mulai, selesai);
  if (hours === null) return '-';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h} jam ${m} menit`;
}
