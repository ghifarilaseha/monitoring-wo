'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, usernameToEmail } from '../../lib/supabase';

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [tab, setTab] = useState('wo'); // 'wo' | 'pelaksana'
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [form, setForm] = useState({
    wo_code: '',
    tanggal_rencana: '',
    minggu: '',
    area: '',
    mesin_instrument: '',
    deskripsi: '',
    kategori: '',
    prioritas: 'Low',
    pic_id: '',
  });

  const [newUser, setNewUser] = useState({ nama: '', username: '', password: '', role: 'pelaksana' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: userData } = await supabase.from('users').select('*').order('nama');
    setUsers(userData || []);

    const { data: woData } = await supabase
      .from('work_orders')
      .select('*, users(nama)')
      .order('created_at', { ascending: false });
    setWorkOrders(woData || []);
  }

  async function handleCreateWO(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    const { error } = await supabase.from('work_orders').insert({
      wo_code: form.wo_code,
      tanggal_rencana: form.tanggal_rencana,
      minggu: form.minggu ? parseInt(form.minggu) : null,
      area: form.area,
      mesin_instrument: form.mesin_instrument,
      deskripsi: form.deskripsi,
      kategori: form.kategori,
      prioritas: form.prioritas,
      pic_id: form.pic_id,
    });

    if (error) {
      setMsg({ type: 'error', text: error.message });
      return;
    }

    setMsg({ type: 'success', text: `WO ${form.wo_code} berhasil dibuat.` });
    setForm({
      wo_code: '', tanggal_rencana: '', minggu: '', area: '',
      mesin_instrument: '', deskripsi: '', kategori: '', prioritas: 'Low', pic_id: '',
    });
    loadData();
  }

  async function handleAddUser(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    const email = usernameToEmail(newUser.username);

    // Catatan: signUp di sini dilakukan dari sisi client dengan anon key.
    // Untuk penggunaan produksi jangka panjang, sebaiknya proses pembuatan
    // user dipindah ke server-side (API route) memakai service_role key.
    const { data, error } = await supabase.auth.signUp({
      email,
      password: newUser.password,
    });

    if (error) {
      setMsg({ type: 'error', text: error.message });
      return;
    }

    const { error: insertError } = await supabase.from('users').insert({
      nama: newUser.nama,
      role: newUser.role,
      auth_id: data.user.id,
    });

    if (insertError) {
      setMsg({ type: 'error', text: insertError.message });
      return;
    }

    setMsg({ type: 'success', text: `Akun untuk ${newUser.nama} berhasil dibuat.` });
    setNewUser({ nama: '', username: '', password: '', role: 'pelaksana' });
    loadData();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <div className="container">
      <div className="topbar">
        <h1 style={{ marginBottom: 0 }}>Admin</h1>
        <button className="secondary" onClick={handleLogout}>Keluar</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={tab === 'wo' ? '' : 'secondary'} onClick={() => setTab('wo')}>Work order</button>
        <button className={tab === 'pelaksana' ? '' : 'secondary'} onClick={() => setTab('pelaksana')}>Tambah pelaksana</button>
      </div>

      {msg.text && <div className={msg.type}>{msg.text}</div>}

      {tab === 'wo' && (
        <>
          <div className="card">
            <h2>Buat work order baru</h2>
            <form onSubmit={handleCreateWO}>
              <label>Kode WO</label>
              <input value={form.wo_code} onChange={(e) => setForm({ ...form, wo_code: e.target.value })} placeholder="UTL26-07-12" required />

              <label>Tanggal rencana</label>
              <input type="date" value={form.tanggal_rencana} onChange={(e) => setForm({ ...form, tanggal_rencana: e.target.value })} required />

              <label>Minggu ke-</label>
              <input type="number" value={form.minggu} onChange={(e) => setForm({ ...form, minggu: e.target.value })} />

              <label>Area</label>
              <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />

              <label>Mesin / instrument / alat</label>
              <input value={form.mesin_instrument} onChange={(e) => setForm({ ...form, mesin_instrument: e.target.value })} />

              <label>Deskripsi pekerjaan</label>
              <textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} required />

              <label>Kategori</label>
              <input value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} placeholder="PM / Perbaikan / Cleaning / dst" />

              <label>Prioritas</label>
              <select value={form.prioritas} onChange={(e) => setForm({ ...form, prioritas: e.target.value })}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>

              <label>PIC</label>
              <select value={form.pic_id} onChange={(e) => setForm({ ...form, pic_id: e.target.value })} required>
                <option value="">Pilih PIC</option>
                {users.filter(u => u.role === 'pelaksana').map(u => (
                  <option key={u.id} value={u.id}>{u.nama}</option>
                ))}
              </select>

              <button type="submit">Simpan work order</button>
            </form>
          </div>

          <div className="card">
            <h2>Daftar work order ({workOrders.length})</h2>
            {workOrders.map(wo => (
              <div key={wo.id} className="wo-item">
                <b>{wo.wo_code}</b> — {wo.deskripsi}
                <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                  {wo.area} · PIC: {wo.users?.nama || '-'} · {wo.status_wo}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'pelaksana' && (
        <div className="card">
          <h2>Tambah akun pelaksana</h2>
          <form onSubmit={handleAddUser}>
            <label>Nama lengkap</label>
            <input value={newUser.nama} onChange={(e) => setNewUser({ ...newUser, nama: e.target.value })} required />

            <label>Username (untuk login)</label>
            <input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} placeholder="misal: anwar" required />

            <label>Password</label>
            <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} />

            <label>Role</label>
            <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
              <option value="pelaksana">Pelaksana</option>
              <option value="admin">Admin</option>
            </select>

            <button type="submit">Buat akun</button>
          </form>
        </div>
      )}
    </div>
  );
}
