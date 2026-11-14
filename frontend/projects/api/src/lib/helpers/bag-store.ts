import { Injectable, computed, signal } from '@angular/core';
import { BagLine } from '../models/merch';
import { MAX_QUANTITY, shirtCount } from './merch';

const KEY = 'jubilee.bag';

/**
 * The bag, kept on the device under `jubilee.bag` (L2-266 AC4): it survives a reload and a closed
 * browser, holds lines across fits and sizes, and is sent nowhere until checkout. A browser without
 * storage still has a bag for the visit.
 */
@Injectable({ providedIn: 'root' })
export class BagStore {
  private readonly state = signal<readonly BagLine[]>(read());

  readonly lines = this.state.asReadonly();
  readonly count = computed(() => shirtCount(this.state()));
  readonly subtotalCents = computed(() =>
    this.state().reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0),
  );

  /** Adds a line, or adds to the line of the same size, never above `max` (L2-265 AC3). */
  add(line: BagLine, max = MAX_QUANTITY): void {
    const lines = this.state();
    const same = lines.find((l) => l.sku === line.sku);
    this.save(
      same
        ? lines.map((l) =>
            l.sku === line.sku
              ? {
                  ...l,
                  unitPriceCents: line.unitPriceCents,
                  quantity: Math.min(max, l.quantity + line.quantity),
                }
              : l,
          )
        : [...lines, { ...line, quantity: Math.min(max, line.quantity) }],
    );
  }

  setQuantity(sku: string, quantity: number): void {
    this.save(
      this.state().map((l) =>
        l.sku === sku ? { ...l, quantity: Math.max(1, Math.min(MAX_QUANTITY, quantity)) } : l,
      ),
    );
  }

  /** The price read again from the server (L2-266 AC4). */
  reprice(sku: string, unitPriceCents: number): void {
    this.save(this.state().map((l) => (l.sku === sku ? { ...l, unitPriceCents } : l)));
  }

  remove(sku: string): void {
    this.save(this.state().filter((l) => l.sku !== sku));
  }

  /** Emptied once the order is paid (L2-269 AC2). */
  clear(): void {
    this.save([]);
  }

  private save(lines: readonly BagLine[]): void {
    this.state.set(lines);
    try {
      if (lines.length) localStorage.setItem(KEY, JSON.stringify(lines));
      else localStorage.removeItem(KEY);
    } catch {
      // No storage (a private window): the bag lasts for the visit.
    }
  }
}

function read(): readonly BagLine[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is BagLine =>
        typeof l?.sku === 'string' &&
        typeof l?.fit === 'string' &&
        typeof l?.size === 'string' &&
        Number.isInteger(l?.quantity) &&
        l.quantity > 0 &&
        Number.isInteger(l?.unitPriceCents),
    );
  } catch {
    return [];
  }
}
