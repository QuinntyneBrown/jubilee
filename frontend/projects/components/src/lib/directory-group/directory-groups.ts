import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The groups of the directory, side by side from the desktop layout: `<div jb-directory-groups>`. */
@Component({
  selector: 'div[jb-directory-groups]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dir-groups' },
  templateUrl: './directory-groups.html',
  styleUrl: './directory-groups.scss',
})
export class DirectoryGroups {}
