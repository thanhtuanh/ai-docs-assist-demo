// src/app/app.module.ts
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';

// Components
import { AppComponent } from './app.component';
import { DocumentAnalysisComponent } from './document-analysis/document-analysis.component';
import { DocumentSummaryComponent } from './document-summary/document-summary.component';
import { DocumentUploadComponent } from './document-upload/document-upload.component';
import { FeedbackComponent } from './feedback/feedback.component';

// Services
import { FeedbackService } from './feedback.service';
import { IndustryService } from './services/industry.service';

@NgModule({
  declarations: [
    AppComponent,
    DocumentUploadComponent,
    DocumentSummaryComponent,
    DocumentAnalysisComponent,
    FeedbackComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    AppRoutingModule
  ],
  providers: [
    FeedbackService,
    IndustryService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }