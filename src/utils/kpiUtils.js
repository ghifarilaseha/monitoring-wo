/**
 * File: kpiUtils.js
 * Module: utils
 * Purpose: Pure functions for calculating all KPI metrics.
 *          Extracted from dashboard/page.js to make them testable,
 *          reusable, and easy to understand in isolation.
 *          All functions are pure (no side effects, no Supabase calls).
 * Author: Utility Monitoring System
 * Last Modified: 2026-07
 */

import { hitungDurasiAktual } from './dateUtils';

/**
 * Gets the report associated with a work order.
 * Work orders are enriched with a _report field after client-side join.
 *
 * @param {Object} wo - Work order object with _report field
 * @returns {Object|null} The report object or null
 */
export function getReport(wo) {
  return wo._report || null;
}

/**
 * Calculates the actual working hours for a work order.
 * Reads waktu_mulai and waktu_selesai from the associated report.
 *
 * @param {Object} wo - Work order with _report field
 * @returns {number|null} Hours as decimal, or null if data is missing
 */
export function getActualHours(wo) {
  const r = getReport(wo);
  if (!r) return null;
  return hitungDurasiAktual(r.waktu_mulai, r.waktu_selesai);
}

/**
 * Formats a KPI percentage for display.
 *
 * @param {number} pct - Percentage value
 * @returns {string} e.g. "85%" or "-" if not a finite number
 */
export function formatPct(pct) {
  return isFinite(pct) ? `${Math.round(pct)}%` : '-';
}

/**
 * Returns a CSS hsl color based on a percentage value.
 * 0% = red, 100% = green. Used for KPI gauge coloring.
 *
 * @param {number} pct - Percentage value (0–100+)
 * @returns {string} CSS hsl color string
 */
export function getPercentColor(pct) {
  if (!isFinite(pct)) return '#aaa';
  const clamped = Math.max(0, Math.min(100, pct));
  const hue = (clamped / 100) * 120;
  return `hsl(${hue}, 70%, 45%)`;
}

/**
 * Calculates all 4 KPI metrics for a given pelaksana.
 *
 * Definitions:
 * - Fullfillment WO: WO Approved ÷ Total WO dibuat × 100
 * - On Time WO: WO selesai tepat waktu (aktual ≤ target) ÷ Total WO Approved × 100
 * - Time Efficiency: Total jam target ÷ Total jam aktual × 100
 * - Effectivity Work Time: Total jam aktual ÷ (durasi shift × hari kerja unik) × 100
 *
 * @param {Object[]} woUntukPic - All WOs assigned to or supported by this pelaksana
 * @param {number} shiftDurasi - Duration of one shift in hours (default 7.5)
 * @returns {Object} KPI result object with fullfillment, onTime, timeEfficiency, effectivity, woApproved, totalDibuat
 */
export function calculateKPI(woUntukPic, shiftDurasi = 7.5) {
  const totalDibuat = woUntukPic.length;
  const woApproved = woUntukPic.filter(wo => wo.status_wo === 'Approved');
  const totalApproved = woApproved.length;

  const fullfillment = totalDibuat > 0
    ? (totalApproved / totalDibuat) * 100
    : NaN;

  let onTimeCount = 0;
  let sumTarget = 0;
  let sumActual = 0;
  const tanggalKerjaSet = new Set();

  woApproved.forEach(wo => {
    const actual = getActualHours(wo);
    const target = wo.target_durasi_jam;

    if (actual !== null && target) {
      if (actual <= Number(target)) onTimeCount++;
      sumTarget += Number(target);
      sumActual += actual;
    }

    if (wo.tanggal_rencana) {
      tanggalKerjaSet.add(wo.tanggal_rencana);
    }
  });

  const onTime = totalApproved > 0
    ? (onTimeCount / totalApproved) * 100
    : NaN;

  const timeEfficiency = sumActual > 0
    ? (sumTarget / sumActual) * 100
    : NaN;

  const durasiKerja = shiftDurasi * tanggalKerjaSet.size;
  const effectivity = durasiKerja > 0
    ? (sumActual / durasiKerja) * 100
    : NaN;

  return {
    fullfillment,
    onTime,
    timeEfficiency,
    effectivity,
    woApproved,
    totalDibuat,
    totalApproved,
  };
}
