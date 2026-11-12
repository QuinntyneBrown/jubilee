const ZONE = 'America/Toronto';

const TIME = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONE,
  hour: 'numeric',
  minute: '2-digit',
});
const PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  weekday: 'short',
});

interface DayParts {
  key: string;
  year: string;
  weekday: string;
  day: string;
  month: string;
}

function parts(date: Date): DayParts {
  const found = Object.fromEntries(PARTS.formatToParts(date).map((p) => [p.type, p.value]));
  const month = found['month'].replace('.', '');
  return {
    key: `${found['year']}-${month}-${found['day']}`,
    year: found['year'],
    weekday: found['weekday'].replace('.', ''),
    day: found['day'],
    month,
  };
}

const DAY = 24 * 60 * 60 * 1000;

/** The time of a message in the Toronto zone, for example "9:14 a.m.". */
export function clockTime(iso: string): string {
  return TIME.format(new Date(iso));
}

/** The time column of an inbox row: today's time, "Yesterday", a weekday and date, or the date. */
export function threadTime(iso: string, now: Date): string {
  const date = new Date(iso);
  const then = parts(date);
  if (then.key === parts(now).key) return clockTime(iso);
  if (then.key === parts(new Date(now.getTime() - DAY)).key) return 'Yesterday';
  const label = `${then.day} ${then.month}`;
  if (now.getTime() - date.getTime() < 7 * DAY) return `${then.weekday} ${label}`;
  return then.year === parts(now).year ? label : `${label} ${then.year}`;
}

/** The day heading of the conversation: "Today · Tue 10 Nov", "Yesterday · Mon 9 Nov" or "Sat 7 Nov". */
export function dayHeading(iso: string, now: Date): string {
  const then = parts(new Date(iso));
  const label = `${then.weekday} ${then.day} ${then.month}`;
  if (then.key === parts(now).key) return `Today · ${label}`;
  if (then.key === parts(new Date(now.getTime() - DAY)).key) return `Yesterday · ${label}`;
  return label;
}

/** The key of the Toronto day a message belongs to, to group messages under one heading. */
export function dayKey(iso: string): string {
  return parts(new Date(iso)).key;
}

/** A new idempotency key for one send; a retry of that send reuses it (L2-132). */
export function newKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

/** "13:30" as "1:30 p.m.", the way the mocks write a time. */
export function slotLabel(slot: string): string {
  const [hours, minutes] = slot.split(':').map(Number);
  const suffix = hours < 12 ? 'a.m.' : 'p.m.';
  return `${hours % 12 === 0 ? 12 : hours % 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

const DAY_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** A date as "2026-11-12" in Toronto, the value of a date field. */
export function isoDay(date: Date): string {
  return DAY_FORMAT.format(date);
}

/** "Mon 9 Nov": the day of the Toronto date, without today or yesterday (L2-013 "Last saved"). */
export function dayLabel(iso: string): string {
  const then = parts(new Date(iso));
  return `${then.weekday} ${then.day} ${then.month}`;
}

/** "14 Oct 2026" (L2-015 "Changed"). */
export function fullDate(iso: string): string {
  const then = parts(new Date(iso));
  return `${then.day} ${then.month} ${then.year}`;
}

const MONTH_YEAR = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONE,
  month: 'long',
  year: 'numeric',
});

/** "October 2026" (L2-013 "member since"). */
export function monthYear(iso: string): string {
  return MONTH_YEAR.format(new Date(iso));
}
