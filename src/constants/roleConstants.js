/**
 * File: roleConstants.js
 * Module: constants
 * Purpose: Central definitions for user roles and work order priority levels.
 *          Keeps role/priority logic consistent across all modules.
 * Author: Utility Monitoring System
 * Last Modified: 2026-07
 */

export const USER_ROLE = {
  ADMIN: 'admin',
  PELAKSANA: 'pelaksana',
};

export const WO_PRIORITAS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

/**
 * Shift options used in the WhatsApp daily message generator.
 */
export const SHIFT_OPTIONS = ['Shift 1', 'Shift 2', 'Shift 3'];

/**
 * Role definitions for the WhatsApp message generator.
 * Each role has:
 * - key: field name in the form state (maps to wo_pelaksana)
 * - tugasKey: field name for the manual task description (poin 1)
 * - label: display name shown in the UI
 * - tugas: default task description used as placeholder
 * - lsKey: localStorage key for persisting the task text across sessions
 */
export const WA_ROLES = [
  {
    key: 'operator_boiler_id',
    tugasKey: 'operator_boiler_tugas',
    label: 'Operator Boiler',
    tugas: 'Back-up operasional boiler & PWT',
    lsKey: 'wa_tugas_operator_boiler',
  },
  {
    key: 'operator_ws_id',
    tugasKey: 'operator_ws_tugas',
    label: 'Operator WS',
    tugas: 'Back-up operasional WS, CAOF dan PSG NBL',
    lsKey: 'wa_tugas_operator_ws',
  },
  {
    key: 'teknisi_id',
    tugasKey: 'teknisi_tugas',
    label: 'Teknisi',
    tugas: 'Back up Mobile dan operasional gas, sumur & PSG Cepha',
    lsKey: 'wa_tugas_teknisi',
  },
  {
    key: 'kepala_regu_id',
    tugasKey: 'kepala_regu_tugas',
    label: 'Kepala Regu',
    tugas: 'Kepala Regu',
    lsKey: 'wa_tugas_kepala_regu',
  },
];
