import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient, ApiError } from '@/services/apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('checkHealth returns backend health payload when OK', async () => {
    const mockHealth = { status: 'UP', service: 'mediaforge-backend', version: '0.1.0-SNAPSHOT' };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockHealth,
    } as Response);

    const result = await apiClient.checkHealth();
    expect(result).toEqual(mockHealth);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('getSupportedFormats returns video, audio, image lists', async () => {
    const mockFormats = {
      video: ['mp4', 'webm', 'mkv', 'avi', 'mov'],
      audio: ['mp3', 'wav', 'flac', 'aac', 'm4a'],
      image: ['png', 'jpeg', 'webp', 'gif'],
    };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockFormats,
    } as Response);

    const result = await apiClient.getSupportedFormats();
    expect(result.video).toContain('mp4');
    expect(result.audio).toContain('mp3');
  });

  it('validateDownloadUrl sends POST /downloads/validate and returns response', async () => {
    const mockRes = { valid: true, domain: 'example.com', scheme: 'https' };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockRes,
    } as Response);

    const result = await apiClient.validateDownloadUrl({ url: 'https://example.com/video.mp4' });
    expect(result.valid).toBe(true);
    expect(result.domain).toBe('example.com');
  });

  it('createDownloadJob sends POST /downloads and returns HTTP 202 JobResponse', async () => {
    const mockJob = {
      id: 'job-12345',
      type: 'DOWNLOAD',
      status: 'QUEUED',
      targetFormat: 'mp4',
      targetQuality: '1080p',
      createdAt: '2026-11-09T20:00:00Z',
    };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => mockJob,
    } as Response);

    const result = await apiClient.createDownloadJob({
      url: 'https://example.com/video',
      targetFormat: 'mp4',
      targetQuality: '1080p',
    });

    expect(result.id).toBe('job-12345');
    expect(result.status).toBe('QUEUED');
  });

  it('throws ApiError with message and RFC 7807 problem details when fetch fails', async () => {
    const mockError = {
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'Invalid media URL provided',
    };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => mockError,
    } as Response);

    await expect(apiClient.validateDownloadUrl({ url: 'http://127.0.0.1' })).rejects.toThrow(
      'Invalid media URL provided'
    );
  });

  it('uploadFile sends multipart formData and returns FileUploadResponse', async () => {
    const mockUploadResp = {
      fileId: 'file-12345',
      originalFilename: 'test.mp4',
      storedFilename: 'stored.mp4',
      mimeType: 'video/mp4',
      fileSize: 1024,
    };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => mockUploadResp,
    } as Response);

    const file = new File(['dummy content'], 'test.mp4', { type: 'video/mp4' });
    const result = await apiClient.uploadFile(file);

    expect(result.fileId).toBe('file-12345');
    expect(result.mimeType).toBe('video/mp4');
  });

  it('createConversionJob sends POST /conversions and returns JobResponse', async () => {
    const mockJob = {
      id: 'job-conv-1',
      jobType: 'CONVERSION',
      status: 'QUEUED',
      progress: 0,
      outputFormat: 'webm',
      createdAt: '2026-11-12T10:00:00Z',
    };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => mockJob,
    } as Response);

    const result = await apiClient.createConversionJob({
      inputFileId: 'file-12345',
      outputFormat: 'webm',
    });
    expect(result.id).toBe('job-conv-1');
    expect(result.outputFormat).toBe('webm');
  });

  it('createBatchConversion sends POST /conversions/batch and returns BatchConversionResponse', async () => {
    const mockBatch = {
      batchId: 'batch-abc',
      totalJobs: 2,
      jobs: [{ id: 'j1' }, { id: 'j2' }],
      status: 'QUEUED',
      message: 'Batch accepted',
    };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => mockBatch,
    } as Response);

    const result = await apiClient.createBatchConversion({
      items: [{ outputFormat: 'mp4' }, { outputFormat: 'webm' }],
    });
    expect(result.batchId).toBe('batch-abc');
    expect(result.totalJobs).toBe(2);
  });

  it('getJobProgress returns real-time progress details', async () => {
    const mockProgress = {
      jobId: 'job-conv-1',
      status: 'PROCESSING',
      percentage: 45,
      speed: '1.8x',
      fps: 60,
      timeRemainingSeconds: 12,
      completed: false,
      failed: false,
    };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockProgress,
    } as Response);

    const result = await apiClient.getJobProgress('job-conv-1');
    expect(result.percentage).toBe(45);
    expect(result.speed).toBe('1.8x');
  });

  it('getConversionFormats returns video, audio, image supported formats', async () => {
    const mockFormats = {
      videoFormats: ['mp4', 'webm', 'mkv'],
      audioFormats: ['mp3', 'wav', 'flac'],
      imageFormats: ['webp', 'png', 'jpeg'],
    };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockFormats,
    } as Response);

    const result = await apiClient.getConversionFormats();
    expect(result.videoFormats).toContain('mp4');
  });
});

