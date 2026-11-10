import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'jb-root',
  imports: [RouterOutlet],
  template: `<main id="main" tabindex="-1"><router-outlet /></main>`,
})
export class App {}
