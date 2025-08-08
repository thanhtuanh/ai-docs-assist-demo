package com.bits.aidocassist.util;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;

@Component
public class PdfProcessor {

    public static String extractTextFromPdf(File pdfFile) throws IOException {
        try (PDDocument document = PDDocument.load(pdfFile)) {
            PDFTextStripper pdfTextStripper = new PDFTextStripper();
            return pdfTextStripper.getText(document);
        }
    }
}