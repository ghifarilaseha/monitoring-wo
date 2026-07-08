'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const NAV_ADMIN = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href: '/admin',
    label: 'Work Order',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    href: '/admin/wa',
    label: 'Pesan WA',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
  {
    href: '/admin#pelaksana',
    label: 'Pengguna & Data',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
];

const NAV_PELAKSANA = [
  {
    href: '/lapor',
    label: 'Work Order',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
];

export default function Sidebar({ role, namaUser }) {
  const pathname = usePathname();
  const navItems = role === 'admin' ? NAV_ADMIN : NAV_PELAKSANA;

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  function isActive(href) {
    const base = href.split('#')[0];
    if (base === '/admin' && pathname.startsWith('/admin/wo')) return true;
    return pathname === base || (base !== '/' && pathname.startsWith(base) && base !== '/admin');
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/otto-logo.png" alt="OTTO" />
          <div className="sidebar-logo-text">Utility<br/>Monitoring System</div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <a key={item.href} href={item.href} className={isActive(item.href) ? 'active' : ''}>
              {item.icon}
              {item.label}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <b>{namaUser}</b>
            {role === 'admin' ? 'Administrator' : 'Pelaksana'}
          </div>
          <button className="secondary" style={{ width: '100%', marginTop: 4, fontSize: 12 }} onClick={handleLogout}>
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {navItems.map(item => (
          <a key={item.href} href={item.href} className={isActive(item.href) ? 'active' : ''}>
            {item.icon}
            {item.label.split(' ')[0]}
          </a>
        ))}
        <a href="/" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Keluar
        </a>
      </nav>
    </>
  );
}
