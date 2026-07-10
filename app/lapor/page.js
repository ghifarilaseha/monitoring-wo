'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Sidebar from '../components/Sidebar';

export default function LaporPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [picWOs, setPicWOs] = useState([]);
  const [supportWOs, setSupportWOs] = useState([]);
  const [areas, setAreas] = useState([]);
  const [instrumens, setInstrumens] = useState([]);
  const [kategoris, setKategoris] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('daftar');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  const [report, setReport] = useState({ waktu_mulai: '', waktu_selesai: '', keterangan: '', foto_sebelum: null, foto_sesudah: null, foto_sebelum_url_lama: null, foto_sesudah_url_lama: null });
  const [newWO, setNewWO] = useState({ area: '', mesin_instrument: '', deskripsi: '', kategori: '', prioritas: 'Medium' });

  useEffect(() => {
    init();
  }, []);

  const [historyReports, setHistoryReports] = useState({});

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/'); return; }

    const { data: userProfile } = await supabase.from('users').select('*').eq('auth_id', user.id).single();

    // Fix bug: kalau admin nyasar ke halaman ini, redirect ke admin
    if (!userProfile || userProfile.role === 'admin') {
      router.push('/admin');
      return;
    }

    setProfile(userProfile);
    loadWorkOrders(userProfile.id);

    const { data: areaData } = await supabase.from('master_area').select('*').order('nama');
    setAreas(areaData || []);
    const { data: instrumenData } = await supabase.from('master_instrumen').select('*').order('nama');
    setInstrumens(instrumenData || []);
    const { data: kategoriData } = await supabase.from('master_kategori').select('*').order('nama');
    setKategoris(kategoriData || []);
  }

  async function loadWorkOrders(userId) {
    const { data: woPelaksana } = await supabase
      .from('wo_pelaksana')
      .select('peran, work_orders(*)')
      .eq('user_id', userId);

    const allWO = woPelaksana || [];
    const pic = allWO
      .filter(r => r.peran === 'pic' && r.work_orders?.status_wo !== 'Approved')
      .map(r => r.work_orders);
    const support = allWO
      .filter(r => r.peran === 'support' && r.work_orders?.status_wo !== 'Approved')
      .map(r => r.work_orders);

    setPicWOs(pic);
    setSupportWOs(support);
  }

  async function handleCreateWO(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    const { data, error } = await supabase.from('work_orders').insert({
      tanggal_rencana: new Date().toISOString().slice(0, 10),
      area: newWO.area,
      mesin_instrument: newWO.mesin_instrument,
      deskripsi: newWO.deskripsi,
      kategori: newWO.kategori,
      prioritas: newWO.prioritas,
      pic_id: profile.id,
      sumber: 'tidak terencana',
    }).select().single();

    if (error) {
      setMsg({ type: 'error', text: error.message });
      return;
    }

    await supabase.from('wo_pelaksana').insert({ work_order_id: data.id, user_id: profile.id, peran: 'pic' });

    setMsg({ type: 'success', text: `WO ${data.wo_code} berhasil dibuat. Silakan lapor dari tab Daftar WO.` });
    setNewWO({ area: '', mesin_instrument: '', deskripsi: '', kategori: '', prioritas: 'Medium' });
    setTab('daftar');
    loadWorkOrders(profile.id);
  }

  const [historyWOs, setHistoryWOs] = useState([]);
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);

  async function loadHistory() {
    if (!historyFrom && !historyTo) return;
    setHistoryLoading(true);

    let query = supabase
      .from('work_orders')
      .select('*, users(nama)')
      .order('tanggal_rencana', { ascending: false });

    if (historyFrom) query = query.gte('tanggal_rencana', historyFrom);
    if (historyTo) query = query.lte('tanggal_rencana', historyTo);

    const { data } = await query;
    setHistoryWOs(data || []);
    setHistoryReports({});
    setSelectedHistory(null);
    setHistoryLoading(false);
  }

  async function handleExpandHistory(wo) {
    // Toggle collapse
    if (selectedHistory?.id === wo.id) {
      setSelectedHistory(null);
      return;
    }

    setSelectedHistory(wo);

    // Hanya fetch report kalau WO sudah ada laporan (Selesai atau Approved)
    if (wo.status_wo === 'Belum Selesai') return;
    if (historyReports[wo.id]) return; // sudah pernah di-fetch

    const { data: rep } = await supabase
      .from('reports')
      .select('keterangan, foto_sebelum_url, foto_sesudah_url')
      .eq('work_order_id', wo.id)
      .maybeSingle();

    setHistoryReports(prev => ({ ...prev, [wo.id]: rep || {} }));
  }

  async function openReport(wo) {
    setSelected(wo);
    // Pre-fill dengan data laporan lama kalau WO pernah dilaporkan sebelumnya
    const { data: existingReport } = await supabase
      .from('reports')
      .select('*')
      .eq('work_order_id', wo.id)
      .maybeSingle();

    if (existingReport) {
      // Konversi UTC dari Supabase ke format datetime-local dalam WIB (UTC+7)
      function toLocalInput(utcStr) {
        if (!utcStr) return '';
        const d = new Date(new Date(utcStr).getTime() + 7 * 60 * 60 * 1000);
        return d.toISOString().slice(0, 16);
      }
      setReport({
        waktu_mulai: toLocalInput(existingReport.waktu_mulai),
        waktu_selesai: toLocalInput(existingReport.waktu_selesai),
        keterangan: existingReport.keterangan || '',
        foto_sebelum: null,
        foto_sesudah: null,
        foto_sebelum_url_lama: existingReport.foto_sebelum_url || null,
        foto_sesudah_url_lama: existingReport.foto_sesudah_url || null,
      });
    } else {
      setReport({ waktu_mulai: '', waktu_selesai: '', keterangan: '', foto_sebelum: null, foto_sesudah: null, foto_sebelum_url_lama: null, foto_sesudah_url_lama: null });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    setSubmitting(true);

    async function compressFoto(file, maxSizeMB = 0.8) {
      return new Promise((resolve) => {
        const MAX_BYTES = maxSizeMB * 1024 * 1024;
        if (file.size <= MAX_BYTES) { resolve(file); return; }

        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const canvas = document.createElement('canvas');

          // Scale down kalau dimensi terlalu besar (max 1920px di sisi terpanjang)
          const MAX_DIM = 1920;
          let { width, height } = img;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
            else { width = Math.round(width * MAX_DIM / height); height = MAX_DIM; }
          }

          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);

          // Coba kualitas 0.7, kalau masih > maxSize turunkan ke 0.5
          canvas.toBlob((blob) => {
            if (blob && blob.size <= MAX_BYTES) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              canvas.toBlob((blob2) => {
                resolve(new File([blob2 || blob], file.name, { type: 'image/jpeg' }));
              }, 'image/jpeg', 0.5);
            }
          }, 'image/jpeg', 0.7);
        };
        img.src = url;
      });
    }

    async function uploadFoto(file, label) {
      if (!file) return null;
      const compressed = await compressFoto(file);
      const fileExt = 'jpg'; // setelah compress selalu JPEG
      const filePath = `${selected.wo_code}-${label}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('bukti-foto').upload(filePath, compressed);
      if (uploadError) throw new Error(`Gagal upload foto ${label}: ${uploadError.message}`);
      const { data: publicUrlData } = supabase.storage.from('bukti-foto').getPublicUrl(filePath);
      return publicUrlData.publicUrl;
    }

    // Pakai foto lama dari state (sudah di-load saat openReport) sebagai fallback
    let foto_sebelum_url = report.foto_sebelum_url_lama || null;
    let foto_sesudah_url = report.foto_sesudah_url_lama || null;

    try {
      if (report.foto_sebelum) foto_sebelum_url = await uploadFoto(report.foto_sebelum, 'sebelum');
      if (report.foto_sesudah) foto_sesudah_url = await uploadFoto(report.foto_sesudah, 'sesudah');
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
      setSubmitting(false);
      return;
    }

    // Konversi datetime-local input ke ISO string dengan timezone WIB (+07:00)
    // supaya Supabase menyimpannya dengan benar sebagai UTC
    function toWIBISO(localDatetimeStr) {
      if (!localDatetimeStr) return null;
      return localDatetimeStr + ':00+07:00';
    }

    const payload = {
      work_order_id: selected.id,
      waktu_mulai: toWIBISO(report.waktu_mulai),
      waktu_selesai: toWIBISO(report.waktu_selesai),
      keterangan: report.keterangan,
      dilaporkan_oleh: profile.id,
      foto_sebelum_url,
      foto_sesudah_url,
    };

    const { error: reportError } = await supabase
      .from('reports')
      .upsert(payload, { onConflict: 'work_order_id' });

    if (reportError) {
      setMsg({ type: 'error', text: reportError.message });
      setSubmitting(false);
      return;
    }

    const { error: statusError } = await supabase
      .from('work_orders')
      .update({ status_wo: 'Selesai' })
      .eq('id', selected.id);

    if (statusError) {
      setMsg({ type: 'error', text: `Laporan tersimpan, tapi gagal update status: ${statusError.message}` });
      setSubmitting(false);
      return;
    }

    setMsg({ type: 'success', text: `Laporan untuk ${selected.wo_code} berhasil dikirim.` });
    setSelected(null);
    setSubmitting(false);
    loadWorkOrders(profile.id);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  function statusBadgeClass(status) {
    if (status === 'Approved') return 'status-approved';
    if (status === 'Selesai') return 'status-selesai';
    return 'status-belum';
  }

  if (!profile) return <div className="loading">Memuat...</div>;

  return (
    <div className="app-layout">
      <Sidebar role="pelaksana" namaUser={profile.nama} />
      <div className="main-content">
        <div className="topbar">
          <h1>Halo, {profile.nama}</h1>
        </div>
        <div className="container">
      <div className="topbar">
        <h1 style={{ marginBottom: 0 }}>Halo, {profile.nama}</h1>
        <button className="secondary" onClick={handleLogout}>Keluar</button>
      </div>

      {!selected && (
        <div className="tab-group">
          <button className={tab === 'daftar' ? 'active' : ''} onClick={() => setTab('daftar')}>Daftar WO</button>
          <button className={tab === 'buat' ? 'active' : ''} onClick={() => setTab('buat')}>+ Buat WO</button>
          <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>History WO</button>
        </div>
      )}

      {msg.text && <div className={msg.type}>{msg.text}</div>}

      {!selected && tab === 'daftar' && (
        <>
          <div className="card">
            <h2>Work order kamu — perlu dilaporkan ({picWOs.filter(wo => wo.status_wo === 'Belum Selesai').length})</h2>
            {picWOs.filter(wo => wo.status_wo === 'Belum Selesai').length === 0 && (
              <p style={{ color: '#777' }}>Tidak ada work order yang perlu dilaporkan.</p>
            )}
            {picWOs.filter(wo => wo.status_wo !== 'Approved').map(wo => (
              <div key={wo.id} className="wo-item" onClick={() => wo.status_wo === 'Belum Selesai' && openReport(wo)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <b>{wo.wo_code}</b> — {wo.deskripsi}
                    {wo.sumber === 'tidak terencana' && <span className="badge medium" style={{ marginLeft: 8 }}>Tidak terencana</span>}
                    <div style={{ marginTop: 6 }}>
                      <span className={`badge ${wo.prioritas?.toLowerCase()}`}>{wo.prioritas}</span>
                      <span style={{ fontSize: 13, color: '#666', marginLeft: 8 }}>{wo.area} · {wo.tanggal_rencana}</span>
                    </div>
                  </div>
                  <span className={`status-badge ${statusBadgeClass(wo.status_wo)}`}>{wo.status_wo}</span>
                </div>
                {wo.status_wo === 'Belum Selesai' && wo.remarks && (
                  <div className="error" style={{ marginTop: 8 }}><b>Catatan admin:</b> {wo.remarks}</div>
                )}
                {wo.status_wo === 'Selesai' && (
                  <div style={{ fontSize: 13, color: '#8a5b00', marginTop: 8 }}>Menunggu verifikasi admin.</div>
                )}
              </div>
            ))}
          </div>

          {supportWOs.length > 0 && (
            <div className="card">
              <h2 style={{ color: 'var(--text-muted)' }}>Terlibat sebagai support ({supportWOs.length})</h2>
              {supportWOs.map(wo => (
                <div key={wo.id} className="wo-item support">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{wo.wo_code}</span>
                        <span style={{ fontSize: 11, background: '#FFF3E6', color: 'var(--accent)', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>SUPPORT</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: 'var(--text)' }}>{wo.deskripsi}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className={`badge ${wo.prioritas?.toLowerCase()}`}>{wo.prioritas}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{wo.area}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>·</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{wo.tanggal_rencana}</span>
                      </div>
                    </div>
                    <span className={`status-badge ${statusBadgeClass(wo.status_wo)}`}>{wo.status_wo}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    Laporan dilakukan oleh PIC utama · kamu tidak perlu lapor untuk WO ini
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!selected && tab === 'buat' && (
        <div className="card">
          <h2>Buat WO untuk kerjaan tidak terencana</h2>
          <p style={{ fontSize: 13, color: '#777', marginTop: -8 }}>Kode WO dibuat otomatis. WO ini akan langsung tercatat sebagai milikmu.</p>
          <form onSubmit={handleCreateWO}>
            <label>Area</label>
            <select value={newWO.area} onChange={(e) => setNewWO({ ...newWO, area: e.target.value })} required>
              <option value="">Pilih area</option>
              {areas.map(a => <option key={a.id} value={a.nama}>{a.nama}</option>)}
            </select>

            <label>Mesin / instrument</label>
            <select value={newWO.mesin_instrument} onChange={(e) => setNewWO({ ...newWO, mesin_instrument: e.target.value })}>
              <option value="">Pilih mesin/instrumen</option>
              {instrumens.map(i => <option key={i.id} value={i.nama}>{i.nama}</option>)}
            </select>

            <label>Deskripsi pekerjaan</label>
            <textarea value={newWO.deskripsi} onChange={(e) => setNewWO({ ...newWO, deskripsi: e.target.value })} required />

            <label>Kategori</label>
            <select value={newWO.kategori} onChange={(e) => setNewWO({ ...newWO, kategori: e.target.value })} required>
              <option value="">Pilih kategori</option>
              {kategoris.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
            </select>

            <label>Prioritas</label>
            <select value={newWO.prioritas} onChange={(e) => setNewWO({ ...newWO, prioritas: e.target.value })}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>

            <button type="submit">Buat WO</button>
          </form>
        </div>
      )}

      {!selected && tab === 'history' && (
        <div className="card">
          <h2>History Work Order Tim</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: -8 }}>
            Pilih rentang tanggal untuk melihat riwayat WO seluruh tim.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label>Dari</label>
              <input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label>Sampai</label>
              <input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={loadHistory} disabled={historyLoading || (!historyFrom && !historyTo)}>
                {historyLoading ? 'Memuat...' : 'Tampilkan'}
              </button>
            </div>
          </div>

          {!historyFrom && !historyTo && (
            <p style={{ color: 'var(--text-light)', fontSize: 13, marginTop: 16 }}>Pilih filter tanggal terlebih dahulu.</p>
          )}

          {(historyFrom || historyTo) && historyWOs.length === 0 && !historyLoading && (
            <p style={{ color: 'var(--text-light)', fontSize: 13, marginTop: 16 }}>Tidak ada WO pada rentang tanggal ini.</p>
          )}

          {historyWOs.map(wo => (
            <div key={wo.id} className="wo-item" style={{ marginTop: 10, cursor: 'pointer' }}
              onClick={() => handleExpandHistory(wo)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, paddingRight: 8 }}>
                  <b>{wo.wo_code}</b> — {wo.deskripsi}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {wo.area} · {wo.mesin_instrument || '-'} · PIC: {wo.users?.nama || '-'} · {wo.tanggal_rencana}
                  </div>
                </div>
                <span className={`status-badge status-${wo.status_wo === 'Belum Selesai' ? 'belum' : wo.status_wo === 'Selesai' ? 'selesai' : 'approved'}`}>
                  {wo.status_wo}
                </span>
              </div>

              {selectedHistory?.id === wo.id && wo.status_wo !== 'Belum Selesai' && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  {historyReports[wo.id] === undefined ? (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Memuat detail...</p>
                  ) : (
                    <>
                      {historyReports[wo.id]?.keterangan && (
                        <div className="readonly-field">
                          <b>Keterangan pelaksana</b>
                          {historyReports[wo.id].keterangan}
                        </div>
                      )}
                      {(historyReports[wo.id]?.foto_sebelum_url || historyReports[wo.id]?.foto_sesudah_url) && (
                        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                          {historyReports[wo.id]?.foto_sebelum_url && (
                            <div>
                              <b style={{ fontSize: 11, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>Sebelum</b>
                              <img src={historyReports[wo.id].foto_sebelum_url} alt="Sebelum"
                                style={{ width: 130, borderRadius: 8, border: '1px solid var(--border)' }} />
                            </div>
                          )}
                          {historyReports[wo.id]?.foto_sesudah_url && (
                            <div>
                              <b style={{ fontSize: 11, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>Sesudah</b>
                              <img src={historyReports[wo.id].foto_sesudah_url} alt="Sesudah"
                                style={{ width: 130, borderRadius: 8, border: '1px solid var(--border)' }} />
                            </div>
                          )}
                        </div>
                      )}
                      {!historyReports[wo.id]?.keterangan && !historyReports[wo.id]?.foto_sebelum_url && !historyReports[wo.id]?.foto_sesudah_url && (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tidak ada keterangan atau foto.</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="card">
          <h2>Lapor: {selected.wo_code}</h2>
          {selected.remarks && (
            <div className="error"><b>Catatan admin (perlu direvisi):</b> {selected.remarks}</div>
          )}
          <div className="readonly-field"><b>Deskripsi pekerjaan</b>{selected.deskripsi}</div>
          <div className="readonly-field"><b>Area</b>{selected.area || '-'}</div>
          <div className="readonly-field"><b>Mesin / instrument</b>{selected.mesin_instrument || '-'}</div>
          <div className="readonly-field"><b>Target penyelesaian</b>{selected.tanggal_rencana}</div>
          <div className="readonly-field"><b>Kategori</b>{selected.kategori || '-'}</div>
          <div className="readonly-field"><b>Target durasi</b>{selected.target_durasi_jam ? `${selected.target_durasi_jam} jam` : '-'}</div>

          <form onSubmit={handleSubmit}>
            <label>Waktu mulai</label>
            <input type="datetime-local" value={report.waktu_mulai} onChange={(e) => setReport({ ...report, waktu_mulai: e.target.value })} />

            <label>Waktu selesai</label>
            <input type="datetime-local" value={report.waktu_selesai} onChange={(e) => setReport({ ...report, waktu_selesai: e.target.value })} />

            <label>Keterangan</label>
            <textarea value={report.keterangan} onChange={(e) => setReport({ ...report, keterangan: e.target.value })} placeholder="Kondisi pekerjaan, kendala, dsb" />

            <label>Foto sebelum pengerjaan</label>
            {report.foto_sebelum_url_lama && !report.foto_sebelum && (
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Foto lama tersimpan:</span>
                <img src={report.foto_sebelum_url_lama} alt="Sebelum lama" style={{ display: 'block', width: 120, borderRadius: 6, marginTop: 4 }} />
                <span style={{ fontSize: 11, color: 'var(--text-light)' }}>Upload baru untuk mengganti, atau biarkan untuk pakai foto ini.</span>
              </div>
            )}
            <input type="file" accept="image/*" onChange={(e) => setReport({ ...report, foto_sebelum: e.target.files[0] })} />

            <label>Foto sesudah pengerjaan</label>
            {report.foto_sesudah_url_lama && !report.foto_sesudah && (
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Foto lama tersimpan:</span>
                <img src={report.foto_sesudah_url_lama} alt="Sesudah lama" style={{ display: 'block', width: 120, borderRadius: 6, marginTop: 4 }} />
                <span style={{ fontSize: 11, color: 'var(--text-light)' }}>Upload baru untuk mengganti, atau biarkan untuk pakai foto ini.</span>
              </div>
            )}
            <input type="file" accept="image/*" onChange={(e) => setReport({ ...report, foto_sesudah: e.target.files[0] })} />

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={submitting}>{submitting ? 'Mengirim...' : 'Kirim laporan'}</button>
              <button type="button" className="secondary" onClick={() => setSelected(null)}>Batal</button>
            </div>
          </form>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
