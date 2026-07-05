'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { supabase } from '../../lib/supabase';

const COLORS = ['#2952e3', '#e38b29', '#e34141', '#29a36b', '#8a5be3', '#e3297f', '#1e9be3'];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedKategori, setSelectedKategori] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/'); return; }

    const { data: profile } = await supabase.from('users').select('role').eq('auth_id', user.id).single();
    if (!profile || profile.role !== 'admin') { router.push('/lapor'); return; }

    const { data } = await supabase.from('work_orders').select('*');
    setWorkOrders(data || []);
    setLoading(false);
  }

  if (loading) return <div className="container">Memuat...</div>;

  // Chart 1: perbandingan status WO
  const statusMap = {};
  workOrders.forEach(wo => { statusMap[wo.status_wo] = (statusMap[wo.status_wo] || 0) + 1; });
  const statusData = Object.keys(statusMap).map(k => ({ name: k, value: statusMap[k] }));

  // Chart 2: kategori (hanya WO Approved)
  const approvedWO = workOrders.filter(wo => wo.status_wo === 'Approved');
  const kategoriMap = {};
  approvedWO.forEach(wo => {
    const k = wo.kategori || 'Lainnya';
    kategoriMap[k] = (kategoriMap[k] || 0) + 1;
  });
  const kategoriData = Object.keys(kategoriMap).map(k => ({ name: k, value: kategoriMap[k] }));

  // Drill-down: breakdown mesin/instrumen untuk kategori yang dipilih
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

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <div className="topbar">
        <h1 style={{ marginBottom: 0 }}>Dashboard monitoring</h1>
        <a href="/admin">Kembali ke admin</a>
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
        {kategoriData.length === 0 && <p style={{ color: '#777' }}>Belum ada WO yang berstatus Approved.</p>}
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
    </div>
  );
}
