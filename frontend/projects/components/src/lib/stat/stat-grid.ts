import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The figures of an overview, two to a row and four from the desktop layout: `<div jb-stat-grid>`. */
@Component({
  selector: 'div[jb-stat-grid]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'stat-grid' },
  templateUrl: './stat-grid.html',
  styleUrl: './stat-grid.scss',
})
export class StatGrid {}
