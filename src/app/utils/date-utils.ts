/**
 * Centralized Date Utilities for SVK Healthcare & E-Com ERP
 * Standard format across all components & API payloads: DD-MM-YYYY
 */

/**
 * Formats any Date object, ISO string (YYYY-MM-DD), or timestamp into DD-MM-YYYY string.
 * Returns empty string if input is null, undefined, or invalid.
 */
export function formatDateDDMMYYYY(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '';

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    const day = dateInput.getDate().toString().padStart(2, '0');
    const month = (dateInput.getMonth() + 1).toString().padStart(2, '0');
    const year = dateInput.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const str = String(dateInput).trim();
  if (!str) return '';

  // Already in DD-MM-YYYY format (e.g. "26-08-2026")
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }

  // ISO date format YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  // Fallback parsing via Date constructor
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const day = parsed.getDate().toString().padStart(2, '0');
    const month = (parsed.getMonth() + 1).toString().padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return str;
}

/**
 * Parses a date string (DD-MM-YYYY or YYYY-MM-DD) or Date object into a JS Date object
 * suitable for Angular Material Datepicker form control binding.
 */
export function parseDateFromDDMMYYYY(dateInput: Date | string | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }

  const str = String(dateInput).trim();
  if (!str) return null;

  // Handles DD-MM-YYYY or DD/MM/YYYY format
  if (/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(str)) {
    const parts = str.split(/[-\/]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Handles YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split('T')[0].split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/** Alias helper for outgoing API payloads */
export const toDDMMYYYYString = formatDateDDMMYYYY;
