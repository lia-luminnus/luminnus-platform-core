import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs/promises';
import path from 'path';

// Ensure output directory exists
const OUTPUT_DIR = path.join(process.cwd(), 'server', 'data', 'generated-docs');

async function ensureOutputDir() {
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating output directory:', error);
  }
}

// Initialize directory
ensureOutputDir();

/**
 * Generate PDF document
 */
export async function generatePDF(content: {
  title: string;
  sections: Array<{ heading?: string; text: string; isList?: boolean; items?: string[] }>;
}): Promise<{ filePath: string; fileName: string }> {
  const doc = new jsPDF();
  const fileName = `document_${Date.now()}.pdf`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  let yPosition = 20;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const lineHeight = 7;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(content.title, margin, yPosition);
  yPosition += 15;

  // Sections
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  for (const section of content.sections) {
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    // Section heading
    if (section.heading) {
      doc.setFont('helvetica', 'bold');
      doc.text(section.heading, margin, yPosition);
      yPosition += lineHeight;
      doc.setFont('helvetica', 'normal');
    }

    // Section text
    if (section.text) {
      const lines = doc.splitTextToSize(section.text, 170);
      for (const line of lines) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += lineHeight;
      }
    }

    // List items
    if (section.isList && section.items) {
      for (const item of section.items) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(`• ${item}`, margin + 5, yPosition);
        yPosition += lineHeight;
      }
    }

    yPosition += 5; // Space between sections
  }

  // Save file
  const pdfBuffer = doc.output('arraybuffer');
  await fs.writeFile(filePath, Buffer.from(pdfBuffer));

  return { filePath, fileName };
}

/**
 * Generate Excel spreadsheet
 */
export async function generateExcel(content: {
  sheetName: string;
  title: string;
  headers: string[];
  rows: any[][];
  includeChart?: boolean;
}): Promise<{ filePath: string; fileName: string }> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(content.sheetName || 'Sheet1');

  // Add title
  worksheet.mergeCells('A1', String.fromCharCode(64 + content.headers.length) + '1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = content.title;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF00F3FF' }
  };
  worksheet.getRow(1).height = 30;

  // Add headers
  worksheet.addRow(content.headers);
  const headerRow = worksheet.getRow(2);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4A4A4A' }
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 25;

  // Add data rows
  content.rows.forEach((row) => {
    worksheet.addRow(row);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column, index) => {
    let maxLength = content.headers[index]?.length || 10;
    content.rows.forEach((row) => {
      const cellValue = String(row[index] || '');
      if (cellValue.length > maxLength) {
        maxLength = cellValue.length;
      }
    });
    column.width = Math.min(maxLength + 5, 50);
  });

  // Add borders
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }
  });

  // Save file
  const fileName = `spreadsheet_${Date.now()}.xlsx`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  await workbook.xlsx.writeFile(filePath);

  return { filePath, fileName };
}

/**
 * Generate CSV file
 */
export async function generateCSV(content: {
  headers: string[];
  rows: any[][];
}): Promise<{ filePath: string; fileName: string }> {
  const csvContent = stringify([content.headers, ...content.rows], {
    header: false,
    quoted: true
  });

  const fileName = `data_${Date.now()}.csv`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  await fs.writeFile(filePath, csvContent, 'utf-8');

  return { filePath, fileName };
}

/**
 * Generate document based on GPT analysis
 */
export async function generateDocumentFromPrompt(
  prompt: string,
  format: 'pdf' | 'excel' | 'csv',
  openai: any
): Promise<{ filePath: string; fileName: string; metadata: any }> {
  console.log(`📄 Generating ${format.toUpperCase()} from prompt...`);

  // Use GPT to extract structured data
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a document data extractor. Based on the user's request, extract structured data for ${format} generation.
Return JSON only:
- For PDF: {"title": "...", "sections": [{"heading": "...", "text": "...", "isList": false, "items": []}]}
- For Excel/CSV: {"title": "...", "sheetName": "...", "headers": [...], "rows": [[...]]}

Make sure data is relevant and well-structured.`
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3
  });

  const jsonResponse = (completion.choices[0].message.content || '{}').trim();
  const data = JSON.parse(jsonResponse.replace(/```json\n?|\n?```/g, ''));

  let result;
  if (format === 'pdf') {
    result = await generatePDF(data);
  } else if (format === 'excel') {
    result = await generateExcel(data);
  } else if (format === 'csv') {
    result = await generateCSV(data);
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }

  return {
    ...result,
    metadata: {
      format,
      generatedAt: new Date().toISOString(),
      prompt: prompt.substring(0, 100)
    }
  };
}

/**
 * Get download URL for generated file
 */
export function getDownloadUrl(fileName: string): string {
  return `/api/documents/download/${fileName}`;
}
