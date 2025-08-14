// app.module.ts - Korrekte Module-Konfiguration
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { DocumentAnalysisComponent } from './document-analysis/document-analysis.component';
import { DocumentAnalysisService } from './document-analysis/document-analysis.service';

@NgModule({
  declarations: [
    AppComponent,
    DocumentAnalysisComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ReactiveFormsModule,
    BrowserAnimationsModule
  ],
  providers: [
    DocumentAnalysisService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }