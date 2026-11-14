import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FieldError } from '../field/field-error';
import { Icon } from '../icon/icon';
import { Input } from '../input/input';
import { cellOf, RecordsColumn, RecordsColumnType } from '../records-table/records-table';
import { Select } from '../select/select';
import { Skeleton } from '../skeleton/skeleton';
import { StatusPill } from '../status-pill/status-pill';
import { Switch } from '../switch/switch';
import { Textarea } from '../textarea/textarea';

/** One choice of a select editor: a status word, or a record a reference may point at. */
export interface RecordChoice {
  value: string;
  label: string;
}

/** A value an editor changed, in its wire form. */
export interface RecordEdit {
  key: string;
  value: string | null;
}

type Editor = 'select' | 'switch' | 'textarea' | 'number' | 'email' | 'text';

/** The editor of each type (L2-283 AC1). */
function editorOf(type: RecordsColumnType): Editor {
  switch (type) {
    case 'status':
    case 'ref':
      return 'select';
    case 'bool':
      return 'switch';
    case 'long':
    case 'json':
      return 'textarea';
    case 'number':
    case 'money':
      return 'number';
    case 'email':
      return 'email';
    default:
      return 'text';
  }
}

/** How wide an editor is: a number or a date is short, a status mid, a reference wider. */
function widthOf(type: RecordsColumnType): string | null {
  switch (type) {
    case 'number':
    case 'money':
    case 'date':
    case 'datetime':
      return 'record-fields__short';
    case 'status':
      return 'record-fields__mid';
    case 'ref':
      return 'record-fields__ref';
    default:
      return null;
  }
}

/**
 * The fields of a record of the admin application (L2-282 AC3): each a label and its value drawn
 * by its type, as the tables draw them; long text and JSON keep their line breaks.
 *
 *     <dl jb-record-fields [fields]="fields()" [values]="record.values"></dl>
 *
 * While `loading`, six rows of skeletons stand in. While `editing` (L2-283 AC1), each field named
 * in `editable` is the editor of its type, labelled by its field: a text field (e-mail for an
 * e-mail), a number field, a select of `choices` for a status or a reference, a switch for yes and
 * no and a text area for long text and JSON. It shows the `draft` values, says each of `errors`
 * under its editor and emits `edited` as a value changes; the other fields read as before.
 *
 *     <dl jb-record-fields editing [fields]="fields()" [values]="record.values"
 *       [editable]="['status', 'reply']" [draft]="draft()" [choices]="choices()"
 *       [errors]="errors()" (edited)="change($event)"></dl>
 */
@Component({
  selector: 'dl[jb-record-fields]',
  imports: [RouterLink, FieldError, Icon, Input, Select, Skeleton, StatusPill, Switch, Textarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'record-fields', '[class.record-fields--editing]': 'editing()' },
  templateUrl: './record-fields.html',
  styleUrl: './record-fields.scss',
})
export class RecordFields {
  readonly fields = input<readonly RecordsColumn[]>([]);
  readonly values = input<Readonly<Record<string, unknown>>>({});
  readonly loading = input(false, { transform: booleanAttribute });
  readonly editing = input(false, { transform: booleanAttribute });
  /** The keys of the fields that become editors. */
  readonly editable = input<readonly string[]>([]);
  /** The values the editors show, in their wire form. */
  readonly draft = input<Readonly<Record<string, string | null>>>({});
  /** The choices of each select editor, by field key. */
  readonly choices = input<Readonly<Record<string, readonly RecordChoice[]>>>({});
  /** What is wrong with each field, by key, after a refusal (L2-283 AC2). */
  readonly errors = input<Readonly<Record<string, string>>>({});

  readonly edited = output<RecordEdit>();

  protected readonly skeletons = [0, 1, 2, 3, 4, 5];

  protected readonly rows = computed(() => {
    const editable = new Set(this.editing() ? this.editable() : []);
    return this.fields().map((field) => ({
      field,
      id: `f-${field.key}`,
      editor: editable.has(field.key) ? editorOf(field.type) : null,
      width: widthOf(field.type),
      mono: field.type === 'mono' || field.type === 'json',
      cell: cellOf(field.type, this.values()[field.key]),
    }));
  });

  protected valueOf(key: string): string {
    return this.draft()[key] ?? '';
  }

  protected edit(key: string, value: string | null): void {
    this.edited.emit({ key, value });
  }

  protected typed(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }
}
