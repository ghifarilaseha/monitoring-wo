'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function LaporPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  const [report, setReport] = useState({
    waktu_mulai: '',
    waktu_selesai: '',
    keterangan: '',
    foto: null,
  });

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .single();

    setProfile(userProfile);
    loadWorkOrders(userProfile.id);
  }

  async function loadWorkOrders(picId) {
    const { data } = await supabase
      .from('work_orders')
      .select('*')
      .eq('pic_id', picId)
      .eq('status_wo', 'Belum Dilaporkan')
      .order('tanggal_rencana');
    setWorkOrders(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    setSubmitting(true);

    let foto_url = null;

    if (report.foto) {
      const fileExt = report.foto.name.split('.').pop();
      const filePath = `${selected.wo_code}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('bukti-foto')
        .upload(filePath, report.foto);

      if (uploadError) {
        setMsg({ type: 'error', text: `Gagal upload foto: ${uploadError.message}` });
        setSubmitting(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('bukti-foto').getPublicUrl(filePath);
      foto_url = publicUrlData.publicUrl;
    }

    const { error: reportError } = await supabase.from('reports').insert({
      work_order_id: selected.id,
      waktu_mulai: report.waktu_mulai || null,
      waktu_selesai: report.waktu_selesai || null,
      keterangan: report.keterangan,
      foto_url,
      dilaporkan_oleh: profile.id,
    });

    if (reportError) {
      setMsg({ type: 'error', text: reportError.message });
      setSubmitting(false);
      return;
    }

    await supabase
      .from('work_orders')
      .update({ status_wo: 'Selesai' })
      .eq('id', selected.id);

    setMsg({ type: 'success', text: `Laporan untuk ${selected.wo_code} berhasil dikirim.` });
    setSelected(null);
    setReport({ waktu_mulai: '', waktu_selesai: '', keterangan: '', foto: null });
    setSubmitting(false);
    loadWorkOrders(profile.id);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (!profile) return <div className="container">Memuat...</div>;

  return (
    <div className="container">
      <div className="topbar">
        <h1 style={{ marginBottom: 0 }}>Halo, {profile.nama}</h1>
        <button className="secondary" onClick={handleLogout}>Keluar</button>
      </div>

      {msg.text && <div className={msg.type}>{msg.text}</div>}

      {!selected && (
        <div className="card">
          <h2>Work order kamu ({workOrders.length})</h2>
          {workOrders.length === 0 && <p style={{ color: '#777' }}>Tidak ada work order yang perlu dilaporkan.</p>}
          {workOrders.map(wo => (
            <div key={wo.id} className="wo-item" onClick={() => setSelected(wo)}>
              <b>{wo.wo_code}</b> — {wo.deskripsi}
              <div style={{ marginTop: 6 }}>
                <span className={`badge ${wo.prioritas?.toLowerCase()}`}>{wo.prioritas}</span>
                <span style={{ fontSize: 13, color: '#666', marginLeft: 8 }}>{wo.area} · {wo.tanggal_rencana}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="card">
          <h2>Lapor: {selected.wo_code}</h2>

          <div className="readonly-field"><b>Deskripsi pekerjaan</b>{selected.deskripsi}</div>
          <div className="readonly-field"><b>Area</b>{selected.area || '-'}</div>
          <div className="readonly-field"><b>Mesin / instrument</b>{selected.mesin_instrument || '-'}</div>
          <div className="readonly-field"><b>Target penyelesaian</b>{selected.tanggal_rencana}</div>
          <div className="readonly-field"><b>Kategori</b>{selected.kategori || '-'}</div>

          <form onSubmit={handleSubmit}>
            <label>Waktu mulai</label>
            <input type="datetime-local" value={report.waktu_mulai} onChange={(e) => setReport({ ...report, waktu_mulai: e.target.value })} />

            <label>Waktu selesai</label>
            <input type="datetime-local" value={report.waktu_selesai} onChange={(e) => setReport({ ...report, waktu_selesai: e.target.value })} />

            <label>Keterangan</label>
            <textarea value={report.keterangan} onChange={(e) => setReport({ ...report, keterangan: e.target.value })} placeholder="Kondisi pekerjaan, kendala, dsb" />

            <label>Bukti dokumentasi (foto)</label>
            <input type="file" accept="image/*" onChange={(e) => setReport({ ...report, foto: e.target.files[0] })} />

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
