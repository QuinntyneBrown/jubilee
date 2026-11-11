import { ChangeDetectionStrategy, Component } from '@angular/core';

/** What stands between the messages of a thread, centred: the day, or "Show earlier messages". */
@Component({
  selector: 'li[jb-message-day]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'chat__day' },
  templateUrl: './message-day.html',
  styleUrl: './message-day.scss',
})
export class MessageDay {}
