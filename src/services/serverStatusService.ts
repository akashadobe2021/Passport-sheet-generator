import { ServerStatusResponse } from '../types/serverStatus';

export async function fetchServerStatus(): Promise<ServerStatusResponse> {
  const startTime = Date.now();
  try {
    const res = await fetch('/api/status', {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        timestamp: new Date().toISOString(),
        serverOnline: false,
        activeProvider: 'client',
        cloudinary: {
          configured: false,
          connected: false,
          message: `Server returned HTTP ${res.status}: ${errText.slice(0, 100)}`,
        },
        gemini: {
          configured: false,
          model: 'gemini-2.5-flash',
        },
        client: {
          ready: true,
          engine: 'High-Precision Edge-Inward Matting',
        },
      };
    }

    const data: ServerStatusResponse = await res.json();
    return data;
  } catch (err: any) {
    return {
      timestamp: new Date().toISOString(),
      serverOnline: false,
      activeProvider: 'client',
      cloudinary: {
        configured: false,
        connected: false,
        message: 'Could not connect to /api/status endpoint.',
        error: err?.message || String(err),
      },
      gemini: {
        configured: false,
        model: 'gemini-2.5-flash',
      },
      client: {
        ready: true,
        engine: 'High-Precision Edge-Inward Matting (Always Available)',
      },
    };
  }
}
