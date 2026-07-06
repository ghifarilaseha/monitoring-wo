'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { supabase } from '../../lib/supabase';

const COLORS = ['#2952e3', '#e38b29', '#e34141', '#29a36b', '#8a5be3', '#e3297f', '#1e9be3'];

function percentColor(pct) {
  if (!isFinite(pct)) return '#aaa';
  const clamped = Math.max(0, Math.min(100, pct));
  const hue = (clamped / 100) * 120; // 0 = merah, 120 = hijau
  return `hsl(${hue}, 70%, 45%)`;
}

function fmtPct(x) {
  return isFinite(x) ? `${Math.round(x)}%` : '-';
}

function actualHours(wo) {
  const r = wo._report;
  if (!r || !r.waktu_mulai || !r.waktu_selesai) return null;
  const ms = new Date(r.waktu_selesai) - new Date(r.waktu_mulai);
  return ms > 0 ? ms / 3600000 : null;
}

function KpiGauge({ label, pct }) {
  const data = [{ value: Math.max(0, Math.min(100, isFinite(pct) ? pct : 0)) }, { value: 100 - Math.max(0, Math.min(100, isFinite(pct) ? pct : 0)) }];
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 14, marginBottom: 8 }}>{label}</div>
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={40} outerRadius={60} startAngle={90} endAngle={-270}>
            <Cell fill={percentColor(pct)} />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 22, fontWeight: 700, color: percentColor(pct), marginTop: -90 }}>{fmtPct(pct)}</div>
      <div style={{ height: 60 }} />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState([]);
  const [pelaksanaList, setPelaksanaList] = useState([]);
  const [selectedKategori, setSelectedKategori] = useState(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selectedPic, setSelectedPic] = useState('');
  const [shiftDurasi, setShiftDurasi] = useState(7.5);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/'); return; }

    const { data: profile } = await supabase.from('users').select('role').eq('auth_id', user.id).single();
    if (!profile || profile.role !== 'admin') { router.push('/lapor'); return; }

    const { data } = await supabase
      .from('work_orders')
      .select('*, users(nama)');

    const { data: reportsData } = await supabase
      .from('reports')
      .select('work_order_id, waktu_mulai, waktu_selesai, foto_sebelum_url, foto_sesudah_url');

    const { data: woPelaksanaData } = await supabase
      .from('wo_pelaksana')
      .select('work_order_id, user_id, peran');

    const reportsByWoId = {};
    (reportsData || []).forEach(r => { reportsByWoId[r.work_order_id] = r; });

    const supportByWoId = {};
    (woPelaksanaData || []).forEach(r => {
      if (r.peran === 'support') {
        if (!supportByWoId[r.work_order_id]) supportByWoId[r.work_order_id] = [];
        supportByWoId[r.work_order_id].push(r.user_id);
      }
    });

    const merged = (data || []).map(wo => ({
      ...wo,
      _report: reportsByWoId[wo.id] || null,
      _support_ids: supportByWoId[wo.id] || [],
    }));

    setWorkOrders(merged);

    const { data: pelaksanaData } = await supabase.from('users').select('*').eq('role', 'pelaksana').order('nama');
    setPelaksanaList(pelaksanaData || []);

    setLoading(false);
  }

  if (loading) return <div className="container">Memuat...</div>;

  const filteredWO = workOrders.filter(wo => {
    if (dateFrom && wo.tanggal_rencana < dateFrom) return false;
    if (dateTo && wo.tanggal_rencana > dateTo) return false;
    return true;
  });

  // Chart 1: perbandingan status WO
  const statusMap = {};
  filteredWO.forEach(wo => { statusMap[wo.status_wo] = (statusMap[wo.status_wo] || 0) + 1; });
  const statusData = Object.keys(statusMap).map(k => ({ name: k, value: statusMap[k] }));

  // Chart 2: kategori (hanya WO Approved)
  const approvedWO = filteredWO.filter(wo => wo.status_wo === 'Approved');
  const kategoriMap = {};
  approvedWO.forEach(wo => {
    const k = wo.kategori || 'Lainnya';
    kategoriMap[k] = (kategoriMap[k] || 0) + 1;
  });
  const kategoriData = Object.keys(kategoriMap).map(k => ({ name: k, value: kategoriMap[k] }));

  let instrumenData = [];
  if (selectedKategori) {
    const instrumenMap = {};
    approvedWO
      .filter(wo => (wo.kategori || 'Lainnya') === selectedKategori)
      .forEach(wo => {
        const inst = wo.mesin_instrument || 'Tidak diketahui';
        instrumenMap[inst] = (instrumenMap[inst] || 0) + 1;
      });
    instrumenData = Object.keys(instrumenMap).map(k => ({ name: k, jumlah: instrumenMap[k] }));
  }

  // KPI per pelaksana
  let kpi = null;
  if (selectedPic) {
    const woUntukPic = filteredWO.filter(wo =>
      wo.pic_id === selectedPic || (wo._support_ids || []).includes(selectedPic)
    );
    const totalDibuat = woUntukPic.length;
    const woApproved = woUntukPic.filter(wo => wo.status_wo === 'Approved');
    const totalApproved = woApproved.length;

    const fullfillment = totalDibuat > 0 ? (totalApproved / totalDibuat) * 100 : NaN;

    let onTimeCount = 0;
    let sumTarget = 0;
    let sumActual = 0;
    const tanggalKerjaSet = new Set();

    woApproved.forEach(wo => {
      const actual = actualHours(wo);
      const target = wo.target_durasi_jam;
      if (actual !== null && target) {
        if (actual <= target) onTimeCount++;
        sumTarget += Number(target);
        sumActual += actual;
      }
      if (wo.tanggal_rencana) tanggalKerjaSet.add(wo.tanggal_rencana);
    });

    const onTime = totalApproved > 0 ? (onTimeCount / totalApproved) * 100 : NaN;
    const timeEfficiency = sumActual > 0 ? (sumTarget / sumActual) * 100 : NaN;
    const durasiKerja = shiftDurasi * tanggalKerjaSet.size;
    const effectivity = durasiKerja > 0 ? (sumActual / durasiKerja) * 100 : NaN;

    kpi = { fullfillment, onTime, timeEfficiency, effectivity, woApproved, totalDibuat, totalApproved };
  }

  function handleExportRekap() {
    const rawRows = filteredWO.map(wo => {
      const r = wo._report;
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
        'Durasi Aktual (jam)': actualHours(wo) !== null ? actualHours(wo).toFixed(2) : '',
        'Link Foto Sebelum': r?.foto_sebelum_url || '',
        'Link Foto Sesudah': r?.foto_sesudah_url || '',
        'Status': wo.status_wo,
      };
    });

    const rekapRows = [
      { Keterangan: 'Total WO', Jumlah: filteredWO.length },
      ...statusData.map(s => ({ Keterangan: `Status: ${s.name}`, Jumlah: s.value })),
      ...kategoriData.map(k => ({ Keterangan: `Kategori (Approved): ${k.name}`, Jumlah: k.value })),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawRows), 'Data Mentah');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rekapRows), 'Rekapitulasi');
    const namaFile = `rekap-wo-${dateFrom || 'awal'}_${dateTo || 'akhir'}.xlsx`;
    XLSX.writeFile(wb, namaFile);
  }

  function handleExportKpi() {
    if (!kpi) return;
    const namaPic = pelaksanaList.find(p => p.id === selectedPic)?.nama || '';
    const rows = kpi.woApproved.map(wo => ({
      'Kode WO': wo.wo_code,
      'Tanggal': wo.tanggal_rencana,
      'Deskripsi': wo.deskripsi,
      'Target Durasi (jam)': wo.target_durasi_jam,
      'Durasi Aktual (jam)': actualHours(wo) !== null ? actualHours(wo).toFixed(2) : '',
    }));
    const summary = [
      { Metrik: 'Fullfillment WO', Nilai: fmtPct(kpi.fullfillment) },
      { Metrik: 'On Time WO', Nilai: fmtPct(kpi.onTime) },
      { Metrik: 'Time Efficiency', Nilai: fmtPct(kpi.timeEfficiency) },
      { Metrik: 'Effectivity Work Time', Nilai: fmtPct(kpi.effectivity) },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Ringkasan KPI');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Detail WO');
    XLSX.writeFile(wb, `kpi-${namaPic}-${dateFrom || 'awal'}_${dateTo || 'akhir'}.xlsx`);
  }

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <div className="topbar">
        <h1 style={{ marginBottom: 0 }}>Dashboard monitoring</h1>
        <a href="/admin">Kembali ke admin</a>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ marginBottom: 0 }}>Rekapitulasi Work Order</h2>
          <button className="secondary" style={{ marginTop: 0 }} onClick={handleExportRekap}>Export</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label>Dari</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label>Sampai</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#777', marginTop: 8 }}>Kosongkan untuk menampilkan seluruh data dari awal hingga akhir.</p>
      </div>

      <div className="card">
        <h2>Perbandingan status WO</h2>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={100} label>
              {statusData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2>Perbandingan kategori pekerjaan (khusus status Approved)</h2>
        <p style={{ fontSize: 13, color: '#777', marginTop: -8 }}>Klik salah satu bagian untuk melihat rincian mesin/instrumen.</p>
        {kategoriData.length === 0 && <p style={{ color: '#777' }}>Belum ada WO yang berstatus Approved pada rentang ini.</p>}
        {kategoriData.length > 0 && (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={kategoriData}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
                label
                onClick={(entry) => setSelectedKategori(entry.name)}
                style={{ cursor: 'pointer' }}
              >
                {kategoriData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={COLORS[i % COLORS.length]}
                    stroke={selectedKategori === entry.name ? '#1a1a1a' : 'none'}
                    strokeWidth={selectedKategori === entry.name ? 2 : 0}
                  />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}

        {selectedKategori && (
          <div style={{ marginTop: 16 }}>
            <h2>Rincian mesin/instrumen — kategori "{selectedKategori}"</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={instrumenData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="name" fontSize={12} width={120} />
                <Tooltip />
                <Bar dataKey="jumlah" fill="#2952e3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ marginBottom: 0 }}>Key Performance Index</h2>
          <button className="secondary" style={{ marginTop: 0 }} onClick={handleExportKpi} disabled={!kpi}>Export</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <label>Nama pelaksana</label>
            <select value={selectedPic} onChange={(e) => setSelectedPic(e.target.value)}>
              <option value="">Pilih pelaksana</option>
              {pelaksanaList.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label>Durasi 1 shift (jam)</label>
            <input type="number" step="0.5" value={shiftDurasi} onChange={(e) => setShiftDurasi(parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        {!kpi && <p style={{ color: '#777', marginTop: 16 }}>Pilih nama pelaksana untuk melihat KPI.</p>}

        {kpi && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginTop: 16 }}>
            <KpiGauge label="Fullfillment WO" pct={kpi.fullfillment} />
            <KpiGauge label="On Time WO" pct={kpi.onTime} />
            <KpiGauge label="Time Efficiency" pct={kpi.timeEfficiency} />
            <KpiGauge label="Effectivity Work Time" pct={kpi.effectivity} />
          </div>
        )}
      </div>
    </div>
  );
}
