// app.component.ts - Root-Komponente
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <app-document-analysis></app-document-analysis>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem 0;
    }
  `]
})
export class AppComponent {
  title = 'AI Document Analysis';
}