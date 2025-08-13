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
// AboutComponent is standalone, so we import it in routing instead

// Services
import { ApiService } from './services/api.service';
import { DocumentService } from './document.service';
import { IndustryService } from './services/industry.service';
import { FeedbackService } from './feedback.service';
import { TextPreprocessingService } from './services/text-preprocessing.service';

@NgModule({
  declarations: [
    AppComponent,
    DocumentUploadComponent,
    DocumentSummaryComponent,
    DocumentAnalysisComponent,
    FeedbackComponent
    // AboutComponent removed - it's standalone
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    AppRoutingModule
  ],
  providers: [
    ApiService,
    DocumentService,
    IndustryService,
    FeedbackService,
    TextPreprocessingService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }