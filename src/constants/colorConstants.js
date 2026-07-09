/**
 * File: colorConstants.js
 * Module: constants
 * Purpose: Centralized color palette for the application.
 *          Ensures visual consistency across all charts, badges, and UI elements.
 *          When branding changes, update here — not scattered across 10 files.
 * Author: Utility Monitoring System
 * Last Modified: 2026-07
 */

export const BRAND_COLORS = {
  PRIMARY: '#8B1A1A',
  PRIMARY_DARK: '#6B1414',
  ACCENT: '#E07B2A',
  SUCCESS: '#1E6B3C',
  ERROR: '#B3261E',
  WARNING: '#8A5B00',
};

/**
 * Color palette for recharts pie/bar charts.
 * Used by cycling through index: CHART_COLORS[i % CHART_COLORS.length]
 */
export const CHART_COLORS = [
  '#2952e3',
  '#e38b29',
  '#e34141',
  '#29a36b',
  '#8a5be3',
  '#e3297f',
  '#1e9be3',
];

/**
 * Status badge CSS class mapping.
 * Maps WO_STATUS values to className suffixes used in globals.css.
 */
export const STATUS_BADGE_CLASS = {
  'Belum Selesai': 'status-belum',
  'Selesai': 'status-selesai',
  'Approved': 'status-approved',
};

/**
 * Priority badge CSS class mapping.
 * Maps WO_PRIORITAS values to className suffixes used in globals.css.
 */
export const PRIORITY_BADGE_CLASS = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
};
