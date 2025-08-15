import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DocumentUploadComponent } from './document-upload/document-upload.component';
import { DocumentSummaryComponent } from './document-summary/document-summary.component';
import { DocumentAnalysisComponent } from './document-analysis/document-analysis.component';
import { AboutComponent } from './about/about.component';

// ✅ Services importieren, aber NICHT in declarations
import { DocumentAnalysisService } from './document-analysis/document-analysis.service';
import { ApiService } from './services/api.service';
import { IndustryService } from './services/industry.service';
import { FeedbackService } from './feedback.service';

@NgModule({
  declarations: [
    AppComponent,
    DocumentUploadComponent,    // ✅ Hauptkomponente
    DocumentSummaryComponent,
    DocumentAnalysisComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,          // ✅ Routing first
    HttpClientModule,
    FormsModule,               // ✅ Für ngModel
    ReactiveFormsModule,       // ✅ Für Reactive Forms
    BrowserAnimationsModule
  ],
  providers: [
    DocumentAnalysisService,   // ✅ Explicit provider
    ApiService,
    IndustryService,
    FeedbackService
  ],
  bootstrap: [AppComponent]    // ✅ Nur AppComponent
})
export class AppModule { }
