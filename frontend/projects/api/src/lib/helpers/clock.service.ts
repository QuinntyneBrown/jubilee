import { Injectable } from '@angular/core';

/** The device clock, read in Toronto time, in one place so that pages agree on "now". */
@Injectable({ providedIn: 'root' })
export class ClockService {
  private static readonly hourInToronto = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    hour: 'numeric',
    hourCycle: 'h23',
  });

  now(): Date {
    return new Date();
  }

  year(): number {
    return this.now().getFullYear();
  }

  /** The hour of the day (0 to 23) in America/Toronto. */
  torontoHour(): number {
    return Number(ClockService.hourInToronto.format(this.now()));
  }
}
