/**
 * MediaForge Frontend API Configuration
 *
 * Centralized API base URL and endpoints configuration for all media features:
 * Downloader, Video/Audio/Image Conversion, Batch Processing, File Uploads,
 * Job Tracking, and System Health.
 */

export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081/api/v1';

// Base backend host without API prefix (e.g. http://localhost:8081)
export const BACKEND_HOST: string = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

// Swagger / OpenAPI interactive documentation URL
export const SWAGGER_DOCS_URL: string = `${BACKEND_HOST}/swagger-ui.html`;

// Extract port for UI indicators and debugging
export const BACKEND_PORT: string = (() => {
  try {
    const parsed = new URL(API_BASE_URL);
    return parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  } catch {
    return '8081';
  }
})();
