'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import Sidebar from '../../../components/Sidebar';
import { formatDate, formatTime, formatDuration } from '../../../../src/utils/dateUtils';

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
  const [namaUser, setNamaUser] = useState('Admin');
  const [remarks, setRemarks] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from('users').select('nama').eq('auth_id', user.id).single();
        if (p) setNamaUser(p.nama);
      }
      load();
    }
    init();
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

  if (loading) return <div className="loading">Memuat...</div>;
  if (!wo) return <div className="loading">Work order tidak ditemukan.</div>;

  return (
    <div className="app-layout">
      <Sidebar role="admin" namaUser={namaUser} />
      <div className="main-content">
        <div className="topbar">
          <a href="/admin" className="topbar-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Kembali
          </a>
          <h1 style={{ fontSize: 16 }}>{wo.wo_code}</h1>
          <span className={`status-badge status-${wo.status_wo === 'Belum Selesai' ? 'belum' : wo.status_wo === 'Selesai' ? 'selesai' : 'approved'}`}>{wo.status_wo}</span>
        </div>
        <div className="container">

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
          <div className="readonly-field"><b>Waktu mulai</b>{report.waktu_mulai ? new Date(report.waktu_mulai).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'}</div>
          <div className="readonly-field"><b>Waktu selesai</b>{report.waktu_selesai ? new Date(report.waktu_selesai).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'}</div>
          <div className="readonly-field"><b>Lama pengerjaan aktual</b>{formatDuration(report.waktu_mulai, report.waktu_selesai)}</div>
          <div className="readonly-field"><b>Keterangan</b>{report.keterangan || '-'}</div>

          {/* Foto dengan metadata EXIF */}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <div>
              <b style={{ fontSize: 12, color: '#777', display: 'block', marginBottom: 6 }}>Sebelum</b>
              {report.foto_sebelum_url
                ? <img src={report.foto_sebelum_url} alt="Sebelum" style={{ width: 200, borderRadius: 8, display: 'block' }} />
                : <span style={{ color: '#aaa', fontSize: 13 }}>Tidak ada foto</span>}
              {report.foto_sebelum_url && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <div><b>Diambil</b></div>
                  {report.foto_sebelum_taken_at ? (
                    <><div>{formatDate(report.foto_sebelum_taken_at)}</div><div>{formatTime(report.foto_sebelum_taken_at)}</div></>
                  ) : <div>-</div>}
                  {report.foto_sebelum_uploaded_at && (
                    <><div style={{ marginTop: 4 }}><b>Diunggah</b></div>
                    <div>{formatDate(report.foto_sebelum_uploaded_at)}</div>
                    <div>{formatTime(report.foto_sebelum_uploaded_at)}</div></>
                  )}
                </div>
              )}
            </div>
            <div>
              <b style={{ fontSize: 12, color: '#777', display: 'block', marginBottom: 6 }}>Sesudah</b>
              {report.foto_sesudah_url
                ? <img src={report.foto_sesudah_url} alt="Sesudah" style={{ width: 200, borderRadius: 8, display: 'block' }} />
                : <span style={{ color: '#aaa', fontSize: 13 }}>Tidak ada foto</span>}
              {report.foto_sesudah_url && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <div><b>Diambil</b></div>
                  {report.foto_sesudah_taken_at ? (
                    <><div>{formatDate(report.foto_sesudah_taken_at)}</div><div>{formatTime(report.foto_sesudah_taken_at)}</div></>
                  ) : <div>-</div>}
                  {report.foto_sesudah_uploaded_at && (
                    <><div style={{ marginTop: 4 }}><b>Diunggah</b></div>
                    <div>{formatDate(report.foto_sesudah_uploaded_at)}</div>
                    <div>{formatTime(report.foto_sesudah_uploaded_at)}</div></>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Photo Time Tracker */}
          <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase' }}>
              Photo Time Tracker
            </div>
            {(report.foto_sebelum_taken_at && report.foto_sesudah_taken_at) ? (
              <>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>BEFORE</div>
                    <div style={{ fontSize: 13 }}>{formatDate(report.foto_sebelum_taken_at)}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{formatTime(report.foto_sebelum_taken_at)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-light)', fontSize: 18 }}>→</div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>AFTER</div>
                    <div style={{ fontSize: 13 }}>{formatDate(report.foto_sesudah_taken_at)}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{formatTime(report.foto_sesudah_taken_at)}</div>
                  </div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 16px', display: 'inline-block' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>ESTIMASI DURASI</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>
                    {formatDuration(report.foto_sebelum_taken_at, report.foto_sesudah_taken_at)}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Data metadata foto belum tersedia
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 10 }}>
              Durasi dihitung berdasarkan metadata EXIF foto Before dan After. Hasil ini hanya sebagai referensi monitoring pekerjaan.
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
      </div>
    </div>
  );
}
