import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DocumentService } from '../document.service';

@Component({
  selector: 'app-document-summary',
  templateUrl: './document-summary.component.html',
  styleUrls: ['./document-summary.component.css']
})
export class DocumentSummaryComponent implements OnInit {
  summary: string = '';
  keywords: string = '';
  suggestedComponents: string = '';

  constructor(
    private route: ActivatedRoute,
    private documentService: DocumentService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.documentService.getDocument(id.toString()).subscribe((data: any) => {
      this.summary = data.summary;
      this.keywords = data.keywords;
      this.suggestedComponents = data.suggestedComponents;
    });
  }
}
