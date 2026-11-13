import {
  ApiErrorResponse,
  BatchConversionRequest,
  BatchConversionResponse,
  ConversionCreateRequest,
  ConversionProgressResponse,
  ConversionResponse,
  DownloadCreateRequest,
  DownloadResponse,
  DownloadValidateRequest,
  DownloadValidateResponse,
  FileMetadataResponse,
  FileUploadResponse,
  FormatListResponse,
  HealthResponse,
  JobResponse,
  JobStatus,
  PageResponse,
  SupportedFormatsResponse,
} from '@/types/api';
import { API_BASE_URL } from '@/config/api';

export class ApiError extends Error {
  status: number;
  code: string;
  validationErrors?: Record<string, string>;

  constructor(status: number, code: string, message: string, validationErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.validationErrors = validationErrors;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options?.headers,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      let errorData: any = null;
      try {
        errorData = await res.json();
      } catch {
        // Not JSON
      }

      if (errorData) {
        const errorMsg =
          errorData.detail || errorData.message || errorData.error || res.statusText || 'Request failed';
        const errorCode = errorData.code || errorData.title || 'HTTP_' + res.status;
        throw new ApiError(res.status, errorCode, errorMsg, errorData.validationErrors || errorData.errors);
      }

      throw new ApiError(res.status, 'HTTP_ERROR', `HTTP error ${res.status}: ${res.statusText}`);
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Network failure connecting to backend';
    throw new ApiError(0, 'NETWORK_ERROR', `Unable to reach MediaForge backend at ${API_BASE_URL}. (${message})`);
  }
}

export const apiClient = {
  // Health
  checkHealth: () => request<HealthResponse>('/health'),
  getHealth: () => request<HealthResponse>('/health'),

  // Formats Catalog
  getSupportedFormats: () => request<SupportedFormatsResponse>('/formats'),
  getAllFormats: () => request<Record<string, string[]>>('/formats'),
  getVideoFormats: () => request<FormatListResponse>('/formats/video'),
  getAudioFormats: () => request<FormatListResponse>('/formats/audio'),
  getImageFormats: () => request<FormatListResponse>('/formats/image'),

  // Downloader
  validateDownloadUrl: (req: DownloadValidateRequest) =>
    request<DownloadValidateResponse>('/downloads/validate', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  getMediaMetadata: (req: DownloadValidateRequest) =>
    request<import('@/types/api').MediaMetadataResponse>('/downloads/metadata', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  getDownloadFormats: (url?: string) => {
    const query = url ? `?url=${encodeURIComponent(url)}` : '';
    return request<import('@/types/api').MediaFormatOptionDto[]>(`/downloads/formats${query}`);
  },

  createDownloadJob: (req: DownloadCreateRequest) =>
    request<JobResponse>('/downloads', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  createDownload: (req: DownloadCreateRequest) =>
    request<DownloadResponse>('/downloads', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  // Converter
  createConversionJob: (req: ConversionCreateRequest) =>
    request<JobResponse>('/conversions', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  createConversion: (req: ConversionCreateRequest) =>
    request<ConversionResponse>('/conversions', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  createBatchConversion: (req: BatchConversionRequest) =>
    request<BatchConversionResponse>('/conversions/batch', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  getConversionFormats: () =>
    request<{ videoFormats: string[]; audioFormats: string[]; imageFormats: string[] }>('/conversions/formats'),
  getBatchZipUrl: (batchId: string) => `${API_BASE_URL}/conversions/batch/${batchId}/zip`,

  // Jobs
  getJobById: (id: string) => request<JobResponse>(`/jobs/${id}`),
  getJobProgress: (id: string) => request<ConversionProgressResponse>(`/jobs/${id}/progress`),

  listJobs: (
    optionsOrStatus?: { page?: number; size?: number; status?: JobStatus } | JobStatus,
    pageParam = 0,
    sizeParam = 20
  ) => {
    let page = pageParam;
    let size = sizeParam;
    let status: JobStatus | undefined;

    if (typeof optionsOrStatus === 'object' && optionsOrStatus !== null) {
      page = optionsOrStatus.page ?? 0;
      size = optionsOrStatus.size ?? 20;
      status = optionsOrStatus.status;
    } else if (typeof optionsOrStatus === 'string') {
      status = optionsOrStatus;
    }

    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (status) {
      params.append('status', status);
    }
    return request<PageResponse<JobResponse>>(`/jobs?${params.toString()}`);
  },

  cancelJob: (id: string) =>
    request<JobResponse>(`/jobs/${id}/cancel`, {
      method: 'POST',
    }),

  // Files
  uploadFile: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const url = `${API_BASE_URL}/files/upload`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        let errorData: any = null;
        try {
          errorData = await res.json();
        } catch {
          // Non-JSON error
        }
        const errorMsg =
          errorData?.detail || errorData?.message || errorData?.error || res.statusText || 'Upload failed';
        const errorCode = errorData?.code || 'UPLOAD_FAILED';
        throw new ApiError(res.status, errorCode, errorMsg, errorData?.validationErrors || errorData?.errors);
      }
      return (await res.json()) as FileUploadResponse;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Network failure during upload';
      throw new ApiError(0, 'UPLOAD_NETWORK_ERROR', `Failed to upload file to backend. (${message})`);
    }
  },

  getFileMetadata: (id: string) => request<FileMetadataResponse>(`/files/${id}/metadata`),
  getFileDownloadUrl: (fileId: string) => `${API_BASE_URL}/files/${fileId}/download`,
};

export const api = apiClient;
