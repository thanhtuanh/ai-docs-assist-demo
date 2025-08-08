import { Component } from '@angular/core';

@Component({
    selector: 'app-root',
    template: `
    <div class="app-container">
      <nav>
     <!--   <a routerLink="/upload">Upload Document</a> -->
      </nav>
      <router-outlet></router-outlet>
    </div>
  `,
    styles: [`
    .app-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    nav a {
      margin-right: 10px;
      text-decoration: none;
      color: #007bff;
    }
    nav a:hover {
      text-decoration: underline;
    }
  `]
})
export class AppComponent {
    title = 'ai-doc-assist-frontend';
}