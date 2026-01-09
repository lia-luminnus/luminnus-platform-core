import express from 'express';
import OpenAI from 'openai';
import path from 'path';
import fs from 'fs/promises';
import {
  generateDocumentFromPrompt,
  generatePDF,
  generateExcel,
  generateCSV,
  getDownloadUrl
} from '../services/documentGenerator.js';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/documents/create
 * Generate documents (PDF, Excel, CSV) from natural language
 */
router.post('/create', async (req, res) => {
  try {
    const { prompt, format = 'pdf', data } = req.body;

    if (!prompt && !data) {
      return res.status(400).json({
        success: false,
        error: 'Either prompt or data is required'
      });
    }

    console.log(`📄 Document creation request: ${format}`);

    let result;

    if (data) {
      // Direct data provided
      if (format === 'pdf') {
        result = await generatePDF(data);
      } else if (format === 'excel') {
        result = await generateExcel(data);
      } else if (format === 'csv') {
        result = await generateCSV(data);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid format. Use: pdf, excel, or csv'
        });
      }

      result = {
        ...result,
        metadata: {
          format,
          generatedAt: new Date().toISOString(),
          source: 'direct-data'
        }
      };
    } else {
      // Generate from prompt using GPT
      result = await generateDocumentFromPrompt(prompt, format as any, openai);
    }

    const downloadUrl = getDownloadUrl(result.fileName);

    res.json({
      success: true,
      content: {
        type: 'document',
        data: {
          format,
          fileName: result.fileName,
          downloadUrl,
          metadata: result.metadata
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Error generating document:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/documents/download/:fileName
 * Download generated document
 */
router.get('/download/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(
      process.cwd(),
      'server',
      'data',
      'generated-docs',
      fileName
    );

    // Security: Check if file exists and is in correct directory
    const fileExists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);

    if (!fileExists) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Determine content type
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.xlsx') {
      contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (ext === '.csv') contentType = 'text/csv';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const fileBuffer = await fs.readFile(filePath);
    res.send(fileBuffer);
  } catch (error: any) {
    console.error('❌ Error downloading file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/documents/list
 * List all generated documents
 */
router.get('/list', async (req, res) => {
  try {
    const docsDir = path.join(process.cwd(), 'server', 'data', 'generated-docs');
    const files = await fs.readdir(docsDir).catch(() => []);

    const documents = await Promise.all(
      files.map(async (fileName) => {
        const filePath = path.join(docsDir, fileName);
        const stats = await fs.stat(filePath);
        const ext = path.extname(fileName).toLowerCase();

        let format = 'unknown';
        if (ext === '.pdf') format = 'pdf';
        else if (ext === '.xlsx') format = 'excel';
        else if (ext === '.csv') format = 'csv';

        return {
          fileName,
          format,
          size: stats.size,
          createdAt: stats.birthtime,
          downloadUrl: getDownloadUrl(fileName)
        };
      })
    );

    res.json({
      success: true,
      documents: documents.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )
    });
  } catch (error: any) {
    console.error('❌ Error listing documents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/documents/:fileName
 * Delete generated document
 */
router.delete('/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(
      process.cwd(),
      'server',
      'data',
      'generated-docs',
      fileName
    );

    await fs.unlink(filePath);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ Error deleting document:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export function setupDocumentRoutes(app: any) {
  app.use('/api/documents', router);
}
