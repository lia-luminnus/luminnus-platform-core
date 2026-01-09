import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { ToolService } from '../services/toolService.js';
import { analisarImagem } from '../services/imageAnalysis.js';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const upload = multer({ storage: multer.memoryStorage() });

/**
 * v1.0.0 - Multimodal Routes Refactored to use ToolService
 */

// Helper to execute tool and return response
async function executeToolRequest(req: any, res: any, toolName: string, defaultArgs: any = {}) {
  try {
    const { message, userId, tenantId } = req.body;
    const finalUserId = userId || '00000000-0000-0000-0000-000000000001';
    const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';

    console.log(`🎨 [Multimodal] Executing ${toolName} for message: ${message?.substring(0, 50)}...`);

    const result = await ToolService.execute(toolName, { ...defaultArgs, prompt: message }, {
      userId: finalUserId,
      tenantId: finalTenantId
    });

    res.json({ success: true, content: { type: toolName === 'generateImage' ? 'image' : 'data', data: result } });
  } catch (error: any) {
    console.error(`❌ Erro em ${toolName}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// POST /api/generateChart
router.post('/generateChart', (req, res) => executeToolRequest(req, res, 'generateChart'));

// POST /api/generateTable
router.post('/generateTable', (req, res) => executeToolRequest(req, res, 'generateTable'));

// POST /api/generateImage
router.post('/generateImage', (req, res) => executeToolRequest(req, res, 'generateImage'));

// POST /api/multimodal/analyze - Upload and analyze files with context
router.post('/multimodal/analyze', upload.single('file'), async (req, res) => {
  try {
    const { userMessage, analysisType = 'auto', userId, tenantId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const finalUserId = userId || '00000000-0000-0000-0000-000000000001';
    const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';

    console.log(`📤 Analyzing uploaded file: ${file.originalname} (${file.mimetype})`);

    // Check if it's an image for the direct analysis service
    if (file.mimetype.startsWith('image/')) {
      const imageData = file.buffer.toString('base64');
      const mimeType = file.mimetype;

      const analysis = await (analisarImagem as any)({
        imageData: { base64: imageData, mimeType: mimeType },
        userMessage: userMessage || 'Faça uma análise técnica detalhada desta imagem',
        analysisType
      });

      return res.json({
        success: true,
        content: {
          type: 'analysis',
          data: {
            fileName: file.originalname,
            analysisType: analysis.type,
            analysis: analysis.analysis,
            suggestions: analysis.suggestions,
            metadata: analysis.metadata
          }
        }
      });
    }

    // fallback for other files or if handled by different service
    res.status(400).json({ success: false, error: 'File type not yet supported in this endpoint. Use /api/vision/analyze for documents.' });

  } catch (error: any) {
    console.error('❌ Error analyzing file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export function setupMultimodalRoutes(app: any) {
  app.use('/api', router);
}
