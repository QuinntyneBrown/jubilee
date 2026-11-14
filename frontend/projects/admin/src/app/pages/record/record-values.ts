import { AdminRecord, AdminTable } from 'api';
import { formatAdminDate, RecordsColumn, RecordSystemValue } from 'components';

/** The fields a staff member reads and changes; the system ones go in the line below (L2-282 AC3). */
export function ownFields(table: AdminTable | null | undefined): RecordsColumn[] {
  return (table?.fields ?? [])
    .filter((f) => !f.system)
    .map((f) => ({ key: f.key, label: f.label, type: f.type }));
}

/** The system values of a record: its ID in code, its dates as the tables write them. */
export function systemValues(
  table: AdminTable | null | undefined,
  record: AdminRecord | null,
): RecordSystemValue[] {
  if (!record) return [];
  return (table?.fields ?? [])
    .filter((f) => f.system && record.values[f.key] != null)
    .map((f) => {
      const value = String(record.values[f.key]);
      if (f.type === 'id') return { label: f.label, value, code: true };
      const date = f.type === 'date' || f.type === 'datetime';
      return {
        label: f.label,
        value: date ? formatAdminDate(value, f.type === 'datetime') : value,
      };
    });
}

/** A value in the text an editor shows and the API takes: a reference by its ID (L2-283). */
export function wireOf(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && 'id' in value) return String((value as { id: unknown }).id);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** What a refusal's code says under a field (L2-283 AC2). */
export function refusalOf(code: string, label: string): string {
  switch (code) {
    case 'REQUIRED':
      return `${label} is required.`;
    case 'TOO_LONG':
      return `${label} is too long.`;
    case 'NOT_ALLOWED':
      return `${label} can’t change to that.`;
    case 'NOT_EDITABLE':
      return `${label} can’t be changed here.`;
    case 'NOT_LIVE':
      return 'Choose a listing that is live.';
    case 'OUT_OF_RANGE':
      return 'Choose a position from 1 to 5.';
    case 'START_IN_PAST':
      return 'Choose today or a later day.';
    case 'WEEK_FULL':
      return 'That week already has five featured listings.';
    case 'WEEK_OVERLAPS':
      return 'Another featured week overlaps this one.';
    default:
      return `Check ${label.toLowerCase()}.`;
  }
}
