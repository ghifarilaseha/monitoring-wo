'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, usernameToEmail } from '../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const email = usernameToEmail(username);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Username atau password salah.');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('users').select('role').eq('auth_id', data.user.id).single();

    if (!profile) {
      setError('Akun ini belum terhubung ke data pengguna. Hubungi admin.');
      setLoading(false);
      return;
    }

    router.push(profile.role === 'admin' ? '/admin' : '/lapor');
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #8B1A1A 0%, #6B1414 100%)',
      padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/otto-logo.png" alt="OTTO" style={{ width: 64, filter: 'brightness(0) invert(1)', marginBottom: 10 }} />
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Utility Monitoring System</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>Masuk untuk melanjutkan</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
          <form onSubmit={handleLogin}>
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Masukkan username" required autoFocus />
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan password" required />
            {error && <div className="error">{error}</div>}
            <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 16, padding: '11px 16px', fontSize: 14 }}>
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
