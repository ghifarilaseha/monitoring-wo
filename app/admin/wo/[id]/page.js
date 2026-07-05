'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

function formatDuration(mulai, selesai) {
  if (!mulai || !selesai) return '-';
  const ms = new Date(selesai) - new Date(mulai);
  if (ms <= 0) return '-';
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h} jam ${m} menit`;
}

export default function WoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [wo, setWo] = useState(null);
  const [report, setReport] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const { data: woData } = await supabase.from('work_orders').select('*, users(nama)').eq('id', id).single();
    setWo(woData);
    setRemarks(woData?.remarks || '');

    const { data: reportData } = await supabase.from('reports').select('*').eq('work_order_id', id).maybeSingle();
    setReport(reportData);
    setLoading(false);
  }

  async function handleDecision(newStatus) {
    setMsg({ type: '', text: '' });
    const { error } = await supabase
      .from('work_orders')
      .update({ status_wo: newStatus, remarks })
      .eq('id', id);

    if (error) {
      setMsg({ type: 'error', text: error.message });
      return;
    }

    setMsg({ type: 'success', text: newStatus === 'Approved' ? 'WO disetujui.' : 'WO dikembalikan ke pelaksana untuk revisi.' });
    setTimeout(() => router.push('/admin'), 800);
  }

  if (loading) return <div className="container">Memuat...</div>;
  if (!wo) return <div className="container">Work order tidak ditemukan.</div>;

  return (
    <div className="container">
      <div className="topbar">
        <h1 style={{ marginBottom: 0 }}>Lapor: {wo.wo_code}</h1>
        <a href="/admin">Kembali</a>
      </div>

      {msg.text && <div className={msg.type}>{msg.text}</div>}

      <div className="card">
        <div className="readonly-field"><b>Deskripsi pekerjaan</b>{wo.deskripsi}</div>
        <div className="readonly-field"><b>Area</b>{wo.area || '-'}</div>
        <div className="readonly-field"><b>Mesin / instrument</b>{wo.mesin_instrument || '-'}</div>
        <div className="readonly-field"><b>Target penyelesaian</b>{wo.tanggal_rencana}</div>
        <div className="readonly-field"><b>Kategori</b>{wo.kategori || '-'}</div>
        <div className="readonly-field"><b>Target durasi</b>{wo.target_durasi_jam ? `${wo.target_durasi_jam} jam` : '-'}</div>
        <div className="readonly-field"><b>PIC</b>{wo.users?.nama || '-'}</div>
      </div>

      {!report && (
        <div className="card">
          <p style={{ color: '#777' }}>Pelaksana belum mengirim laporan untuk WO ini.</p>
        </div>
      )}

      {report && (
        <div className="card">
          <h2>Hasil pekerjaan pelaksana</h2>
          <div className="readonly-field"><b>Waktu mulai</b>{report.waktu_mulai ? new Date(report.waktu_mulai).toLocaleString('id-ID') : '-'}</div>
          <div className="readonly-field"><b>Waktu selesai</b>{report.waktu_selesai ? new Date(report.waktu_selesai).toLocaleString('id-ID') : '-'}</div>
          <div className="readonly-field"><b>Lama pengerjaan aktual</b>{formatDuration(report.waktu_mulai, report.waktu_selesai)}</div>
          <div className="readonly-field"><b>Keterangan</b>{report.keterangan || '-'}</div>

          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <div>
              <b style={{ fontSize: 12, color: '#777', display: 'block', marginBottom: 6 }}>Sebelum</b>
              {report.foto_sebelum_url
                ? <img src={report.foto_sebelum_url} alt="Sebelum" style={{ width: 200, borderRadius: 8 }} />
                : <span style={{ color: '#aaa', fontSize: 13 }}>Tidak ada foto</span>}
            </div>
            <div>
              <b style={{ fontSize: 12, color: '#777', display: 'block', marginBottom: 6 }}>Sesudah</b>
              {report.foto_sesudah_url
                ? <img src={report.foto_sesudah_url} alt="Sesudah" style={{ width: 200, borderRadius: 8 }} />
                : <span style={{ color: '#aaa', fontSize: 13 }}>Tidak ada foto</span>}
            </div>
          </div>

          {wo.status_wo === 'Selesai' && (
            <>
              <label>Remarks</label>
              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Catatan untuk pelaksana (wajib diisi kalau reject)" />

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleDecision('Approved')} style={{ background: '#1e6b3c' }}>Approve</button>
                <button onClick={() => handleDecision('Belum Selesai')} style={{ background: '#b3261e' }}>Reject</button>
              </div>
            </>
          )}

          {wo.status_wo === 'Approved' && (
            <div className="success" style={{ marginTop: 12 }}>WO ini sudah di-approve.</div>
          )}
        </div>
      )}
    </div>
  );
}
