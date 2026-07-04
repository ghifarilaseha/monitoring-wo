'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { supabase } from '../../lib/supabase';

const COLORS = ['#2952e3', '#e38b29', '#e34141', '#29a36b', '#8a5be3', '#e3297f'];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/'); return; }

    const { data: profile } = await supabase.from('users').select('role').eq('auth_id', user.id).single();
    if (!profile || profile.role !== 'admin') { router.push('/lapor'); return; }

    const { data } = await supabase.from('work_orders').select('*, users(nama)');
    setWorkOrders(data || []);
    setLoading(false);
  }

  if (loading) return <div className="container">Memuat...</div>;

  // Trend per bulan
  const trendMap = {};
  workOrders.forEach(wo => {
    const key = wo.tanggal_rencana?.slice(0, 7);
    if (!key) return;
    trendMap[key] = (trendMap[key] || 0) + 1;
  });
  const trendData = Object.keys(trendMap).sort().map(k => ({ bulan: k, jumlah: trendMap[k] }));

  // Status breakdown
  const statusMap = {};
  workOrders.forEach(wo => { statusMap[wo.status_wo] = (statusMap[wo.status_wo] || 0) + 1; });
  const statusData = Object.keys(statusMap).map(k => ({ name: k, value: statusMap[k] }));

  // Kategori breakdown
  const kategoriMap = {};
  workOrders.forEach(wo => {
    const k = wo.kategori || 'Lainnya';
    kategoriMap[k] = (kategoriMap[k] || 0) + 1;
  });
  const kategoriData = Object.keys(kategoriMap).map(k => ({ name: k, jumlah: kategoriMap[k] }));

  // PIC breakdown
  const picMap = {};
  workOrders.forEach(wo => {
    const nama = wo.users?.nama || 'Belum ditugaskan';
    picMap[nama] = (picMap[nama] || 0) + 1;
  });
  const picData = Object.keys(picMap).map(k => ({ name: k, jumlah: picMap[k] }));

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <div className="topbar">
        <h1 style={{ marginBottom: 0 }}>Dashboard monitoring</h1>
        <a href="/admin">Kembali ke admin</a>
      </div>

      <div className="card">
        <h2>Total work order: {workOrders.length}</h2>
      </div>

      <div className="card">
        <h2>Trend jumlah WO per bulan</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bulan" fontSize={12} />
            <YAxis fontSize={12} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="jumlah" stroke="#2952e3" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2>Status pekerjaan</h2>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label>
              {statusData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2>Berdasarkan kategori</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={kategoriData} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" fontSize={12} allowDecimals={false} />
            <YAxis type="category" dataKey="name" fontSize={12} width={100} />
            <Tooltip />
            <Bar dataKey="jumlah" fill="#2952e3" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2>Berdasarkan PIC</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={picData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="jumlah" fill="#e38b29" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
