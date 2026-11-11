import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  input,
  output,
} from '@angular/core';

/** The part of Cloudflare Turnstile this component uses. */
interface Turnstile {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      appearance: 'interaction-only';
      theme: 'auto';
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ): string;
  reset(widget: string): void;
  remove(widget: string): void;
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<Turnstile> | null = null;

/** Loads the Turnstile script once for the page. */
function load(document: Document): Promise<Turnstile> {
  loading ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => {
      const turnstile = (document.defaultView as { turnstile?: Turnstile } | null)?.turnstile;
      if (turnstile) resolve(turnstile);
      else reject(new Error('Turnstile did not load.'));
    };
    script.onerror = () => {
      loading = null;
      reject(new Error('Turnstile did not load.'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * The privacy-respecting bot challenge of a form (L2-137 AC2), Cloudflare Turnstile:
 *
 *     <jb-bot-challenge [siteKey]="key" (token)="challenge.set($event)" #challenge />
 *
 * It shows nothing unless Cloudflare needs the visitor to do something, and then shows Cloudflare's
 * own accessible widget. `token` gives the token to send with the form, and `null` when it expired
 * or could not be made. After a refused submission call `reset()` for a fresh token.
 */
@Component({
  selector: 'jb-bot-challenge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bot-challenge' },
  templateUrl: './bot-challenge.html',
  styleUrl: './bot-challenge.scss',
})
export class BotChallenge implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private turnstile: Turnstile | null = null;
  private widget: string | null = null;

  readonly siteKey = input.required<string>();
  readonly token = output<string | null>();

  constructor() {
    afterNextRender(() => {
      load(this.document)
        .then((turnstile) => {
          this.turnstile = turnstile;
          this.widget = turnstile.render(this.host.nativeElement, {
            sitekey: this.siteKey(),
            appearance: 'interaction-only',
            theme: 'auto',
            callback: (token) => this.token.emit(token),
            'expired-callback': () => this.token.emit(null),
            'error-callback': () => this.token.emit(null),
          });
        })
        .catch(() => this.token.emit(null));
    });
  }

  /** Asks for a fresh token: one token passes one check. */
  reset(): void {
    if (this.turnstile && this.widget !== null) this.turnstile.reset(this.widget);
  }

  ngOnDestroy(): void {
    if (this.turnstile && this.widget !== null) this.turnstile.remove(this.widget);
  }
}
