/**
 * File: statusConstants.js
 * Module: constants
 * Purpose: Central source of truth for all Work Order status values.
 *          Use these instead of hardcoded strings to avoid typos and
 *          make future status changes easy to manage in one place.
 * Author: Utility Monitoring System
 * Last Modified: 2026-07
 */

export const WO_STATUS = {
  BELUM_SELESAI: 'Belum Selesai',
  SELESAI: 'Selesai',
  APPROVED: 'Approved',
};

export const WO_SUMBER = {
  TERENCANA: 'terencana',
  TIDAK_TERENCANA: 'tidak terencana',
};

export const WO_PERAN = {
  PIC: 'pic',
  SUPPORT: 'support',
};
