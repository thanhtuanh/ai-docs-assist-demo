import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DocumentUploadComponent } from './document-upload/document-upload.component';
import { DocumentSummaryComponent } from './document-summary/document-summary.component';
import { DocumentAnalysisComponent } from './document-analysis/document-analysis.component';
import { AboutComponent } from './about/about.component';

const routes: Routes = [
  { path: '', component: DocumentUploadComponent, pathMatch: 'full' },
  { path: 'about', component: AboutComponent },
  { path: 'summary/:id', component: DocumentSummaryComponent },
  { path: 'analysis', component: DocumentAnalysisComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
