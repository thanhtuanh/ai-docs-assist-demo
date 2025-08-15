import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { enableProdMode } from '@angular/core';

if (environment.production) {
  enableProdMode();
}

// ✅ Einfacher Bootstrap ohne Duplikate
platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error('Bootstrap Error:', err));