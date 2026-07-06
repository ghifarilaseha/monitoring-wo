'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

const ROLE_DEFS = [
  { key: 'operator_boiler_id', tugasKey: 'operator_boiler_tugas', label: 'Operator Boiler', tugas: 'Back-up operasional boiler & PWT' },
  { key: 'operator_ws_id', tugasKey: 'operator_ws_tugas', label: 'Operator WS', tugas: 'Back-up operasional WS, CAOF dan PSG NBL' },
  { key: 'teknisi_id', tugasKey: 'teknisi_tugas', label: 'Teknisi', tugas: 'Back up Mobile dan operasional gas, sumur & PSG Cepha' },
  { key: 'kepala_regu_id', tugasKey: 'kepala_regu_tugas', label: 'Kepala Regu', tugas: 'Kepala Regu' },
];

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatTanggal(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const hari = d.toLocaleDateString('id-ID', { weekday: 'long' });
  const dd = String(d.getDate()).padStart(2, '0');
  const mmm = BULAN[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${hari}, ${dd}-${mmm}-${yyyy}`;
}

export default function WaMessagePage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    shift: 'Shift 1',
    operator_boiler_id: '',
    operator_boiler_tugas: '',
    operator_ws_id: '',
    operator_ws_tugas: '',
    teknisi_id: '',
    teknisi_tugas: '',
    kepala_regu_id: '',
    kepala_regu_tugas: '',
    catatan: '',
    keterangan_nbl: '',
    keterangan_cepha: '',
    link_upload: 'https://monitoring-wo.vercel.app/',
  });

  const [pesan, setPesan] = useState('');

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/'); return; }
    const { data: profile } = await supabase.from('users').select('role').eq('auth_id', user.id).single();
    if (!profile || profile.role !== 'admin') { router.push('/lapor'); return; }

    const { data: userData } = await supabase.from('users').select('*').eq('role', 'pelaksana').order('nama');
    setUsers(userData || []);

    loadRiwayat();
  }

  async function loadRiwayat() {
    const { data } = await supabase.from('data_harian').select('*').order('created_at', { ascending: false }).limit(10);
    setRiwayat(data || []);
  }

  function namaUser(id) {
    return users.find(u => u.id === id)?.nama || '';
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    const rolesTerisi = ROLE_DEFS.filter(r => form[r.key]);

    if (rolesTerisi.length === 0) {
      setMsg({ type: 'error', text: 'Isi minimal satu peran (personil).' });
      return;
    }

    // Ambil semua WO pada tanggal ini untuk orang-orang yang dipilih
    const picIds = rolesTerisi.map(r => form[r.key]);
    const { data: woList } = await supabase
      .from('work_orders')
      .select('wo_code, deskripsi, pic_id')
      .eq('tanggal_rencana', form.tanggal)
      .in('pic_id', picIds);

    const woPerOrang = {};
    (woList || []).forEach(wo => {
      if (!woPerOrang[wo.pic_id]) woPerOrang[wo.pic_id] = [];
      woPerOrang[wo.pic_id].push(`[${wo.wo_code}] ${wo.deskripsi}`);
    });

    let text = `Tim Utility\n${formatTanggal(form.tanggal)} ${form.shift}\n\n`;
    text += `Personil\n`;
    rolesTerisi.forEach((r, i) => {
      text += `${i + 1}. Pak ${namaUser(form[r.key])} (${r.tugas})\n`;
    });
    if (form.catatan.trim()) {
      text += `${form.catatan.trim()}\n`;
    }

    text += `\nPekerjaan hari ini\n`;
    rolesTerisi.forEach((r) => {
      const picId = form[r.key];
      text += `\nPak ${namaUser(picId)}\n`;
      const tugasManual = form[r.tugasKey]?.trim();
      const woNya = woPerOrang[picId] || [];

      const daftarPekerjaan = [];
      if (tugasManual) daftarPekerjaan.push(tugasManual);
      daftarPekerjaan.push(...woNya);
      if (daftarPekerjaan.length === 0) daftarPekerjaan.push('Tidak ada WO terjadwal hari ini');

      daftarPekerjaan.forEach((line, i) => {
        text += `${i + 1}. ${line}\n`;
      });
    });

    if (form.keterangan_nbl.trim()) text += `\nNBL: ${form.keterangan_nbl.trim()}`;
    if (form.keterangan_cepha.trim()) text += `\nCepha: ${form.keterangan_cepha.trim()}`;

    text += `\n\nUpload hasil pekerjaan pada:\n${form.link_upload}`;

    setPesan(text);

    const { error } = await supabase.from('data_harian').insert({
      tanggal: form.tanggal,
      shift: form.shift,
      operator_boiler_id: form.operator_boiler_id || null,
      operator_ws_id: form.operator_ws_id || null,
      teknisi_id: form.teknisi_id || null,
      kepala_regu_id: form.kepala_regu_id || null,
      catatan: form.catatan,
      keterangan_nbl: form.keterangan_nbl,
      keterangan_cepha: form.keterangan_cepha,
      pesan_teks: text,
    });

    if (error) {
      setMsg({ type: 'error', text: `Pesan dibuat, tapi gagal disimpan ke riwayat: ${error.message}` });
    } else {
      setMsg({ type: 'success', text: 'Pesan berhasil dibuat dan disimpan ke riwayat.' });
      loadRiwayat();
    }
  }

  function handleCopy(text) {
    navigator.clipboard.writeText(text);
    setMsg({ type: 'success', text: 'Pesan disalin ke clipboard.' });
  }

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="topbar">
        <h1 style={{ marginBottom: 0 }}>Pesan WhatsApp harian</h1>
        <a href="/admin">Kembali ke admin</a>
      </div>

      {msg.text && <div className={msg.type}>{msg.text}</div>}

      <div className="card">
        <h2>Buat pesan</h2>
        <form onSubmit={handleGenerate}>
          <label>Tanggal</label>
          <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required />

          <label>Shift</label>
          <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>
            <option value="Shift 1">Shift 1</option>
            <option value="Shift 2">Shift 2</option>
            <option value="Shift 3">Shift 3</option>
          </select>

          {ROLE_DEFS.map(r => (
            <div key={r.key}>
              <label>{r.label}</label>
              <select value={form[r.key]} onChange={(e) => setForm({ ...form, [r.key]: e.target.value })}>
                <option value="">— Kosongkan —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
              </select>
              <label style={{ fontWeight: 400, fontSize: 13 }}>Tugas hari ini (poin 1) — {r.label}</label>
              <input value={form[r.tugasKey]} onChange={(e) => setForm({ ...form, [r.tugasKey]: e.target.value })} placeholder={r.tugas} />
            </div>
          ))}

          <label>Catatan (opsional)</label>
          <textarea value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} placeholder="misal: Pak Abdullah cuti" />

          <label>Keterangan NBL</label>
          <input value={form.keterangan_nbl} onChange={(e) => setForm({ ...form, keterangan_nbl: e.target.value })} />

          <label>Keterangan Cepha</label>
          <input value={form.keterangan_cepha} onChange={(e) => setForm({ ...form, keterangan_cepha: e.target.value })} />

          <label>Link upload hasil pekerjaan</label>
          <input value={form.link_upload} onChange={(e) => setForm({ ...form, link_upload: e.target.value })} />

          <button type="submit">Generate pesan</button>
        </form>
      </div>

      {pesan && (
        <div className="card">
          <h2>Hasil pesan</h2>
          <textarea readOnly value={pesan} style={{ minHeight: 320, fontFamily: 'monospace', fontSize: 13 }} />
          <button onClick={() => handleCopy(pesan)}>Salin ke clipboard</button>
        </div>
      )}

      {riwayat.length > 0 && (
        <div className="card">
          <h2>Riwayat pesan terakhir</h2>
          {riwayat.map(r => (
            <div key={r.id} className="wo-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b>{r.tanggal}</b> — {r.shift}
              </div>
              <button className="secondary" style={{ marginTop: 0 }} onClick={() => handleCopy(r.pesan_teks)}>Salin</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
