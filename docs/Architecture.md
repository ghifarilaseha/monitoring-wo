# Architecture — Utility Monitoring System

## Overview

Internal web application for the Engineering Utility Department.
Built with Next.js 14 (App Router), Supabase (PostgreSQL + Auth + Storage), and React.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| File Storage | Supabase Storage (bukti-foto bucket) |
| Hosting | Vercel |
| Version Control | GitHub |

---

## Folder Structure (Target — Feature-Based)

```
monitoring-wo/
├── app/                        # Next.js App Router pages (thin, UI only)
│   ├── admin/
│   │   ├── page.js             # Admin: Work Order management
│   │   ├── wa/page.js          # Admin: WhatsApp message generator
│   │   └── wo/[id]/page.js     # Admin: Work Order detail & approval
│   ├── dashboard/page.js       # Dashboard: KPI & charts
│   ├── lapor/page.js           # Pelaksana: report submission
│   ├── components/
│   │   └── Sidebar.js          # Shared layout component
│   ├── globals.css
│   └── layout.js
│
├── src/                        # Business logic (framework-agnostic)
│   ├── constants/              # Static values — statuses, roles, colors
│   │   ├── statusConstants.js
│   │   ├── roleConstants.js
│   │   ├── colorConstants.js
│   │   └── index.js
│   │
│   ├── utils/                  # Pure helper functions
│   │   ├── dateUtils.js        # WIB timezone, date formatting
│   │   ├── kpiUtils.js         # KPI calculation (Fulfillment, OnTime, Efficiency)
│   │   ├── waUtils.js          # WhatsApp message generator
│   │   ├── exportUtils.js      # Excel export (WO list, KPI, Data Harian)
│   │   ├── imageUtils.js       # Client-side image compression
│   │   └── index.js
│   │
│   ├── services/               # [Tahap 2] Supabase query functions
│   └── hooks/                  # [Tahap 3] Custom React hooks
│
├── lib/
│   └── supabase.js             # Supabase client + usernameToEmail helper
│
├── public/
│   └── otto-logo.png
│
└── docs/                       # Developer documentation
    ├── Architecture.md         ← you are here
    ├── FolderStructure.md
    ├── WorkOrderFlow.md
    ├── DatabaseRelation.md
    └── DeveloperGuide.md
```

---

## Auth Flow

```
User visits page
    ↓
supabase.auth.getUser()
    ↓ (no session)         ↓ (has session)
redirect to /          fetch profile from users table
                            ↓ (role = admin)    ↓ (role = pelaksana)
                        admin pages          lapor page
```

---

## Work Order Status Flow

```
Admin creates WO
    ↓
status: "Belum Selesai"
    ↓
Pelaksana (PIC) submits report
    ↓
status: "Selesai"
    ↓
Admin reviews report
    ↓ Approve              ↓ Reject
status: "Approved"     status: "Belum Selesai" (+ remarks)
    ↓                       ↓
appears in dashboard    Pelaksana revises and resubmits
KPI calculations
```

---

## Refactor Progress

| Tahap | Status | Description |
|---|---|---|
| 1 — Constants & Utils | ✅ Done | Pure functions, no breaking changes |
| 2 — Service Layer | 🔲 Planned | Move Supabase queries out of components |
| 3 — Custom Hooks | 🔲 Planned | useAuth, useWorkOrders, useDashboard |
| 4 — UI Components | 🔲 Planned | WOCard, StatusBadge, KPIGauge |
| 5 — Refactor pages | 🔲 Planned | Pages use services + hooks |
| 6 — Documentation | 🔲 In progress | |
