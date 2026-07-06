'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

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

  const [report, setReport] = useState({ waktu_mulai: '', waktu_selesai: '', keterangan: '', foto_sebelum: null, foto_sesudah: null });
  const [newWO, setNewWO] = useState({ area: '', mesin_instrument: '', deskripsi: '', kategori: '', prioritas: 'Medium' });

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/'); return; }

    const { data: userProfile } = await supabase.from('users').select('*').eq('auth_id', user.id).single();
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

  function openReport(wo) {
    setSelected(wo);
    setReport({ waktu_mulai: '', waktu_selesai: '', keterangan: '', foto_sebelum: null, foto_sesudah: null });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    setSubmitting(true);

    async function uploadFoto(file, label) {
      if (!file) return null;
      const fileExt = file.name.split('.').pop();
      const filePath = `${selected.wo_code}-${label}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('bukti-foto').upload(filePath, file);
      if (uploadError) throw new Error(`Gagal upload foto ${label}: ${uploadError.message}`);
      const { data: publicUrlData } = supabase.storage.from('bukti-foto').getPublicUrl(filePath);
      return publicUrlData.publicUrl;
    }

    const { data: existingReport } = await supabase
      .from('reports')
      .select('foto_sebelum_url, foto_sesudah_url')
      .eq('work_order_id', selected.id)
      .maybeSingle();

    let foto_sebelum_url = existingReport?.foto_sebelum_url || null;
    let foto_sesudah_url = existingReport?.foto_sesudah_url || null;

    try {
      if (report.foto_sebelum) foto_sebelum_url = await uploadFoto(report.foto_sebelum, 'sebelum');
      if (report.foto_sesudah) foto_sesudah_url = await uploadFoto(report.foto_sesudah, 'sesudah');
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
      setSubmitting(false);
      return;
    }

    const payload = {
      work_order_id: selected.id,
      waktu_mulai: report.waktu_mulai || null,
      waktu_selesai: report.waktu_selesai || null,
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

  if (!profile) return <div className="container">Memuat...</div>;

  return (
    <div className="container">
      <div className="topbar">
        <h1 style={{ marginBottom: 0 }}>Halo, {profile.nama}</h1>
        <button className="secondary" onClick={handleLogout}>Keluar</button>
      </div>

      {!selected && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={tab === 'daftar' ? '' : 'secondary'} onClick={() => setTab('daftar')}>Daftar WO</button>
          <button className={tab === 'buat' ? '' : 'secondary'} onClick={() => setTab('buat')}>+ Buat WO (tidak terencana)</button>
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
              <h2>WO yang kamu terlibat sebagai support ({supportWOs.length})</h2>
              {supportWOs.map(wo => (
                <div key={wo.id} className="wo-item" style={{ opacity: 0.8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <b>{wo.wo_code}</b> — {wo.deskripsi}
                      <span className="badge medium" style={{ marginLeft: 8 }}>Support</span>
                      <div style={{ marginTop: 6 }}>
                        <span className={`badge ${wo.prioritas?.toLowerCase()}`}>{wo.prioritas}</span>
                        <span style={{ fontSize: 13, color: '#666', marginLeft: 8 }}>{wo.area} · {wo.tanggal_rencana}</span>
                      </div>
                    </div>
                    <span className={`status-badge ${statusBadgeClass(wo.status_wo)}`}>{wo.status_wo}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#777', marginTop: 6 }}>Laporan dikerjakan oleh PIC utama WO ini.</div>
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
            <input type="file" accept="image/*" onChange={(e) => setReport({ ...report, foto_sebelum: e.target.files[0] })} />

            <label>Foto sesudah pengerjaan</label>
            <input type="file" accept="image/*" onChange={(e) => setReport({ ...report, foto_sesudah: e.target.files[0] })} />

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={submitting}>{submitting ? 'Mengirim...' : 'Kirim laporan'}</button>
              <button type="button" className="secondary" onClick={() => setSelected(null)}>Batal</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
