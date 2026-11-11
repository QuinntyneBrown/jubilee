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

/** The two-letter avatar of a name: "Legacy Financial" is LF. */
export function initialsOf(name: string): string {
  const words = name.split(/[\s&]+/).filter((w) => /^[\p{L}\p{N}]/u.test(w));
  return (words[0]?.[0] ?? '?').concat(words[1]?.[0] ?? '').toUpperCase();
}
