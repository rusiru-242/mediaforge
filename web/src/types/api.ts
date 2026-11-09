export type JobType = 'DOWNLOAD' | 'CONVERSION';
export type SourceType = 'URL' | 'UPLOAD';
export type JobStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface JobResponse {
  id: string;
  userId?: string | null;
  jobType: JobType;
  sourceType?: SourceType;
  status: JobStatus;
  progress: number;
  inputFormat?: string | null;
  outputFormat: string;
  errorMessage?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string | null;

  // Frontend helper aliases
  type?: string;
  targetFormat?: string;
  targetQuality?: string;
  outputFileId?: string;
}

export interface DownloadValidateRequest {
  url: string;
}

export interface DownloadValidateResponse {
  valid: boolean;
  url?: string;
  platform?: string;
  availableFormats?: string[];
  availableQualities?: string[];
  message?: string;
  domain?: string;
  scheme?: string;
  reason?: string;
}

export type DownloadValidationResponse = DownloadValidateResponse;

export interface DownloadCreateRequest {
  url: string;
  selectedFormat?: string;
  selectedQuality?: string;
  targetFormat?: string;
  targetQuality?: string;
}

export interface DownloadResponse {
  jobId: string;
  job: JobResponse;
  sourceUrl: string;
  platform: string;
  selectedFormat: string;
  selectedQuality: string;
  status: string;
  message: string;
}

export interface ConversionCreateRequest {
  inputFileId?: string;
  inputFormat?: string;
  outputFormat?: string;
  targetResolution?: string;
  audioBitrate?: number;

  // Frontend helper fields
  sourceFileId?: string;
  sourceFileName?: string;
  targetFormat?: string;
  mediaType?: string;
  options?: Record<string, any>;
}

export interface ConversionResponse {
  jobId: string;
  job: JobResponse;
  outputFormat: string;
  targetResolution?: string;
  audioBitrate?: number;
  status: string;
  message: string;
}

export interface SupportedFormatsResponse {
  video: string[];
  audio: string[];
  image: string[];
}

export interface FormatListResponse {
  category: 'video' | 'audio' | 'image';
  formats: string[];
}

export interface FileMetadataResponse {
  id: string;
  jobId?: string;
  originalFilename?: string;
  storedFilename?: string;
  mimeType?: string;
  fileSize?: number;
  createdAt?: string;
  expiresAt?: string | null;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp?: string;
}

export interface ApiErrorResponse {
  timestamp?: string;
  status?: number;
  error?: string;
  code?: string;
  message?: string;
  detail?: string;
  title?: string;
  path?: string;
  validationErrors?: Record<string, string>;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
