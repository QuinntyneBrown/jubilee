import { Pipe, PipeTransform } from '@angular/core';

const count = new Intl.NumberFormat('en-CA');

/** A count with a thousands separator: 1204 → "1,204" (L2-027). */
export function formatCount(value: number): string {
  return count.format(value);
}

/** A price in dollars: 3400 → "$34", 2250 → "$22.50"; per-unit prices end in " ea" (L2-027). */
export function formatPrice(cents: number, perUnit = false): string {
  const dollars = cents / 100;
  const amount = Number.isInteger(dollars) ? `${count.format(dollars)}` : dollars.toFixed(2);
  return `$${amount}${perUnit ? ' ea' : ''}`;
}

@Pipe({ name: 'jbCount' })
export class CountPipe implements PipeTransform {
  transform(value: number): string {
    return formatCount(value);
  }
}

@Pipe({ name: 'jbPrice' })
export class PricePipe implements PipeTransform {
  transform(cents: number, perUnit = false): string {
    return formatPrice(cents, perUnit);
  }
}

/** A service's price as its row shows it: "Free", "Ask", or the amount in dollars (L2-033 AC2). */
export function formatServicePrice(kind: 'free' | 'amount' | 'ask', cents: number | null): string {
  if (kind === 'free') return 'Free';
  if (kind === 'ask' || cents === null) return 'Ask';
  return formatPrice(cents);
}
