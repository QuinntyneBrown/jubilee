import { Injectable, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from 'components';
import { SessionService } from '../services/session.service';
import { draftOwner } from './draft-owner';
import { DraftSource } from './draft-source';
import { DraftStore } from './draft-store';

/**
 * DraftRegistry (L2-116): the draft sources of the page on screen. A source that appears is given
 * its draft back at once, if the signed-in member left one at this address; `saveAll` keeps what
 * every source holds, when the session ends or the member signs out.
 */
@Injectable({ providedIn: 'root' })
export class DraftRegistry {
  private readonly store = inject(DraftStore);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly sources = new Set<DraftSource>();

  constructor() {
    // A draft is shown only to the member who typed it (L2-011 AC3): another member's drafts go.
    effect(() => {
      const member = this.session.member();
      if (member) this.store.keepOnly(draftOwner(member));
    });
  }

  /** Adds a source and restores its draft; returns what removes the source again. */
  register(source: DraftSource): () => void {
    this.sources.add(source);
    const member = this.session.member();
    const values = member ? this.store.take(draftOwner(member), this.router.url, source.key) : null;
    if (values) {
      source.restore(values);
      this.toasts.show({
        tone: 'info',
        title: 'We kept what you typed',
        text: 'Check it over, then send it when you’re ready.',
      });
    }
    return () => this.sources.delete(source);
  }

  /** Keeps what every source of the page holds, for the member who is signed in. */
  saveAll(): void {
    const member = this.session.member();
    if (!member) return;
    const owner = draftOwner(member);
    for (const source of this.sources) {
      const values = source.snapshot();
      if (values) this.store.save(owner, this.router.url, source.key, values);
    }
  }
}
