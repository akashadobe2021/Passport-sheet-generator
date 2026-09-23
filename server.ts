import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Setup Cloudinary Configuration helper
function getCloudinaryConfig() {
  const hasUrl = Boolean(process.env.CLOUDINARY_URL);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const hasKeys = Boolean(cloudName && apiKey && apiSecret);

  if (hasUrl) {
    cloudinary.config({
      cloudinary_url: process.env.CLOUDINARY_URL,
      secure: true,
    });
    return { configured: true, type: 'url' as const, cloudName: cloudName || 'configured-via-url' };
  } else if (hasKeys) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    return { configured: true, type: 'keys' as const, cloudName };
  }
  return { configured: false, type: 'none' as const, cloudName: undefined };
}

// Initialize config
getCloudinaryConfig();

// JSON parser with larger limit for base64 images
app.use(express.json({ limit: '25mb' }));

/**
 * Diagnostic & Live Connection Status Endpoint
 * Verifies Cloudinary API ping, Gemini API key, and server health.
 */
app.get(['/api/status', '/api/background-service-status'], async (_req, res) => {
  const startTime = Date.now();
  const cloudConfig = getCloudinaryConfig();

  let cloudinaryConnected = false;
  let cloudinaryLatencyMs = 0;
  let cloudinaryError: string | undefined;
  let cloudinaryAddonStatus: 'available' | 'addon_not_enabled' | 'unknown' | 'error' = 'unknown';
  let cloudinaryMessage = 'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET or CLOUDINARY_URL.';

  if (cloudConfig.configured) {
    try {
      const pingStart = Date.now();
      const pingRes = await cloudinary.api.ping();
      cloudinaryLatencyMs = Date.now() - pingStart;

      if (pingRes && pingRes.status === 'ok') {
        cloudinaryConnected = true;
        cloudinaryMessage = `Connected to Cloudinary API (${cloudConfig.cloudName}) in ${cloudinaryLatencyMs}ms.`;
        cloudinaryAddonStatus = 'available';
      } else {
        cloudinaryMessage = `Cloudinary API returned unexpected status: ${JSON.stringify(pingRes)}`;
      }
    } catch (err: any) {
      cloudinaryConnected = false;
      cloudinaryError = err?.message || String(err);
      cloudinaryMessage = `Cloudinary connection failed: ${cloudinaryError}`;
      if (cloudinaryError?.toLowerCase().includes('addon') || cloudinaryError?.toLowerCase().includes('background')) {
        cloudinaryAddonStatus = 'addon_not_enabled';
      } else {
        cloudinaryAddonStatus = 'error';
      }
    }
  }

  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);

  let activeProvider: 'cloudinary' | 'gemini' | 'client' = 'client';
  if (cloudinaryConnected) {
    activeProvider = 'cloudinary';
  } else if (geminiConfigured) {
    activeProvider = 'gemini';
  }

  res.json({
    timestamp: new Date().toISOString(),
    serverOnline: true,
    activeProvider,
    cloudinary: {
      configured: cloudConfig.configured,
      connected: cloudinaryConnected,
      cloudName: cloudConfig.cloudName ? `${cloudConfig.cloudName.slice(0, 3)}***` : undefined,
      authSuccess: cloudinaryConnected,
      addonStatus: cloudinaryAddonStatus,
      message: cloudinaryMessage,
      latencyMs: cloudinaryLatencyMs,
      error: cloudinaryError,
    },
    gemini: {
      configured: geminiConfigured,
      model: 'gemini-2.5-flash',
    },
    client: {
      ready: true,
      engine: 'High-Precision Edge-Inward Matting (Zero-Data-Loss)',
    },
    totalDurationMs: Date.now() - startTime,
  });
});

/**
 * Cloudinary AI Background Removal helper
 */
async function removeBgWithCloudinary(dataUriOrBase64: string): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
  const cloudConfig = getCloudinaryConfig();
  if (!cloudConfig.configured) {
    return { success: false, error: 'Cloudinary credentials are not configured in environment.' };
  }

  try {
    const formattedDataUri = dataUriOrBase64.startsWith('data:')
      ? dataUriOrBase64
      : `data:image/jpeg;base64,${dataUriOrBase64}`;

    // Upload with background removal effect
    const uploadRes = await cloudinary.uploader.upload(formattedDataUri, {
      folder: 'passport_app',
      background_removal: 'cloudinary_ai',
      format: 'png',
      transformation: [{ effect: 'background_removal' }],
    });

    if (uploadRes && (uploadRes.secure_url || uploadRes.url)) {
      let transparentUrl = uploadRes.secure_url || uploadRes.url;
      if (!transparentUrl.includes('e_background_removal') && uploadRes.public_id) {
        transparentUrl = cloudinary.url(uploadRes.public_id, {
          effect: 'background_removal',
          format: 'png',
          secure: true,
        });
      }

      const fetchRes = await fetch(transparentUrl);
      if (fetchRes.ok) {
        const arrayBuf = await fetchRes.arrayBuffer();
        const base64Png = Buffer.from(arrayBuf).toString('base64');
        return { success: true, dataUrl: `data:image/png;base64,${base64Png}` };
      }
    }
    return { success: false, error: 'Cloudinary upload succeeded but could not retrieve transparent image.' };
  } catch (err: any) {
    console.warn('Cloudinary AI Background Removal error:', err?.message || err);
    return { success: false, error: err?.message || 'Cloudinary background removal failed' };
  }
}

/**
 * Gemini Vision AI Portrait Silhouette Segmentation helper
 */
async function removeBgWithGemini(cleanBase64: string, mimeType: string): Promise<{ success: boolean; segmentation?: any; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'GEMINI_API_KEY is not configured.' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: `You are an expert portrait segmentation AI for official passport photos.
Analyze the human subject in this photo.
Identify the precise silhouette boundary of the person including their hair, face, neck, ears, and clothing/shoulders.
Return a JSON object with:
1. "personFound": true/false
2. "headBoundingBox": {"top": number, "bottom": number, "left": number, "right": number} (values 0.0 to 1.0 normalized)
3. "faceBox": {"top": number, "bottom": number, "left": number, "right": number} (values 0.0 to 1.0 normalized)
4. "shoulderBox": {"top": number, "bottom": number, "left": number, "right": number} (values 0.0 to 1.0 normalized)
5. "polygonPoints": Array of {"x": number, "y": number} outlining the exact person boundary contour (from top hair around left shoulder, torso bottom, right shoulder, right hair back to top, with at least 35-50 points, normalized 0.0 to 1.0).
6. "dominantBgColor": Hex string of the backdrop.

Return ONLY valid JSON matching this structure without Markdown formatting.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText.trim());
    } catch {
      const cleaned = responseText.replace(/```json\n?/, '').replace(/```\n?/, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    if (parsedData && parsedData.polygonPoints && parsedData.polygonPoints.length > 5) {
      return { success: true, segmentation: parsedData };
    }
    return { success: false, error: 'Gemini did not return valid contour coordinates.' };
  } catch (err: any) {
    console.warn('Gemini vision segmentation error:', err?.message || err);
    return { success: false, error: err?.message || 'Gemini segmentation error' };
  }
}

// Background Removal Endpoint with Multi-Tier Execution
app.post('/api/remove-background', async (req, res) => {
  const { imageBase64, mimeType = 'image/jpeg' } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const dataUri = `data:${mimeType};base64,${cleanBase64}`;

  const cloudConfig = getCloudinaryConfig();

  // Tier 1: Try Cloudinary AI Background Removal
  if (cloudConfig.configured) {
    const cloudRes = await removeBgWithCloudinary(dataUri);
    if (cloudRes.success && cloudRes.dataUrl) {
      return res.json({
        success: true,
        method: 'cloudinary',
        cutoutDataUrl: cloudRes.dataUrl,
        message: 'Background successfully removed via Cloudinary AI',
      });
    } else {
      console.info('Cloudinary attempt failed or add-on not enabled, falling back to Gemini:', cloudRes.error);
    }
  }

  // Tier 2: Try Gemini 2.5 Flash Vision Portrait Segmentation
  if (process.env.GEMINI_API_KEY) {
    const geminiRes = await removeBgWithGemini(cleanBase64, mimeType);
    if (geminiRes.success && geminiRes.segmentation) {
      return res.json({
        success: true,
        method: 'gemini',
        segmentation: geminiRes.segmentation,
        message: 'Background successfully segmented via Gemini Vision AI',
      });
    }
  }

  // Tier 3: Client Fallback
  return res.json({
    success: false,
    method: 'client',
    message: 'Server AI engines offline or unconfigured. Performing instant client-side portrait matting.',
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Passport Sheet Studio server running on port ${PORT}`);
  });
}

startServer();
