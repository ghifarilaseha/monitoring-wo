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

  const [targetDurasi, setTargetDurasi] = useState('');

  useEffect(() => {
    if (wo) setTargetDurasi(wo.target_durasi_jam ?? '');
  }, [wo]);

  async function handleSaveTargetDurasi() {
    const { error } = await supabase
      .from('work_orders')
      .update({ target_durasi_jam: targetDurasi === '' ? null : parseFloat(targetDurasi) })
      .eq('id', id);

    if (error) {
      setMsg({ type: 'error', text: error.message });
      return;
    }
    setMsg({ type: 'success', text: 'Target durasi berhasil diperbarui.' });
    load();
  }

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [areas, setAreas] = useState([]);
  const [instrumens, setInstrumens] = useState([]);
  const [kategoris, setKategoris] = useState([]);

  useEffect(() => {
    async function loadMaster() {
      const { data: a } = await supabase.from('master_area').select('*').order('nama');
      setAreas(a || []);
      const { data: i } = await supabase.from('master_instrumen').select('*').order('nama');
      setInstrumens(i || []);
      const { data: k } = await supabase.from('master_kategori').select('*').order('nama');
      setKategoris(k || []);
    }
    loadMaster();
  }, []);

  function startEdit() {
    setEditForm({
      deskripsi: wo.deskripsi || '',
      area: wo.area || '',
      mesin_instrument: wo.mesin_instrument || '',
      kategori: wo.kategori || '',
      tanggal_rencana: wo.tanggal_rencana || '',
    });
    setEditMode(true);
  }

  async function handleSaveRevisi() {
    const { error } = await supabase.from('work_orders').update(editForm).eq('id', id);
    if (error) {
      setMsg({ type: 'error', text: error.message });
      return;
    }
    setMsg({ type: 'success', text: 'Perubahan berhasil disimpan.' });
    setEditMode(false);
    load();
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Yakin mau hapus WO ${wo.wo_code}? Tindakan ini tidak bisa dibatalkan.`);
    if (!confirmed) return;

    const { error } = await supabase.from('work_orders').delete().eq('id', id);
    if (error) {
      setMsg({ type: 'error', text: error.message });
      return;
    }
    router.push('/admin');
  }

  async function handleUnapprove() {
    const { error } = await supabase.from('work_orders').update({ status_wo: 'Selesai' }).eq('id', id);
    if (error) {
      setMsg({ type: 'error', text: error.message });
      return;
    }
    setMsg({ type: 'success', text: 'Status WO dikembalikan ke Selesai.' });
    load();
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
        {!editMode ? (
          <>
            <div className="readonly-field"><b>Deskripsi pekerjaan</b>{wo.deskripsi}</div>
            <div className="readonly-field"><b>Area</b>{wo.area || '-'}</div>
            <div className="readonly-field"><b>Mesin / instrument</b>{wo.mesin_instrument || '-'}</div>
            <div className="readonly-field"><b>Target penyelesaian</b>{wo.tanggal_rencana}</div>
            <div className="readonly-field"><b>Kategori</b>{wo.kategori || '-'}</div>
          </>
        ) : (
          <>
            <label>Deskripsi pekerjaan</label>
            <textarea value={editForm.deskripsi} onChange={(e) => setEditForm({ ...editForm, deskripsi: e.target.value })} />

            <label>Area</label>
            <select value={editForm.area} onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}>
              <option value="">Pilih area</option>
              {areas.map(a => <option key={a.id} value={a.nama}>{a.nama}</option>)}
            </select>

            <label>Mesin / instrument</label>
            <select value={editForm.mesin_instrument} onChange={(e) => setEditForm({ ...editForm, mesin_instrument: e.target.value })}>
              <option value="">Pilih mesin/instrumen</option>
              {instrumens.map(i => <option key={i.id} value={i.nama}>{i.nama}</option>)}
            </select>

            <label>Target penyelesaian</label>
            <input type="date" value={editForm.tanggal_rencana} onChange={(e) => setEditForm({ ...editForm, tanggal_rencana: e.target.value })} />

            <label>Kategori</label>
            <select value={editForm.kategori} onChange={(e) => setEditForm({ ...editForm, kategori: e.target.value })}>
              <option value="">Pilih kategori</option>
              {kategoris.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
            </select>
          </>
        )}
        <div style={{ marginBottom: 12 }}>
          <label>Target durasi (jam)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" step="0.5" min="0" value={targetDurasi} onChange={(e) => setTargetDurasi(e.target.value)} />
            <button className="secondary" style={{ marginTop: 0 }} onClick={handleSaveTargetDurasi}>Simpan</button>
          </div>
        </div>
        <div className="readonly-field"><b>PIC</b>{wo.users?.nama || '-'}</div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          {!editMode ? (
            <button className="secondary" onClick={startEdit}>Revisi</button>
          ) : (
            <>
              <button onClick={handleSaveRevisi}>Simpan perubahan</button>
              <button className="secondary" onClick={() => setEditMode(false)}>Batal</button>
            </>
          )}
          {wo.status_wo === 'Belum Selesai' && !editMode && (
            <button onClick={handleDelete} style={{ background: '#b3261e' }}>Hapus WO</button>
          )}
        </div>
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
            <div className="success" style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>WO ini sudah di-approve.</span>
              <button className="secondary" style={{ marginTop: 0 }} onClick={handleUnapprove}>Batal Approve</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
