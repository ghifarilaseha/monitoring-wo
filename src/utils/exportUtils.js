/**
 * File: exportUtils.js
 * Module: utils
 * Purpose: All Excel export functions in one place.
 *          Currently exported as raw data + summary sheet from dashboard,
 *          and as a daily shift data export from the WA generator page.
 *          Using SheetJS (xlsx) library.
 * Author: Utility Monitoring System
 * Last Modified: 2026-07
 */

import * as XLSX from 'xlsx';
import { getActualHours } from './kpiUtils';
import { formatPct } from './kpiUtils';

/**
 * Exports the work order list to Excel with raw data + summary sheets.
 * Used from the Admin page and Dashboard Rekap section.
 *
 * @param {Object[]} workOrders - Filtered array of work order objects
 * @param {Object[]} statusData - Array of { name, value } for status summary
 * @param {Object[]} kategoriData - Array of { name, value } for category summary
 * @param {string} dateFrom - Start date filter string (for filename)
 * @param {string} dateTo - End date filter string (for filename)
 */
export function exportWorkOrdersToExcel(workOrders, statusData, kategoriData, dateFrom, dateTo) {
  const rawRows = workOrders.map(wo => {
    const r = wo._report;
    const actual = getActualHours(wo);
    return {
      'Kode WO': wo.wo_code,
      'Tanggal Rencana': wo.tanggal_rencana,
      'Area': wo.area,
      'Mesin/Instrumen': wo.mesin_instrument,
      'Deskripsi': wo.deskripsi,
      'Kategori': wo.kategori,
      'Prioritas': wo.prioritas,
      'PIC': wo.users?.nama || '',
      'Target Durasi (jam)': wo.target_durasi_jam,
      'Durasi Aktual (jam)': actual !== null ? actual.toFixed(2) : '',
      'Link Foto Sebelum': r?.foto_sebelum_url || '',
      'Link Foto Sesudah': r?.foto_sesudah_url || '',
      'Status': wo.status_wo,
    };
  });

  const rekapRows = [
    { Keterangan: 'Total WO', Jumlah: workOrders.length },
    ...statusData.map(s => ({ Keterangan: `Status: ${s.name}`, Jumlah: s.value })),
    ...kategoriData.map(k => ({ Keterangan: `Kategori (Approved): ${k.name}`, Jumlah: k.value })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawRows), 'Data Mentah');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rekapRows), 'Rekapitulasi');

  const namaFile = `rekap-wo-${dateFrom || 'awal'}_${dateTo || 'akhir'}.xlsx`;
  XLSX.writeFile(wb, namaFile);
}

/**
 * Exports KPI data for a specific pelaksana to Excel.
 * Used from the Dashboard KPI section.
 *
 * @param {Object} kpi - KPI result from calculateKPI()
 * @param {string} namaPic - Display name of the pelaksana
 * @param {string} dateFrom - Start date filter (for filename)
 * @param {string} dateTo - End date filter (for filename)
 */
export function exportKPIToExcel(kpi, namaPic, dateFrom, dateTo) {
  const summary = [
    { Metrik: 'Fullfillment WO', Nilai: formatPct(kpi.fullfillment) },
    { Metrik: 'On Time WO', Nilai: formatPct(kpi.onTime) },
    { Metrik: 'Time Efficiency', Nilai: formatPct(kpi.timeEfficiency) },
    { Metrik: 'Effectivity Work Time', Nilai: formatPct(kpi.effectivity) },
  ];

  const detailRows = kpi.woApproved.map(wo => {
    const actual = getActualHours(wo);
    return {
      'Kode WO': wo.wo_code,
      'Tanggal': wo.tanggal_rencana,
      'Deskripsi': wo.deskripsi,
      'Target Durasi (jam)': wo.target_durasi_jam,
      'Durasi Aktual (jam)': actual !== null ? actual.toFixed(2) : '',
    };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Ringkasan KPI');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), 'Detail WO');

  XLSX.writeFile(wb, `kpi-${namaPic}-${dateFrom || 'awal'}_${dateTo || 'akhir'}.xlsx`);
}

/**
 * Exports daily shift data (from data_harian table) to Excel.
 * Used from the WA Generator page.
 *
 * @param {Object[]} data - Array of data_harian rows from Supabase
 * @param {string} exportFrom - Start date filter (for filename)
 * @param {string} exportTo - End date filter (for filename)
 */
export function exportDataHarianToExcel(data, exportFrom, exportTo) {
  const rows = data.map(r => ({
    'Tanggal': r.tanggal,
    'Shift': r.shift,
    'Boiler & PWT': r.ringkasan_boiler || '',
    'Operator WS, CAOF dan PSG NBL': r.ringkasan_ws || '',
    'Teknisi Mobile': r.ringkasan_teknisi || '',
    'Kepala Regu': r.ringkasan_kepala_regu || '',
    'NBL': r.keterangan_nbl || '',
    'Cepha': r.keterangan_cepha || '',
    'Catatan': r.catatan || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Harian');
  XLSX.writeFile(wb, `data-harian-${exportFrom || 'awal'}_${exportTo || 'akhir'}.xlsx`);
}
