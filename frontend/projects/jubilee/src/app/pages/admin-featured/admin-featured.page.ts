import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ADMIN_API, FeaturedListing, FeaturedWeek } from 'api';
import { EmptyState, Icon, Button, Alert } from 'components';
import { ClockService } from '../../services/clock.service';
import { LoadState, errorReference } from '../../services/load-state';
import { dayLabel, isoDay } from '../../services/message-time';
import { ToastService } from '../../toasts/toast.service';
import { TeamNav } from '../admin-team-nav/team-nav';

const MAX = 5;

/** Choosing the businesses "Featured this week" at /admin/featured (L2-106). */
@Component({
  selector: 'jb-admin-featured-page',
  imports: [FormsModule, RouterLink, EmptyState, Icon, TeamNav, Button, Alert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-featured.page.html',
})
export class AdminFeaturedPage implements OnInit {
  private readonly api = inject(ADMIN_API);
  private readonly clock = inject(ClockService);
  private readonly toasts = inject(ToastService);

  protected readonly max = MAX;
  protected readonly state = signal<LoadState<FeaturedWeek[]>>({ status: 'loading' });
  protected readonly today = isoDay(this.clock.now());
  protected readonly startDate = signal(this.today);
  protected readonly chosen = signal<FeaturedListing[]>([]);
  protected readonly search = signal('');
  protected readonly candidates = signal<FeaturedListing[]>([]);
  protected readonly saving = signal(false);
  protected readonly problem = signal<string | null>(null);

  protected readonly full = computed(() => this.chosen().length >= MAX);
  protected readonly available = computed(() => {
    const ids = new Set(this.chosen().map((l) => l.id));
    return this.candidates().filter((c) => !ids.has(c.id));
  });
  protected readonly endLabel = computed(() => {
    const start = this.startDate();
    if (!start) return '';
    const end = new Date(`${start}T12:00:00`);
    end.setDate(end.getDate() + 6);
    return dayLabel(isoDay(end));
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.api.featuredWeeks().subscribe({
      next: (weeks) => {
        this.state.set({ status: 'loaded', value: weeks });
        this.pick(this.startDate());
      },
      error: (error: unknown) =>
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-ADM-513') }),
    });
  }

  /** Shows the selection already saved for the start date, if there is one. */
  protected pick(start: string): void {
    this.startDate.set(start);
    this.problem.set(null);
    const state = this.state();
    const weeks = state.status === 'loaded' ? state.value : [];
    this.chosen.set([...(weeks.find((w) => w.startDate === start)?.listings ?? [])]);
  }

  protected find(term: string): void {
    this.search.set(term);
    this.api.featuredCandidates(term).subscribe({
      next: (items) => this.candidates.set(items),
      error: () => this.candidates.set([]),
    });
  }

  protected add(listing: FeaturedListing): void {
    if (this.full()) return;
    this.chosen.update((list) => [...list, listing]);
    this.search.set('');
    this.candidates.set([]);
  }

  protected remove(index: number): void {
    this.chosen.update((list) => list.filter((_, i) => i !== index));
  }

  protected move(index: number, by: -1 | 1): void {
    this.chosen.update((list) => {
      const next = [...list];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
  }

  protected save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.problem.set(null);
    this.api
      .setFeaturedWeek(
        this.startDate(),
        this.chosen().map((l) => l.id),
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toasts.show({ tone: 'success', title: 'Featured businesses saved', text: '' });
          this.api.featuredWeeks().subscribe((weeks) => {
            this.state.set({ status: 'loaded', value: weeks });
          });
        },
        error: (error: unknown) => {
          this.saving.set(false);
          const errors =
            error instanceof HttpErrorResponse && error.status === 422
              ? ((error.error as { errors?: Record<string, string> } | null)?.errors ?? {})
              : null;
          if (!errors) {
            this.problem.set('We couldn’t save the selection. Nothing was changed. Try again.');
          } else if (errors['startDate'] === 'WEEK_OVERLAPS') {
            this.problem.set(
              'Another featured week starts within 7 days of this date. Pick another start date.',
            );
          } else if (errors['startDate']) {
            this.problem.set('Pick today or a later day to start.');
          } else if (errors['listingIds'] === 'NOT_LIVE') {
            this.problem.set(
              'One of the chosen businesses is no longer live. Remove it and try again.',
            );
          } else {
            this.problem.set(`Choose at most ${MAX} different businesses.`);
          }
        },
      });
  }
}
