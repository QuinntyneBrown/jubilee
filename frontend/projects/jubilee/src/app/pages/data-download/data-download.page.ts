import { DOCUMENT, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ACCOUNT_DATA_API } from 'api';
import { EmptyState, Icon, Button } from 'components';

type View = 'downloading' | 'done' | 'unavailable';

/**
 * DataDownloadPage at /account/data/:token (L2-018): the page the e-mailed link opens. The member must be signed in as
 * the account that asked; the page takes the token off the address bar and hands the file to the browser.
 */
@Component({
  selector: 'jb-data-download-page',
  imports: [RouterLink, EmptyState, Icon, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-download.page.html',
})
export class DataDownloadPage implements OnInit {
  private readonly api = inject(ACCOUNT_DATA_API);
  private readonly document = inject(DOCUMENT);
  private readonly location = inject(Location);
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';

  protected readonly view = signal<View>('downloading');

  ngOnInit(): void {
    // A link stays in e-mail, not in history or a screenshot of the address bar.
    this.location.replaceState('/account/data');
    this.fetch();
  }

  protected fetch(): void {
    this.view.set('downloading');
    this.api.downloadDataExport(this.token).subscribe({
      next: (file) => {
        const url = URL.createObjectURL(file);
        const link = this.document.createElement('a');
        link.href = url;
        link.download = 'jubilee-data.json';
        link.click();
        URL.revokeObjectURL(url);
        this.view.set('done');
      },
      error: () => this.view.set('unavailable'),
    });
  }
}
