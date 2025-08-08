import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module'; // ✅ Routing separat geregelt

import { AppComponent } from './app.component';
import { DocumentAnalysisComponent } from './document-analysis/document-analysis.component';
import { DocumentSummaryComponent } from './document-summary/document-summary.component';
import { DocumentUploadComponent } from './document-upload/document-upload.component';
import { FeedbackComponent } from './feedback/feedback.component';
import { FeedbackService } from './feedback.service';

@NgModule({
  declarations: [
    AppComponent,
    DocumentUploadComponent,
    DocumentSummaryComponent,
    FeedbackComponent,
    DocumentAnalysisComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    AppRoutingModule // ✅ Richtig eingebunden
  ],
  providers: [FeedbackService],
  bootstrap: [AppComponent]
})
export class AppModule { }
