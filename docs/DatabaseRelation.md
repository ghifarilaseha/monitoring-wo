# Database Relations — Utility Monitoring System

## Tables Overview

```
users
  └── work_orders (via pic_id → users.id)
  └── wo_pelaksana (via user_id → users.id)
  └── reports (via dilaporkan_oleh → users.id)
  └── data_harian (via operator_boiler_id, operator_ws_id, teknisi_id, kepala_regu_id → users.id)

work_orders
  └── reports (via work_order_id → work_orders.id, ON DELETE CASCADE)
  └── wo_pelaksana (via work_order_id → work_orders.id, ON DELETE CASCADE)

master_area       → referenced by work_orders.area (string, not FK)
master_instrumen  → referenced by work_orders.mesin_instrument (string, not FK)
master_kategori   → referenced by work_orders.kategori (string, not FK)
```

---

## Table Details

### users
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| nama | text | Display name |
| role | text | 'admin' or 'pelaksana' |
| auth_id | uuid | FK → auth.users.id (Supabase Auth) |
| created_at | timestamptz | |

### work_orders
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| wo_code | text UNIQUE | Auto-generated: UTL26-07-01 |
| tanggal_input | date | Auto: current_date |
| tanggal_rencana | date | Set by admin |
| area | text | From master_area |
| mesin_instrument | text | From master_instrumen |
| deskripsi | text | |
| kategori | text | From master_kategori |
| prioritas | text | Low / Medium / High |
| pic_id | uuid FK | → users.id (main PIC) |
| target_durasi_jam | numeric | In hours |
| status_wo | text | Belum Selesai / Selesai / Approved |
| sumber | text | terencana / tidak terencana |
| remarks | text | Admin notes on reject |
| minggu | int | Week number (legacy, unused in UI) |
| created_at | timestamptz | |

### reports
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| work_order_id | uuid FK UNIQUE | → work_orders.id (1 report per WO) |
| waktu_mulai | timestamptz | Stored as UTC, displayed as WIB |
| waktu_selesai | timestamptz | Stored as UTC, displayed as WIB |
| keterangan | text | |
| foto_sebelum_url | text | Supabase Storage public URL |
| foto_sesudah_url | text | Supabase Storage public URL |
| dilaporkan_oleh | uuid FK | → users.id |
| created_at | timestamptz | |

### wo_pelaksana
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| work_order_id | uuid FK | → work_orders.id (CASCADE DELETE) |
| user_id | uuid FK | → users.id |
| peran | text | 'pic' or 'support' |
| created_at | timestamptz | |
| UNIQUE | (work_order_id, user_id) | One record per person per WO |

### master_area
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| nama | text UNIQUE | |

### master_instrumen
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| nama | text UNIQUE | |

### master_kategori
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| nama | text UNIQUE | |

### data_harian
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tanggal | date | |
| shift | text | Shift 1 / 2 / 3 |
| operator_boiler_id | uuid FK | → users.id (nullable) |
| operator_ws_id | uuid FK | → users.id (nullable) |
| teknisi_id | uuid FK | → users.id (nullable) |
| kepala_regu_id | uuid FK | → users.id (nullable) |
| catatan | text | |
| keterangan_nbl | text | |
| keterangan_cepha | text | |
| pesan_teks | text | Full WA message text |
| ringkasan_boiler | text | Per-role summary for Excel export |
| ringkasan_ws | text | |
| ringkasan_teknisi | text | |
| ringkasan_kepala_regu | text | |
| created_at | timestamptz | |

---

## Important Notes

**Timezone:** All `timestamptz` columns are stored in UTC by Supabase.
The app converts WIB input (UTC+7) → UTC before saving, and UTC → WIB on display.
See `src/utils/dateUtils.js` for the conversion functions.

**String references (not FK):** `work_orders.area`, `work_orders.mesin_instrument`,
and `work_orders.kategori` store the string value directly (not a foreign key to the
master tables). This means deleting a master item does not break existing WO records.

**Photo storage:** Photos are stored in the Supabase Storage bucket `bukti-foto`.
The public URL is saved in `reports.foto_sebelum_url` and `reports.foto_sesudah_url`.
Photos are compressed client-side before upload (see `src/utils/imageUtils.js`).

**Auto-generated WO code:** Handled by a PostgreSQL trigger `trg_generate_wo_code`
which calls `generate_wo_code()`. Format: `UTL{YY}-{MM}-{NN}` (e.g. UTL26-07-01).
