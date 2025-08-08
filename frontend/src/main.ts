import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { enableProdMode } from '@angular/core';

// ✅ Saubere Platform-Initialisierung
if (environment.production) {
    enableProdMode();
}

// ✅ Fehlerbehandlung für Platform-Konflikte
const bootstrap = () => {
    platformBrowserDynamic()
        .bootstrapModule(AppModule)
        .catch(err => console.error('Bootstrap Error:', err));
};

// ✅ Sicherstellen, dass DOM bereit ist
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}