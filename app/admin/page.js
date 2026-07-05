'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { supabase, usernameToEmail } from '../../lib/supabase';

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [areas, setAreas] = useState([]);
  const [instrumens, setInstrumens] = useState([]);
  const [kategoris, setKategoris] = useState([]);
  const [tab, setTab] = useState('wo');
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [form, setForm] = useState({
    tanggal_rencana: '',
    area: '',
    mesin_instrument: '',
    deskripsi: '',
    kategori: '',
    prioritas: 'Low',
    pic_id: '',
    target_durasi_jam: '',
  });

  const [newUser, setNewUser] = useState({ nama: '', username: '', password: '', role: 'pelaksana' });
  const [newArea, setNewArea] = useState('');
  const [newInstrumen, setNewInstrumen] = useState('');
  const [newKategori, setNewKategori] = useState('');

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

    const { data: areaData } = await supabase.from('master_area').select('*').order('nama');
    setAreas(areaData || []);

    const { data: instrumenData } = await supabase.from('master_instrumen').select('*').order('nama');
    setInstrumens(instrumenData || []);

    const { data: kategoriData } = await supabase.from('master_kategori').select('*').order('nama');
    setKategoris(kategoriData || []);
  }

  async function handleCreateWO(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    const { data, error } = await supabase.from('work_orders').insert({
      tanggal_rencana: form.tanggal_rencana,
      area: form.area,
      mesin_instrument: form.mesin_instrument,
      deskripsi: form.deskripsi,
      kategori: form.kategori,
      prioritas: form.prioritas,
      pic_id: form.pic_id,
      target_durasi_jam: form.target_durasi_jam ? parseFloat(form.target_durasi_jam) : null,
      sumber: 'terencana',
    }).select().single();

    if (error) {
      setMsg({ type: 'error', text: error.message });
      return;
    }

    setMsg({ type: 'success', text: `WO ${data.wo_code} berhasil dibuat.` });
    setForm({
      tanggal_rencana: '', area: '', mesin_instrument: '', deskripsi: '',
      kategori: '', prioritas: 'Low', pic_id: '', target_durasi_jam: '',
    });
    loadData();
  }

  async function handleAddUser(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    const email = usernameToEmail(newUser.username);
    const { data, error } = await supabase.auth.signUp({ email, password: newUser.password });

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

  async function handleAddMaster(table, value, resetFn) {
    if (!value.trim()) return;
    const { error } = await supabase.from(table).insert({ nama: value.trim() });
    if (error) { setMsg({ type: 'error', text: error.message }); return; }
    resetFn('');
    loadData();
  }

  async function handleDeleteMaster(table, id) {
    await supabase.from(table).delete().eq('id', id);
    loadData();
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

  const filteredWO = workOrders.filter(wo => {
    if (search && !wo.deskripsi?.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFrom && wo.tanggal_rencana < dateFrom) return false;
    if (dateTo && wo.tanggal_rencana > dateTo) return false;
    return true;
  });

  function handleExport() {
    const rows = filteredWO.map(wo => ({
      'Kode WO': wo.wo_code,
      'Tanggal Rencana': wo.tanggal_rencana,
      'Area': wo.area,
      'Mesin/Instrumen': wo.mesin_instrument,
      'Deskripsi': wo.deskripsi,
      'Kategori': wo.kategori,
      'Prioritas': wo.prioritas,
      'PIC': wo.users?.nama || '',
      'Target Durasi (jam)': wo.target_durasi_jam,
      'Status': wo.status_wo,
      'Sumber': wo.sumber,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Work Orders');
    XLSX.writeFile(wb, `data-wo-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="container">
      <div className="topbar">
        <h1 style={{ marginBottom: 0 }}>Admin</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="/dashboard">Dashboard</a>
          <button className="secondary" onClick={handleLogout}>Keluar</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={tab === 'wo' ? '' : 'secondary'} onClick={() => setTab('wo')}>Work order</button>
        <button className={tab === 'pelaksana' ? '' : 'secondary'} onClick={() => setTab('pelaksana')}>Tambah pelaksana</button>
        <button className={tab === 'master' ? '' : 'secondary'} onClick={() => setTab('master')}>Master data</button>
      </div>

      {msg.text && <div className={msg.type}>{msg.text}</div>}

      {tab === 'wo' && (
        <>
          <div className="card">
            <h2>Buat work order baru</h2>
            <p style={{ fontSize: 13, color: '#777', marginTop: -8 }}>Kode WO akan dibuat otomatis (format UT26-07-01).</p>
            <form onSubmit={handleCreateWO}>
              <label>Tanggal rencana</label>
              <input type="date" value={form.tanggal_rencana} onChange={(e) => setForm({ ...form, tanggal_rencana: e.target.value })} required />

              <label>Area</label>
              <select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} required>
                <option value="">Pilih area</option>
                {areas.map(a => <option key={a.id} value={a.nama}>{a.nama}</option>)}
              </select>

              <label>Mesin / instrument / alat</label>
              <select value={form.mesin_instrument} onChange={(e) => setForm({ ...form, mesin_instrument: e.target.value })}>
                <option value="">Pilih mesin/instrumen</option>
                {instrumens.map(i => <option key={i.id} value={i.nama}>{i.nama}</option>)}
              </select>

              <label>Deskripsi pekerjaan</label>
              <textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} required />

              <label>Kategori</label>
              <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} required>
                <option value="">Pilih kategori</option>
                {kategoris.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
              </select>

              <label>Target durasi pekerjaan (jam)</label>
              <input type="number" step="0.5" min="0" value={form.target_durasi_jam} onChange={(e) => setForm({ ...form, target_durasi_jam: e.target.value })} placeholder="misal: 2" />

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ marginBottom: 0 }}>Daftar work order ({filteredWO.length})</h2>
              <button className="secondary" style={{ marginTop: 0 }} onClick={handleExport}>Export ke Excel</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 4, flexWrap: 'wrap' }}>
              <input style={{ flex: 2, minWidth: 160 }} placeholder="Cari deskripsi pekerjaan..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <input style={{ flex: 1, minWidth: 130 }} type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <input style={{ flex: 1, minWidth: 130 }} type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            <div style={{ marginTop: 12 }}>
              {filteredWO.map(wo => (
                <div key={wo.id} className="wo-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => router.push(`/admin/wo/${wo.id}`)}>
                  <div>
                    <b>{wo.wo_code}</b> — {wo.deskripsi}
                    {wo.sumber === 'tidak terencana' && <span className="badge medium" style={{ marginLeft: 8 }}>Tidak terencana</span>}
                    <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                      {wo.area} · PIC: {wo.users?.nama || '-'}
                    </div>
                  </div>
                  <span className={`status-badge ${statusBadgeClass(wo.status_wo)}`}>{wo.status_wo}</span>
                </div>
              ))}
            </div>
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

      {tab === 'master' && (
        <>
          <div className="card">
            <h2>Master data area</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label>Nama area baru</label>
                <input value={newArea} onChange={(e) => setNewArea(e.target.value)} />
              </div>
              <button onClick={() => handleAddMaster('master_area', newArea, setNewArea)}>Tambah</button>
            </div>
            <div style={{ marginTop: 12 }}>
              {areas.map(a => (
                <div key={a.id} className="wo-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {a.nama}
                  <button className="secondary" style={{ marginTop: 0 }} onClick={() => handleDeleteMaster('master_area', a.id)}>Hapus</button>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Master data mesin/instrumen</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label>Nama mesin/instrumen baru</label>
                <input value={newInstrumen} onChange={(e) => setNewInstrumen(e.target.value)} />
              </div>
              <button onClick={() => handleAddMaster('master_instrumen', newInstrumen, setNewInstrumen)}>Tambah</button>
            </div>
            <div style={{ marginTop: 12 }}>
              {instrumens.map(i => (
                <div key={i.id} className="wo-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {i.nama}
                  <button className="secondary" style={{ marginTop: 0 }} onClick={() => handleDeleteMaster('master_instrumen', i.id)}>Hapus</button>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Master data kategori</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label>Nama kategori baru</label>
                <input value={newKategori} onChange={(e) => setNewKategori(e.target.value)} />
              </div>
              <button onClick={() => handleAddMaster('master_kategori', newKategori, setNewKategori)}>Tambah</button>
            </div>
            <div style={{ marginTop: 12 }}>
              {kategoris.map(k => (
                <div key={k.id} className="wo-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {k.nama}
                  <button className="secondary" style={{ marginTop: 0 }} onClick={() => handleDeleteMaster('master_kategori', k.id)}>Hapus</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
