import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Beside the overview's work queue (L2-275): System and Recent changes, each an
 * `admin-aside-section`.
 *
 *     <aside jb-admin-aside aria-label="System and recent changes">
 *       <section jb-admin-aside-section heading="System">…</section>
 *     </aside>
 */
@Component({
  selector: 'aside[jb-admin-aside]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'admin-aside' },
  templateUrl: './admin-aside.html',
  styleUrl: './admin-aside.scss',
})
export class AdminAside {}
