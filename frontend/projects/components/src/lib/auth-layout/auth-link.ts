import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The link under the form of Log in and Sign up, to the other screen:
 * `<a jb-auth-link routerLink="/join">Create a free account</a>`.
 */
@Component({
  selector: 'a[jb-auth-link]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'auth-link' },
  templateUrl: './auth-link.html',
  styleUrl: './auth-link.scss',
})
export class AuthLink {}
