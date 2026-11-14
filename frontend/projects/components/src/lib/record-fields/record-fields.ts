import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';
import { cellOf, RecordsColumn } from '../records-table/records-table';
import { Skeleton } from '../skeleton/skeleton';
import { StatusPill } from '../status-pill/status-pill';

/**
 * The fields of a record of the admin application (L2-282 AC3): each a label and its value drawn
 * by its type, as the tables draw them; long text and JSON keep their line breaks.
 *
 *     <dl jb-record-fields [fields]="fields()" [values]="record.values"></dl>
 *
 * While `loading`, six rows of skeletons stand in.
 */
@Component({
  selector: 'dl[jb-record-fields]',
  imports: [NgTemplateOutlet, RouterLink, Icon, Skeleton, StatusPill],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'record-fields' },
  templateUrl: './record-fields.html',
  styleUrl: './record-fields.scss',
})
export class RecordFields {
  readonly fields = input<readonly RecordsColumn[]>([]);
  readonly values = input<Readonly<Record<string, unknown>>>({});
  readonly loading = input(false, { transform: booleanAttribute });

  protected readonly skeletons = [0, 1, 2, 3, 4, 5];

  protected readonly rows = computed(() =>
    this.fields().map((field) => ({
      field,
      cell: cellOf(field.type, this.values()[field.key]),
    })),
  );
}
