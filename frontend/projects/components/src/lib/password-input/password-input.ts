import { ChangeDetectionStrategy, Component, contentChild, effect, signal } from '@angular/core';
import { Icon } from '../icon/icon';
import { Input } from '../input/input';

/**
 * A password control with the button that shows what was typed:
 *
 *     <div jb-field label="Password" controlId="password">
 *       <jb-password-input>
 *         <input jb-input name="password" type="password" autocomplete="current-password" />
 *       </jb-password-input>
 *     </div>
 *
 * The button is named for what it will do, "Show password" then "Hide password". It only changes
 * the `type` of the control: the value, the focus and the form stay as they are (L2-187).
 */
@Component({
  selector: 'jb-password-input',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'password-input' },
  templateUrl: './password-input.html',
  styleUrl: './password-input.scss',
})
export class PasswordInput {
  private readonly control = contentChild.required(Input);
  /** True while the password is shown as typed. */
  protected readonly shown = signal(false);

  constructor() {
    effect(() => {
      this.control().element.type = this.shown() ? 'text' : 'password';
    });
  }

  protected toggle(): void {
    this.shown.update((shown) => !shown);
  }
}
