'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Image as ImageIcon,
  ArrowRight,
  Settings,
  Download,
  XCircle,
  RefreshCw,
  CheckCircle,
  RotateCw,
  Crop,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  FlipHorizontal,
  FlipVertical,
  Sun
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { JobResponse, ConversionProgressResponse, SizeEstimationResponse } from '@/types/api';
import { FileDropzone } from '@/components/feedback/FileDropzone';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { JobStatusBadge } from '@/components/feedback/JobStatusBadge';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { IMAGE_PRESETS } from '@/utils/presets';

export default function ImageConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [naturalWidth, setNaturalWidth] = useState<number>(0);
  const [naturalHeight, setNaturalHeight] = useState<number>(0);

  // Conversion Parameters
  const [targetFormat, setTargetFormat] = useState('webp');
  const [selectedPreset, setSelectedPreset] = useState<string>('balanced');
  const [quality, setQuality] = useState('85');

  // Resize
  const [resizeMode, setResizeMode] = useState('original');
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [preserveAspectRatio, setPreserveAspectRatio] = useState(true);

  // Crop
  const [showCrop, setShowCrop] = useState(false);
  const [cropAspectRatio, setCropAspectRatio] = useState<string>('custom');
  const [cropX, setCropX] = useState<number>(0);
  const [cropY, setCropY] = useState<number>(0);
  const [cropWidth, setCropWidth] = useState<number>(0);
  const [cropHeight, setCropHeight] = useState<number>(0);

  // Rotations & Visual Enhancements
  const [rotateDegrees, setRotateDegrees] = useState('0');
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState<number>(0); // -1.0 to 1.0 (displayed -100 to 100)
  const [contrast, setContrast] = useState<number>(1.0); // 0.0 to 2.0 (displayed 0 to 200)

  // Advanced panel
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Output Size Estimation
  const [sizeEstimate, setSizeEstimate] = useState<SizeEstimationResponse | null>(null);
  const [isEstimating, setIsEstimating] = useState<boolean>(false);

  // Stages & Job Tracking
  const [stage, setStage] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<JobResponse | null>(null);
  const [progress, setProgress] = useState<ConversionProgressResponse | null>(null);
  const [outputFileId, setOutputFileId] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const estimateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Preview Object URL
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
      setNaturalWidth(0);
      setNaturalHeight(0);
    }
  }, [selectedFile]);

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    setNaturalWidth(img.naturalWidth);
    setNaturalHeight(img.naturalHeight);
    setCropWidth(img.naturalWidth);
    setCropHeight(img.naturalHeight);
    setCropX(0);
    setCropY(0);
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const found = IMAGE_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setQuality(found.quality.toString());
    }
  };

  const handleAspectRatioPreset = (preset: string) => {
    setCropAspectRatio(preset);
    if (!naturalWidth || !naturalHeight) return;

    let targetW = naturalWidth;
    let targetH = naturalHeight;

    if (preset === '16:9') {
      targetH = Math.round((naturalWidth * 9) / 16);
      if (targetH > naturalHeight) {
        targetH = naturalHeight;
        targetW = Math.round((naturalHeight * 16) / 9);
      }
    } else if (preset === '9:16') {
      targetW = Math.round((naturalHeight * 9) / 16);
      if (targetW > naturalWidth) {
        targetW = naturalWidth;
        targetH = Math.round((naturalWidth * 16) / 9);
      }
    } else if (preset === '1:1') {
      const minDim = Math.min(naturalWidth, naturalHeight);
      targetW = minDim;
      targetH = minDim;
    } else if (preset === '4:3') {
      targetH = Math.round((naturalWidth * 3) / 4);
      if (targetH > naturalHeight) {
        targetH = naturalHeight;
        targetW = Math.round((naturalHeight * 4) / 3);
      }
    }

    const startX = Math.max(0, Math.floor((naturalWidth - targetW) / 2));
    const startY = Math.max(0, Math.floor((naturalHeight - targetH) / 2));

    setCropWidth(targetW);
    setCropHeight(targetH);
    setCropX(startX);
    setCropY(startY);
  };

  // Check transparency conversion warning
  const isLossOfAlpha = (selectedFile?.name.toLowerCase().endsWith('.png') || selectedFile?.name.toLowerCase().endsWith('.webp')) &&
    (targetFormat === 'jpg' || targetFormat === 'jpeg');

  // Debounced Size Estimation
  useEffect(() => {
    if (estimateTimerRef.current) {
      clearTimeout(estimateTimerRef.current);
    }

    estimateTimerRef.current = setTimeout(async () => {
      try {
        setIsEstimating(true);
        const w = customWidth ? parseInt(customWidth, 10) : (showCrop && cropWidth > 0 ? cropWidth : naturalWidth);
        const h = customHeight ? parseInt(customHeight, 10) : (showCrop && cropHeight > 0 ? cropHeight : naturalHeight);

        const est = await apiClient.estimateOutputSize({
          mediaType: 'image',
          outputFormat: targetFormat,
          sourceWidth: naturalWidth || 1920,
          sourceHeight: naturalHeight || 1080,
          sourceFileSize: selectedFile ? selectedFile.size : undefined,
          imageWidth: w > 0 ? w : undefined,
          imageHeight: h > 0 ? h : undefined,
          imageQuality: parseInt(quality, 10) || 85,
          cropWidth: showCrop && cropWidth > 0 ? cropWidth : undefined,
          cropHeight: showCrop && cropHeight > 0 ? cropHeight : undefined,
        });
        setSizeEstimate(est);
      } catch {
        // Fallback
      } finally {
        setIsEstimating(false);
      }
    }, 300);

    return () => {
      if (estimateTimerRef.current) clearTimeout(estimateTimerRef.current);
    };
  }, [
    selectedFile,
    targetFormat,
    quality,
    customWidth,
    customHeight,
    showCrop,
    cropWidth,
    cropHeight,
    naturalWidth,
    naturalHeight,
  ]);

  const cleanupPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => cleanupPolling();
  }, []);

  const startPolling = (jobId: string) => {
    cleanupPolling();
    if (!jobId || jobId === 'undefined') {
      setStage('FAILED');
      setError('Unable to track conversion: No valid Job ID was received from the server.');
      return;
    }
    let consecutiveErrors = 0;
    pollIntervalRef.current = setInterval(async () => {
      try {
        const prog = await apiClient.getJobProgress(jobId);
        setProgress(prog);
        consecutiveErrors = 0;

        if (prog.completed || prog.status === 'COMPLETED') {
          cleanupPolling();
          setStage('COMPLETED');
          try {
            const updatedJob = await apiClient.getJobById(jobId);
            setCurrentJob(updatedJob);
            setOutputFileId(updatedJob.outputFileId || jobId);
          } catch {
            setOutputFileId(jobId);
          }
        } else if (prog.failed || prog.status === 'FAILED') {
          cleanupPolling();
          setStage('FAILED');
          setError(prog.errorMessage || 'Image conversion failed.');
        } else if (prog.status === 'CANCELLED') {
          cleanupPolling();
          setStage('CANCELLED');
        }
      } catch {
        consecutiveErrors++;
        if (consecutiveErrors > 15) {
          cleanupPolling();
          setStage('FAILED');
          setError('Lost connection while polling image conversion progress.');
        }
      }
    }, 1000);
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select or drop an image file to convert.');
      return;
    }

    setError(null);
    setStage('UPLOADING');
    setCurrentJob(null);
    setProgress(null);
    setOutputFileId(null);

    try {
      const uploadResp = await apiClient.uploadFile(selectedFile);
      setStage('PROCESSING');
      const inputFormat = selectedFile.name.split('.').pop()?.toLowerCase();

      const widthNum = customWidth ? parseInt(customWidth, 10) : undefined;
      const heightNum = customHeight ? parseInt(customHeight, 10) : undefined;
      const hasCropConfig = showCrop && cropWidth > 0 && cropHeight > 0 &&
        (cropWidth !== naturalWidth || cropHeight !== naturalHeight || cropX > 0 || cropY > 0);

      const job = await apiClient.createConversionJob({
        inputFileId: uploadResp.id || uploadResp.fileId,
        inputFormat,
        outputFormat: targetFormat,
        imageQuality: parseInt(quality, 10) || 85,
        imageWidth: widthNum,
        imageHeight: heightNum,
        preserveAspectRatio,
        imageRotation: parseInt(rotateDegrees, 10) || undefined,
        cropX: hasCropConfig ? cropX : undefined,
        cropY: hasCropConfig ? cropY : undefined,
        cropWidth: hasCropConfig ? cropWidth : undefined,
        cropHeight: hasCropConfig ? cropHeight : undefined,
        aspectRatio: showCrop ? cropAspectRatio : undefined,
        flipHorizontal: flipH ? true : undefined,
        flipVertical: flipV ? true : undefined,
        brightness: brightness !== 0 ? brightness : undefined,
        contrast: contrast !== 1.0 ? contrast : undefined,
      });

      const effectiveJobId = job.id || (job as any).jobId;
      if (!effectiveJobId) {
        throw new Error('Backend accepted conversion but did not return a valid Job ID.');
      }
      job.id = effectiveJobId;
      setCurrentJob(job);
      startPolling(effectiveJobId);
    } catch (err: any) {
      setStage('FAILED');
      setError(err.message || 'Failed to process image conversion.');
    }
  };

  const handleCancel = async () => {
    if (!currentJob) return;
    try {
      await apiClient.cancelJob(currentJob.id);
      cleanupPolling();
      setStage('CANCELLED');
    } catch (err: any) {
      setError(err.message || 'Failed to cancel image conversion.');
    }
  };

  const handleReset = () => {
    cleanupPolling();
    setSelectedFile(null);
    setStage('IDLE');
    setError(null);
    setCurrentJob(null);
    setProgress(null);
    setOutputFileId(null);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Advanced Image Processing & Studio</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Convert & Optimize Images
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-600 dark:text-slate-400">
          Crop, resize, flip, rotate, adjust brightness and convert between JPG, PNG, WebP, and AVIF with transparency preservation.
        </p>
      </div>

      <Card className="mt-8 p-6 sm:p-8">
        {stage === 'IDLE' && (
          <form onSubmit={handleConvert} className="space-y-6">
            <FileDropzone
              accept="image/*,.jpg,.jpeg,.png,.webp,.avif,.bmp,.gif"
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              label="Upload Image"
              description="Drop PNG, JPG, WebP, or AVIF image (up to 50MB)"
            />

            {/* Interactive Image Preview with Crop Overlay */}
            {previewUrl && (
              <div className="rounded-xl border border-slate-200 bg-slate-900/90 p-4 dark:border-slate-800 text-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-emerald-400" />
                    Source Preview
                  </span>
                  <span>Dimensions: {naturalWidth}x{naturalHeight} px</span>
                </div>

                <div className="relative max-h-72 w-full overflow-hidden rounded-lg bg-black/60 flex items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview"
                    onLoad={handleImageLoaded}
                    className="max-h-64 object-contain rounded"
                    style={{
                      transform: `rotate(${rotateDegrees}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                      filter: `brightness(${1 + brightness}) contrast(${contrast})`,
                    }}
                  />
                  {showCrop && cropWidth > 0 && cropHeight > 0 && naturalWidth > 0 && naturalHeight > 0 && (
                    <div
                      className="absolute border-2 border-dashed border-emerald-400 bg-emerald-400/10 pointer-events-none"
                      style={{
                        left: `${(cropX / naturalWidth) * 100}%`,
                        top: `${(cropY / naturalHeight) * 100}%`,
                        width: `${(cropWidth / naturalWidth) * 100}%`,
                        height: `${(cropHeight / naturalHeight) * 100}%`,
                      }}
                    >
                      <span className="absolute top-1 left-1 bg-emerald-500 text-black text-[10px] font-bold px-1 rounded">
                        {cropWidth}x{cropHeight}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transparency Warning */}
            {isLossOfAlpha && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>Alpha Transparency Notice:</strong> Target format JPEG does not support transparency. Transparent areas will automatically be flattened onto a clean white background.
                </span>
              </div>
            )}

            {/* Crop & Aspect Ratio Section */}
            {selectedFile && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-4">
                <button
                  type="button"
                  onClick={() => setShowCrop(!showCrop)}
                  className="w-full flex items-center justify-between text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <Crop className="h-4 w-4 text-emerald-500" />
                    <span>Crop Image & Aspect Ratio</span>
                  </div>
                  {showCrop ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showCrop && (
                  <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Aspect Ratio Presets:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['custom', '1:1', '4:3', '16:9', '9:16'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleAspectRatioPreset(preset)}
                            className={`px-3 py-1 rounded text-xs font-medium transition ${
                              cropAspectRatio === preset
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {preset.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">X Offset</label>
                        <input
                          type="number"
                          min="0"
                          value={cropX}
                          onChange={(e) => setCropX(parseInt(e.target.value, 10) || 0)}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Y Offset</label>
                        <input
                          type="number"
                          min="0"
                          value={cropY}
                          onChange={(e) => setCropY(parseInt(e.target.value, 10) || 0)}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Crop Width</label>
                        <input
                          type="number"
                          min="2"
                          value={cropWidth}
                          onChange={(e) => setCropWidth(parseInt(e.target.value, 10) || 2)}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Crop Height</label>
                        <input
                          type="number"
                          min="2"
                          value={cropHeight}
                          onChange={(e) => setCropHeight(parseInt(e.target.value, 10) || 2)}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Format & Image Options */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Settings className="h-4 w-4" />
                <span>Image Optimization Parameters</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Select
                    label="Compression Preset"
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    options={[
                      ...IMAGE_PRESETS.map((p) => ({
                        label: `${p.label} — ${p.description}`,
                        value: p.id,
                      })),
                      { label: 'Maximum Quality (Lossless / 100%)', value: 'maximum' },
                    ]}
                  />
                </div>

                <Select
                  label="Target Image Format"
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value)}
                  options={[
                    { label: 'WEBP — Modern Web Standard (High Compression)', value: 'webp' },
                    { label: 'JPG / JPEG — Universal Compatibility', value: 'jpg' },
                    { label: 'PNG — Lossless with Alpha Transparency', value: 'png' },
                    { label: 'AVIF — Next-Gen High Efficiency', value: 'avif' },
                  ]}
                />

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Quality ({quality}%):
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="w-full accent-emerald-600 mt-2"
                  />
                  <span className="text-[10px] text-slate-500">Higher quality increases output file size</span>
                </div>

                <Select
                  label="Rotation"
                  value={rotateDegrees}
                  onChange={(e) => setRotateDegrees(e.target.value)}
                  options={[
                    { label: 'No Rotation (0°)', value: '0' },
                    { label: 'Rotate 90° Clockwise', value: '90' },
                    { label: 'Rotate 180°', value: '180' },
                    { label: 'Rotate 270° (90° Counter-Clockwise)', value: '270' },
                  ]}
                />

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Resize Dimensions:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder={`W (${naturalWidth || 'Auto'})`}
                      value={customWidth}
                      onChange={(e) => setCustomWidth(e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                    <input
                      type="number"
                      placeholder={`H (${naturalHeight || 'Auto'})`}
                      value={customHeight}
                      onChange={(e) => setCustomHeight(e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="aspectLock"
                      checked={preserveAspectRatio}
                      onChange={(e) => setPreserveAspectRatio(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600"
                    />
                    <label htmlFor="aspectLock" className="text-[11px] text-slate-600 dark:text-slate-400">
                      Preserve Aspect Ratio (Prevent Distortion)
                    </label>
                  </div>
                </div>
              </div>

              {/* Advanced Image Controls (Flips & Brightness) */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Advanced Visual Adjustments (Flips, Brightness, Contrast)</span>
                  {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {showAdvanced && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex gap-4 items-center">
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={flipH}
                          onChange={(e) => setFlipH(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                        />
                        <FlipHorizontal className="h-4 w-4" />
                        <span>Flip Horizontal</span>
                      </label>

                      <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={flipV}
                          onChange={(e) => setFlipV(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                        />
                        <FlipVertical className="h-4 w-4" />
                        <span>Flip Vertical</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Brightness ({Math.round(brightness * 100)}%):
                      </label>
                      <input
                        type="range"
                        min="-0.5"
                        max="0.5"
                        step="0.05"
                        value={brightness}
                        onChange={(e) => setBrightness(parseFloat(e.target.value))}
                        className="w-full accent-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Contrast ({Math.round(contrast * 100)}%):
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="1.8"
                        step="0.05"
                        value={contrast}
                        onChange={(e) => setContrast(parseFloat(e.target.value))}
                        className="w-full accent-emerald-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Output Size Estimation Box */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30 flex items-start gap-3">
              <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  {isEstimating ? (
                    'Calculating estimated output size...'
                  ) : sizeEstimate ? (
                    <>
                      Estimated Output Size: <span className="font-bold text-emerald-700 dark:text-emerald-300">{sizeEstimate.formattedEstimate}</span> ({sizeEstimate.formattedRange})
                    </>
                  ) : (
                    'Size will be calculated after conversion'
                  )}
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  {sizeEstimate?.disclaimer || 'Estimated image output size based on target dimensions and compression factor.'}
                </p>
              </div>
            </div>

            {error && <ErrorAlert title="Conversion Error" message={error} onClose={() => setError(null)} />}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!selectedFile}
              leftIcon={<ImageIcon className="h-5 w-5" />}
            >
              Start Image Conversion
            </Button>
          </form>
        )}

        {/* Uploading Stage */}
        {stage === 'UPLOADING' && (
          <div className="py-12 text-center space-y-4">
            <RefreshCw className="h-10 w-10 text-emerald-500 animate-spin mx-auto" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Uploading & Verifying Image...
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Validating pixel thresholds, stripping metadata, and processing in secure scratch memory.
            </p>
          </div>
        )}

        {/* Processing Stage */}
        {stage === 'PROCESSING' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="info">Image Processing</Badge>
                  <JobStatusBadge status="PROCESSING" />
                </div>
                <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                  Converting to <span className="uppercase text-emerald-600 dark:text-emerald-400">{targetFormat}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Job ID: {currentJob?.id}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                leftIcon={<XCircle className="h-4 w-4 text-red-500" />}
              >
                Cancel Job
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Progress: {progress?.percentage ?? currentJob?.progress ?? 0}%</span>
              </div>
              <ProgressBar value={progress?.percentage ?? currentJob?.progress ?? 0} />
            </div>

            <div className="flex justify-end">
              <Link href={`/jobs/${currentJob?.id}`}>
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                  Inspect Job Logs
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Completed Stage */}
        {stage === 'COMPLETED' && (
          <div className="py-8 text-center space-y-6">
            <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Image Processing Complete!
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Your image was successfully converted and optimized in <strong className="uppercase">{targetFormat}</strong> format.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {outputFileId && (
                <a
                  href={apiClient.getFileDownloadUrl(outputFileId)}
                  download
                  className="w-full sm:w-auto"
                >
                  <Button variant="primary" size="lg" leftIcon={<Download className="h-5 w-5" />}>
                    Download Converted Image
                  </Button>
                </a>
              )}

              <Button variant="outline" size="lg" onClick={handleReset} leftIcon={<RefreshCw className="h-4 w-4" />}>
                Convert Another Image
              </Button>
            </div>
          </div>
        )}

        {/* Failed or Cancelled */}
        {(stage === 'FAILED' || stage === 'CANCELLED') && (
          <div className="py-6 space-y-4">
            <ErrorAlert
              title={stage === 'CANCELLED' ? 'Conversion Cancelled' : 'Conversion Failed'}
              message={error || (stage === 'CANCELLED' ? 'Job was cancelled by user request.' : 'An error occurred during image processing.')}
            />
            <div className="flex justify-center">
              <Button variant="primary" onClick={handleReset} leftIcon={<RefreshCw className="h-4 w-4" />}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
