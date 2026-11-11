import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  tone: 'success' | 'info' | 'warning' | 'danger';
  title: string;
  text?: string;
}

/** Toasts the app shows for a few seconds (docs/mocks/notifications/toast). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly list = signal<Toast[]>([]);
  readonly toasts = this.list.asReadonly();

  show(toast: Omit<Toast, 'id'>, seconds = 8): void {
    const id = this.nextId++;
    this.list.update((all) => [...all, { ...toast, id }]);
    setTimeout(() => this.dismiss(id), seconds * 1000);
  }

  dismiss(id: number): void {
    this.list.update((all) => all.filter((toast) => toast.id !== id));
  }
}
