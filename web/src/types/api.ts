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
  accessToken?: string;
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

export interface TimeRangeDto {
  start: number;
  end: number;
}

export interface SizeEstimationRequest {
  inputFileId?: string;
  mediaType?: 'video' | 'audio' | 'image' | string;
  sourceDuration?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  sourceBitrate?: number;
  sourceFileSize?: number;
  outputFormat?: string;
  targetResolution?: string;
  videoBitrate?: string;
  audioBitrate?: number;
  qualityPreset?: string;
  crf?: number;
  stripAudio?: boolean;
  startTime?: number;
  endTime?: number;
  removeSegments?: TimeRangeDto[];
  imageWidth?: number;
  imageHeight?: number;
  imageQuality?: number;
  cropWidth?: number;
  cropHeight?: number;
}

export interface SizeEstimationResponse {
  estimatedBytes: number;
  minBytes: number;
  maxBytes: number;
  formattedEstimate: string;
  formattedRange: string;
  effectiveDurationSeconds: number;
  estimationMethod: string;
  disclaimer: string;
}

export interface DownloadCreateRequest {
  url: string;
  selectedFormat?: string;
  selectedQuality?: string;
  targetFormat?: string;
  targetQuality?: string;

  // Editing options
  startTime?: number;
  endTime?: number;
  removeSegments?: TimeRangeDto[];
  targetResolution?: string;
  videoBitrate?: string;
  audioBitrate?: number;
  qualityPreset?: string;
  crf?: number;
  stripAudio?: boolean;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  aspectRatio?: string;
  volume?: number;
  removeSilence?: boolean;
  fadeInDuration?: number;
  fadeOutDuration?: number;
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
  videoBitrate?: string;
  frameRate?: number;
  sampleRate?: number;
  audioChannels?: number;
  quality?: number;
  stripAudio?: boolean;
  videoCodec?: string;
  audioCodec?: string;
  resizeWidth?: number;
  resizeHeight?: number;
  rotateDegrees?: number;
  qualityPreset?: string;

  // Advanced video & editing controls
  crf?: number;
  startTime?: number;
  endTime?: number;
  removeSegments?: TimeRangeDto[];
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  aspectRatio?: string;
  volume?: number;
  removeSilence?: boolean;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  preserveAspectRatio?: boolean;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  brightness?: number;
  contrast?: number;
  imageWidth?: number;
  imageHeight?: number;
  imageQuality?: number;
  imageRotation?: number;
  stripMetadata?: boolean;

  // Frontend helper fields
  sourceFileId?: string;
  sourceFileName?: string;
  targetFormat?: string;
  mediaType?: string;
  options?: Record<string, any>;
}

export interface FileUploadResponse {
  id?: string;
  fileId: string;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  fileSize: number;
  expiresAt?: string | null;
  message?: string;
}

export interface BatchConversionRequest {
  items: ConversionCreateRequest[];
}

export interface BatchConversionResponse {
  batchId: string;
  totalJobs: number;
  jobs: JobResponse[];
  status: string;
  message: string;
}

export interface ConversionProgressResponse {
  jobId: string;
  status: JobStatus;
  percentage: number;
  speed?: string;
  fps?: number;
  timeRemainingSeconds?: number;
  currentFrame?: number;
  outTimeMicros?: number;
  completed: boolean;
  failed: boolean;
  errorMessage?: string | null;
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

export interface MediaFormatOptionDto {
  format: string;
  quality: string;
  resolution?: string;
  mimeType?: string;
  estimatedBytes?: number;
  nativeStream: boolean;
  requiresConversion: boolean;
  label: string;
}

export interface MediaMetadataResponse {
  success: boolean;
  url: string;
  platform: string;
  title: string;
  mediaType: 'VIDEO' | 'AUDIO' | 'IMAGE' | string;
  mimeType: string;
  containerFormat: string;
  fileSize?: number;
  resolution?: string;
  duration?: number;
  thumbnail?: string;
  availableFormats: MediaFormatOptionDto[];
  availableQualities: string[];
  directDownloadSupported: boolean;
  message?: string;
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
