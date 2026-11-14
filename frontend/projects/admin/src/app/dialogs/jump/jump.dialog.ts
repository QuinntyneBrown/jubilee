import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ADMIN_TABLES_API, AdminJump } from 'api';
import { CommandPalette, PaletteItem } from 'components';
import { catchError, debounce, distinctUntilChanged, map, of, switchMap, timer } from 'rxjs';
import { AdminCatalogService } from '../../services/admin-catalog.service';

/** With nothing typed, the first ten tables; with text, up to eight tables, then records (L2-273). */
const FIRST_TABLES = 10;
const MATCHING_TABLES = 8;

/**
 * "Jump to" (L2-273): the tables the staff member may read, matched in the browser by name or
 * group from the catalog the shell holds, then the records the server finds for the text with the
 * staff session (AC6). Choosing one opens it and closes the palette.
 */
@Component({
  selector: 'jb-jump-dialog',
  imports: [CommandPalette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './jump.dialog.html',
})
export class JumpDialog {
  private readonly api = inject(ADMIN_TABLES_API);
  private readonly catalog = inject(AdminCatalogService);
  private readonly router = inject(Router);
  private readonly dialogRef = inject(DialogRef<void>);

  protected readonly text = signal('');
  private readonly records = signal<{ text: string; found: AdminJump[] }>({ text: '', found: [] });

  protected readonly items = computed<PaletteItem[]>(() => {
    const text = this.text().trim().toLowerCase();
    const tables = this.catalog
      .tables()
      .filter(
        (t) =>
          !text || t.label.toLowerCase().includes(text) || t.group.toLowerCase().includes(text),
      )
      .slice(0, text ? MATCHING_TABLES : FIRST_TABLES)
      .map<PaletteItem>((t) => ({
        kind: 'table',
        label: t.label,
        meta: t.group,
        link: `/${t.key}`,
      }));
    const records = this.records();
    const found =
      text && records.text.toLowerCase() === text
        ? records.found.map<PaletteItem>((r) => ({
            kind: 'record',
            label: r.name,
            meta: `${r.singular} · ${r.id}`,
            link: `/${r.table}/${encodeURIComponent(r.id)}`,
          }))
        : [];
    return [...tables, ...found];
  });

  /** The text has changed and its records have not come back yet. */
  protected readonly pending = computed(() => {
    const text = this.text().trim().toLowerCase();
    return text !== '' && this.records().text.toLowerCase() !== text;
  });

  constructor() {
    toObservable(this.text)
      .pipe(
        map((text) => text.trim()),
        // A pause in typing, timed by a timer rather than by reading the clock.
        debounce((text) => timer(text ? 150 : 0)),
        distinctUntilChanged(),
        switchMap((text) =>
          text
            ? this.api.jump(text).pipe(
                map((found) => ({ text, found })),
                // A failed search lists the tables alone; the next keystroke asks again.
                catchError(() => of({ text, found: [] as AdminJump[] })),
              )
            : of({ text, found: [] as AdminJump[] }),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((records) => this.records.set(records));
  }

  protected go(item: PaletteItem): void {
    this.dialogRef.close();
    void this.router.navigateByUrl(item.link);
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
