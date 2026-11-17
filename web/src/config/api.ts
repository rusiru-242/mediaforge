/**
 * MediaForge Frontend API Configuration
 *
 * Centralized API base URL and endpoints configuration for all media features:
 * Downloader, Video/Audio/Image Conversion, Batch Processing, File Uploads,
 * Job Tracking, and System Health.
 */

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const isProduction = process.env.NODE_ENV === 'production';

const developmentApiBaseUrl =
  process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:8081/api/v1';
const apiBaseUrl = configuredApiBaseUrl || developmentApiBaseUrl;

if (!apiBaseUrl) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL must be set for production builds.');
}

let parsedApiUrl: URL;

try {
  parsedApiUrl = new URL(apiBaseUrl);
} catch {
  throw new Error('NEXT_PUBLIC_API_BASE_URL must be an absolute HTTP(S) URL.');
}

if (
  !['http:', 'https:'].includes(parsedApiUrl.protocol) ||
  parsedApiUrl.username ||
  parsedApiUrl.password ||
  parsedApiUrl.search ||
  parsedApiUrl.hash
) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL must be an HTTP(S) URL without credentials, query, or fragment.');
}

if (isProduction && parsedApiUrl.protocol !== 'https:') {
  throw new Error('NEXT_PUBLIC_API_BASE_URL must use HTTPS for production builds.');
}

export const API_BASE_URL = apiBaseUrl.replace(/\/+$/, '');
export const API_ORIGIN = parsedApiUrl.origin;

// Swagger / OpenAPI interactive documentation URL
export const BACKEND_HOST: string = API_ORIGIN;
export const SWAGGER_DOCS_URL: string = `${BACKEND_HOST}/swagger-ui.html`;

// Extract port for UI indicators and debugging
export const BACKEND_PORT: string =
  parsedApiUrl.port || (parsedApiUrl.protocol === 'https:' ? '443' : '80');

