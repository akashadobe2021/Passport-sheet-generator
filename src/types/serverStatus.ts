export interface ServerStatusResponse {
  timestamp: string;
  serverOnline: boolean;
  activeProvider: 'cloudinary' | 'gemini' | 'client';
  cloudinary: {
    configured: boolean;
    connected: boolean;
    cloudName?: string;
    authSuccess?: boolean;
    addonStatus?: 'available' | 'addon_not_enabled' | 'unknown' | 'error';
    message?: string;
    latencyMs?: number;
    error?: string;
  };
  gemini: {
    configured: boolean;
    model: string;
  };
  client: {
    ready: boolean;
    engine: string;
  };
}
