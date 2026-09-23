import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();

  const hasUrl = Boolean(process.env.CLOUDINARY_URL);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const hasKeys = Boolean(cloudName && apiKey && apiSecret);
  const configured = hasUrl || hasKeys;

  if (hasUrl) {
    cloudinary.config({
      cloudinary_url: process.env.CLOUDINARY_URL,
      secure: true,
    });
  } else if (hasKeys) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  let cloudinaryConnected = false;
  let cloudinaryLatencyMs = 0;
  let cloudinaryError: string | undefined;
  let cloudinaryAddonStatus: 'available' | 'addon_not_enabled' | 'unknown' | 'error' = 'unknown';
  let cloudinaryMessage = 'Cloudinary credentials missing in Vercel Environment Variables.';

  if (configured) {
    try {
      const pingStart = Date.now();
      const pingRes = await cloudinary.api.ping();
      cloudinaryLatencyMs = Date.now() - pingStart;

      if (pingRes && pingRes.status === 'ok') {
        cloudinaryConnected = true;
        cloudinaryMessage = `Connected to Cloudinary API (${cloudName || 'URL-configured'}) in ${cloudinaryLatencyMs}ms.`;
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

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    serverOnline: true,
    activeProvider,
    cloudinary: {
      configured,
      connected: cloudinaryConnected,
      cloudName: cloudName ? `${cloudName.slice(0, 3)}***` : undefined,
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
}
