import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Configure Cloudinary if environment variables are provided
const hasCloudinaryUrl = Boolean(process.env.CLOUDINARY_URL);
const hasCloudinaryKeys = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);
const isCloudinaryConfigured = hasCloudinaryUrl || hasCloudinaryKeys;

if (hasCloudinaryUrl) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
    secure: true,
  });
} else if (hasCloudinaryKeys) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// JSON parser with larger limit for base64 images
app.use(express.json({ limit: '25mb' }));

// Service capability status endpoint
app.get('/api/background-service-status', (_req, res) => {
  res.json({
    cloudinaryConfigured: isCloudinaryConfigured,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

/**
 * Cloudinary AI Background Removal helper
 */
async function removeBgWithCloudinary(dataUriOrBase64: string): Promise<string | null> {
  if (!isCloudinaryConfigured) return null;

  try {
    const formattedDataUri = dataUriOrBase64.startsWith('data:')
      ? dataUriOrBase64
      : `data:image/jpeg;base64,${dataUriOrBase64}`;

    // Upload to Cloudinary with background removal effect
    const uploadRes = await cloudinary.uploader.upload(formattedDataUri, {
      folder: 'passport_app',
      background_removal: 'cloudinary_ai',
      format: 'png',
      transformation: [{ effect: 'background_removal' }],
    });

    if (uploadRes && (uploadRes.secure_url || uploadRes.url)) {
      // Cloudinary URL with background removal applied
      let transparentUrl = uploadRes.secure_url || uploadRes.url;
      if (!transparentUrl.includes('e_background_removal') && uploadRes.public_id) {
        transparentUrl = cloudinary.url(uploadRes.public_id, {
          effect: 'background_removal',
          format: 'png',
          secure: true,
        });
      }

      // Fetch the transparent image directly to return as data URL
      const fetchRes = await fetch(transparentUrl);
      if (fetchRes.ok) {
        const arrayBuf = await fetchRes.arrayBuffer();
        const base64Png = Buffer.from(arrayBuf).toString('base64');
        return `data:image/png;base64,${base64Png}`;
      }
    }
  } catch (err: any) {
    console.warn('Cloudinary AI Background Removal call returned:', err?.message || err);
  }
  return null;
}

// Multi-tier Background Removal Route
// Tier 1: Cloudinary AI Background Removal (if configured)
// Tier 2: Gemini 2.5 Flash Vision Portrait Silhouette Segmentation
// Tier 3: Client-side Edge-Inward Matting (handled on client upon fallback)
app.post('/api/remove-background', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', preferMethod } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const dataUri = `data:${mimeType};base64,${cleanBase64}`;

    // 1. Try Cloudinary if requested or configured
    if (isCloudinaryConfigured) {
      const cloudinaryCutout = await removeBgWithCloudinary(dataUri);
      if (cloudinaryCutout) {
        return res.json({
          success: true,
          method: 'cloudinary',
          cutoutDataUrl: cloudinaryCutout,
        });
      }
    }

    // 2. Try Gemini Vision Portrait Silhouette Segmentation
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
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
          return res.json({
            success: true,
            method: 'gemini',
            segmentation: parsedData,
          });
        }
      } catch (geminiErr: any) {
        console.warn('Gemini segmentation failed:', geminiErr?.message || geminiErr);
      }
    }

    // 3. Fallback indication for client
    return res.json({
      success: false,
      method: 'client_fallback',
      message: 'Server methods unavailable, using high-precision client matting.',
    });
  } catch (error: any) {
    console.error('Background removal server error:', error);
    return res.status(500).json({
      error: 'Failed to process background removal',
      message: error?.message || 'Internal server error',
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Development mode with Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
