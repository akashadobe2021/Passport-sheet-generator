import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { v2 as cloudinary } from 'cloudinary';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, mimeType = 'image/jpeg' } = req.body || {};

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const dataUri = `data:${mimeType};base64,${cleanBase64}`;

  // Configure Cloudinary
  const hasUrl = Boolean(process.env.CLOUDINARY_URL);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const isCloudinaryConfigured = hasUrl || Boolean(cloudName && apiKey && apiSecret);

  if (hasUrl) {
    cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL, secure: true });
  } else if (isCloudinaryConfigured) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  }

  // Tier 1: Try Cloudinary AI Background Removal
  if (isCloudinaryConfigured) {
    try {
      const uploadRes = await cloudinary.uploader.upload(dataUri, {
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
          return res.status(200).json({
            success: true,
            method: 'cloudinary',
            cutoutDataUrl: `data:image/png;base64,${base64Png}`,
            message: 'Background removed via Cloudinary AI on Vercel',
          });
        }
      }
    } catch (cloudErr: any) {
      console.warn('Vercel Cloudinary error, falling back to Gemini:', cloudErr?.message || cloudErr);
    }
  }

  // Tier 2: Try Gemini Vision Segmentation
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: cleanBase64 } },
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
        config: { responseMimeType: 'application/json' },
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
        return res.status(200).json({
          success: true,
          method: 'gemini',
          segmentation: parsedData,
          message: 'Background segmented via Gemini Vision AI on Vercel',
        });
      }
    } catch (geminiErr: any) {
      console.warn('Vercel Gemini error:', geminiErr?.message || geminiErr);
    }
  }

  // Tier 3: Client Fallback
  return res.status(200).json({
    success: false,
    method: 'client',
    message: 'Server engines unavailable on Vercel. Falling back to high-precision client matting.',
  });
}
