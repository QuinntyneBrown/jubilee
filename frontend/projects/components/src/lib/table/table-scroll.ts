import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The frame of a `jb-table`: it scrolls sideways when the table is wider than the page. */
@Component({
  selector: 'div[jb-table-scroll]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'table-wrap' },
  templateUrl: './table-scroll.html',
  styleUrl: './table-scroll.scss',
})
export class TableScroll {}
