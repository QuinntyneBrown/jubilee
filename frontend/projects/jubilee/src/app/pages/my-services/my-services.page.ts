import { Dialog } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { CATALOGUE_API, DeletedItem, OwnerService, OwnerServices } from 'api';
import { EmptyState, Icon, formatServicePrice } from 'components';
import { DeleteItemData, DeleteItemDialog } from '../../dialogs/delete-item/delete-item.dialog';
import {
  ServiceEditorData,
  ServiceEditorDialog,
  ServiceSaved,
} from '../../dialogs/service-editor/service-editor.dialog';
import { LoadState, errorReference as errorRef } from '../../services/load-state';
import { ToastService } from '../../toasts/toast.service';
import { WorkspaceHeader } from '../my-business/workspace-header';

/** My products at /my-business/services (L2-092, L2-093): the service list, with add, edit, delete and reorder. */
@Component({
  selector: 'jb-my-services-page',
  imports: [EmptyState, Icon, WorkspaceHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './my-services.page.html',
})
export class MyServicesPage implements OnInit {
  private readonly api = inject(CATALOGUE_API);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly skeleton = [1, 2, 3, 4];
  protected readonly state = signal<LoadState<OwnerServices>>({ status: 'loading' });
  protected readonly moving = signal(false);
  /** What the screen reader hears after a row moves (L2-090). */
  protected readonly announcement = signal('');

  protected readonly services = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value : null;
  });

  protected readonly errorReference = computed(() => {
    const state = this.state();
    return state.status === 'error' ? state.reference : '';
  });

  protected readonly summary = computed(() => {
    const services = this.services();
    if (!services) return '';
    return `${services.total} ${services.total === 1 ? 'service' : 'services'}`;
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.fetch();
  }

  private fetch(): void {
    this.api.services().subscribe({
      next: (value) => this.state.set({ status: 'loaded', value }),
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 403) {
          void this.router.navigateByUrl('/forbidden');
          return;
        }
        this.state.set({ status: 'error', reference: errorRef(error, 'JB-SVC-503') });
      },
    });
  }

  protected price(service: OwnerService): string {
    return formatServicePrice(service.priceKind, service.priceCents);
  }

  protected meta(service: OwnerService): string {
    if (service.detail) return service.detail;
    if (service.action !== 'book' || !service.durationMinutes) return '';
    const modes = [
      service.offersVideo ? 'Video' : '',
      service.offersInPerson ? 'In person' : '',
    ].filter(Boolean);
    return `${service.durationMinutes} min · ${modes.join(' or ')}`;
  }

  protected add(services: OwnerServices): void {
    if (services.total >= services.max) {
      this.toasts.show({
        tone: 'warning',
        title: `You can list up to ${services.max} services.`,
        text: 'Delete one to add another.',
      });
      return;
    }
    this.edit(null);
  }

  protected edit(service: OwnerService | null): void {
    const ref = this.dialog.open<ServiceSaved, ServiceEditorData>(ServiceEditorDialog, {
      data: { service },
      disableClose: true,
      ...this.dialogOptions(),
    });
    ref.closed.subscribe((saved) => {
      if (!saved) return;
      this.fetch();
      this.toasts.show(
        saved.created
          ? {
              tone: 'success',
              title: 'Service added',
              text: `“${saved.service.name}” is live on your listing.`,
            }
          : {
              tone: 'success',
              title: 'Service updated',
              text: `“${saved.service.name}” is updated.`,
            },
      );
    });
  }

  protected remove(service: OwnerService): void {
    const ref = this.dialog.open<DeletedItem, DeleteItemData>(DeleteItemDialog, {
      data: { kind: 'service', id: service.id, name: service.name, pastRequests: 0 },
      ...this.dialogOptions(),
    });
    ref.closed.subscribe((deleted) => {
      if (!deleted) return;
      this.fetch();
      this.toasts.show({
        tone: 'success',
        title: 'Service deleted',
        text: `“${deleted.name}” is gone from your listing.`,
      });
    });
  }

  /** Moves a service up or down by one place (L2-090). */
  protected move(services: OwnerServices, service: OwnerService, by: -1 | 1): void {
    if (this.moving()) return;
    const index = services.rows.indexOf(service);
    const target = index + by;
    if (target < 0 || target >= services.rows.length) return;
    this.moving.set(true);
    this.api.moveService(service.id, target + 1).subscribe({
      next: (value) => {
        this.moving.set(false);
        this.state.set({ status: 'loaded', value });
        this.announcement.set(
          `${service.name} moved to position ${target + 1} of ${value.rows.length}.`,
        );
        setTimeout(() =>
          document
            .querySelector<HTMLElement>(
              `[aria-label="Move ${service.name} ${by === -1 ? 'up' : 'down'}"]:not([disabled])`,
            )
            ?.focus(),
        );
      },
      error: () => {
        this.moving.set(false);
        this.toasts.show({
          tone: 'danger',
          title: 'Couldn’t move the service',
          text: 'The order is unchanged. Try again.',
        });
      },
    });
  }

  private dialogOptions() {
    return {
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      backdropClass: 'backdrop',
    };
  }
}
