import { AdminChange, AdminOverview, AdminQueueLine, AdminSystemItem } from 'api';
import { ChangeLine, SystemItem, WorkQueueLine } from 'components';

const ZONE = 'America/Toronto';
const DAY = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: ZONE,
});
const TIME = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: ZONE,
});
const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: ZONE });

/** The day in Toronto as the overview names it: "Tuesday 10 November" (L2-274 AC1). */
export function dayOf(now: Date): string {
  const part = Object.fromEntries(DAY.formatToParts(now).map((p) => [p.type, p.value]));
  return `${part['weekday']} ${part['day']} ${part['month']}`;
}

/** "Good morning", "Good afternoon" or "Good evening", by the hour in Toronto. */
export function greetingOf(hour: number): string {
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

/** The heading: "Good morning, Ada." with what is waiting once it is known (L2-274 AC1, AC5). */
export function headingOf(greeting: string, first: string, waiting: number | null): string {
  const hello = `${greeting}, ${first}.`;
  if (waiting === null) return hello;
  if (waiting === 0) return `${hello} Nothing is waiting on staff.`;
  return `${hello} ${waiting} ${waiting === 1 ? 'thing is' : 'things are'} waiting on staff.`;
}

/** "18:02" in Toronto. */
export function timeOf(at: string): string {
  return TIME.format(new Date(at));
}

/** "18 Nov 06:32" in Toronto. */
export function whenOf(at: string): string {
  return `${DATE.format(new Date(at))} ${timeOf(at)}`;
}

/** How long the oldest record has waited: "oldest 45m", "oldest 3h", "oldest 3d" (L2-274 AC3). */
export function ageOf(oldestAt: string | null, now: Date): string {
  if (!oldestAt) return '';
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(oldestAt).getTime()) / 60_000));
  if (minutes < 60) return `oldest ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `oldest ${hours}h` : `oldest ${Math.floor(hours / 24)}d`;
}

export function lineOf(line: AdminQueueLine, now: Date): WorkQueueLine {
  return {
    label: line.label,
    next: line.next,
    count: line.count,
    urgent: line.urgent,
    age: ageOf(line.oldestAt, now),
    open: `/${line.table}/${encodeURIComponent(line.nextId)}`,
    all: `/${line.table}`,
  };
}

/** An item of System as the overview says it (L2-275 AC1–AC3). */
export function systemOf(item: AdminSystemItem): SystemItem {
  const link = `/${item.table}`;
  switch (item.kind) {
    case 'failed':
      return {
        tone: 'bad',
        icon: 'alert',
        state: 'Failed',
        subject: item.subject,
        text: `failed at ${timeOf(item.at)}`,
        detail: 'It did not finish within an hour.',
        link,
      };
    case 'retrying':
      return {
        tone: 'wait',
        icon: 'alert',
        state: 'Retrying',
        subject: item.subject,
        text: `retrying, attempt ${item.attempts ?? 1}`,
        detail: `Next attempt at ${timeOf(item.at)}.`,
        link,
      };
    case 'gave-up':
      return {
        tone: 'bad',
        icon: 'alert',
        state: 'Gave up',
        subject: item.subject,
        text: 'gave up',
        detail: `Not sent after ${item.attempts ?? 1} attempts in 24 hours.`,
        link,
      };
    case 'maintenance':
      return {
        tone: 'plain',
        icon: 'wrench',
        state: 'Maintenance',
        subject: null,
        text: 'Maintenance under way',
        detail: `Since ${timeOf(item.at)}, back by ${item.until ? timeOf(item.until) : 'soon'}, read-only`,
        link,
      };
  }
}

export function changeOf(change: AdminChange): ChangeLine {
  return {
    actor: change.actor,
    what: change.what,
    recordId: change.recordId,
    when: whenOf(change.at),
  };
}

/** "Since yesterday: …" in the order and words of L2-274 AC1. */
export function sinceOf(since: AdminOverview['since']): { count: number; what: string }[] {
  return [
    { count: since.members, what: 'new members' },
    { count: since.listings, what: 'listings published' },
    { count: since.orders, what: 'merch orders' },
    { count: since.requests, what: 'requests sent' },
  ];
}
