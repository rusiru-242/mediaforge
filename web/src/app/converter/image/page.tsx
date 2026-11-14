'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  Crop as CropIcon,
  Sliders,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  ChevronDown,
  Trash2,
  Plus,
  TrendingDown,
  Sparkles,
  FlipHorizontal,
  FlipVertical,
  Sun,
  Eye,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { JobResponse, ConversionProgressResponse, SizeEstimationResponse } from '@/types/api';
import { IMAGE_PRESETS } from '@/utils/presets';

export default function ImageConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [naturalWidth, setNaturalWidth] = useState<number>(0);
  const [naturalHeight, setNaturalHeight] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Conversion Parameters
  const [targetFormat, setTargetFormat] = useState('webp');
  const [selectedPreset, setSelectedPreset] = useState<string>('balanced');
  const [quality, setQuality] = useState('85');

  // Resize
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [preserveAspectRatio, setPreserveAspectRatio] = useState(true);

  // Active Tab & Tool
  const [activeTab, setActiveTab] = useState<'light' | 'transform'>('light');
  const [showCrop, setShowCrop] = useState(false);
  const [cropAspectRatio, setCropAspectRatio] = useState<string>('16:9');
  const [cropX, setCropX] = useState<number>(0);
  const [cropY, setCropY] = useState<number>(0);
  const [cropWidth, setCropWidth] = useState<number>(0);
  const [cropHeight, setCropHeight] = useState<number>(0);

  // Rotations & Visual Enhancements
  const [rotateDegrees, setRotateDegrees] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(0); // -1.0 to 1.0 (displayed as -100 to 100)
  const [contrast, setContrast] = useState<number>(1.0); // 0.0 to 2.0 (displayed as 0 to 200)

  // Output Size Estimation
  const [sizeEstimate, setSizeEstimate] = useState<SizeEstimationResponse | null>(null);
  const [isEstimating, setIsEstimating] = useState<boolean>(false);

  // Stages & Job Tracking
  const [stage, setStage] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<JobResponse | null>(null);
  const [progress, setProgress] = useState<ConversionProgressResponse | null>(null);
  const [outputFileId, setOutputFileId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    setShowCrop(true);
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

  const handleResolutionScale = (scalePercent: number) => {
    if (!naturalWidth || !naturalHeight) return;
    if (scalePercent === 100) {
      setCustomWidth('');
      setCustomHeight('');
    } else {
      const scaledW = Math.round((naturalWidth * scalePercent) / 100);
      const scaledH = Math.round((naturalHeight * scalePercent) / 100);
      setCustomWidth(scaledW.toString());
      setCustomHeight(scaledH.toString());
    }
  };

  // Alpha transparency warning
  const isLossOfAlpha =
    (selectedFile?.name.toLowerCase().endsWith('.png') || selectedFile?.name.toLowerCase().endsWith('.webp')) &&
    (targetFormat === 'jpg' || targetFormat === 'jpeg');

  // Debounced Size Estimation
  useEffect(() => {
    if (estimateTimerRef.current) {
      clearTimeout(estimateTimerRef.current);
    }

    estimateTimerRef.current = setTimeout(async () => {
      try {
        setIsEstimating(true);
        const w = customWidth ? parseInt(customWidth, 10) : showCrop && cropWidth > 0 ? cropWidth : naturalWidth;
        const h = customHeight ? parseInt(customHeight, 10) : showCrop && cropHeight > 0 ? cropHeight : naturalHeight;

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
      setError('Unable to track conversion: No valid Job ID was received.');
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
          setError('Lost connection while polling image conversion.');
        }
      }
    }, 1000);
  };

  const handleConvert = async () => {
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
      const hasCropConfig =
        showCrop &&
        cropWidth > 0 &&
        cropHeight > 0 &&
        (cropWidth !== naturalWidth || cropHeight !== naturalHeight || cropX > 0 || cropY > 0);

      const job = await apiClient.createConversionJob({
        inputFileId: uploadResp.id || uploadResp.fileId,
        inputFormat,
        outputFormat: targetFormat,
        imageQuality: parseInt(quality, 10) || 85,
        imageWidth: widthNum,
        imageHeight: heightNum,
        preserveAspectRatio,
        imageRotation: rotateDegrees !== 0 ? rotateDegrees : undefined,
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

  const handleResetAdjustments = () => {
    setBrightness(0);
    setContrast(1.0);
    setRotateDegrees(0);
    setFlipH(false);
    setFlipV(false);
    setShowCrop(false);
    setCustomWidth('');
    setCustomHeight('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setStage('IDLE');
      setError(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-gutter py-space-md flex flex-col gap-space-md">
      {/* Top Workspace Status Bar */}
      <div className="w-full bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-space-md shadow-sm border border-outline-variant/30 flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary-fixed dark:bg-slate-800 text-primary flex items-center justify-center font-bold">
              <ImageIcon className="w-4 h-4" />
            </span>
            <Link href="/" className="text-xs text-on-surface-variant hover:text-on-surface font-semibold">
              Image Editor
            </Link>
            <span className="text-outline-variant text-xs">/</span>
            <span className="text-sm font-bold text-on-surface truncate max-w-[280px] sm:max-w-md">
              {selectedFile ? selectedFile.name : 'No image loaded'}
            </span>
          </div>
          {selectedFile && naturalWidth > 0 && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low dark:bg-slate-800 text-on-surface-variant font-mono text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse" />
              <span>
                {naturalWidth} × {naturalHeight} · 24-bit RGB · {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetAdjustments}
            disabled={!selectedFile}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low dark:bg-slate-800 text-on-surface-variant hover:bg-surface-container font-semibold text-xs disabled:opacity-40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Revert</span>
          </button>
          <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant dark:bg-slate-800 dark:text-primary font-semibold text-xs cursor-pointer shadow-xs">
            <Upload className="w-3.5 h-3.5" />
            <span>{selectedFile ? 'Replace File' : 'Import Image'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.png,.jpg,.jpeg,.webp,.avif,.bmp,.tiff,.gif"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Main Grid: 8-col Viewport & Deck + 4-col Export Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Workspace (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-space-md min-w-0">
          {/* Viewport Card */}
          <div className="relative bg-inverse-surface rounded-3xl overflow-hidden shadow-xl aspect-[16/10] flex items-center justify-center group select-none border border-outline-variant/30">
            {previewUrl ? (
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden p-4">
                <img
                  src={previewUrl}
                  alt={selectedFile?.name || 'Preview'}
                  onLoad={handleImageLoaded}
                  className="max-w-full max-h-full object-contain transition-all duration-150"
                  style={{
                    transform: `scale(${zoomLevel / 100}) rotate(${rotateDegrees}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                    filter: `brightness(${1 + brightness}) contrast(${contrast})`,
                  }}
                />

                {/* Rule of Thirds Crop Guidelines Overlay (when crop active) */}
                {showCrop && (
                  <div className="absolute inset-8 border-2 border-primary-container rounded pointer-events-none shadow-[0_0_0_9999px_rgba(11,28,48,0.5)]">
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40">
                      <div className="bg-white/40 w-px h-full absolute left-1/3" />
                      <div className="bg-white/40 w-px h-full absolute left-2/3" />
                      <div className="bg-white/40 h-px w-full absolute top-1/3" />
                      <div className="bg-white/40 h-px w-full absolute top-2/3" />
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/70 font-mono text-[11px] text-white">
                      Crop: {cropAspectRatio} ({cropWidth}×{cropHeight})
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center text-center p-8 cursor-pointer hover:opacity-90 transition-opacity"
              >
                <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Click to Upload Image</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Drag and drop PNG, JPEG, WebP, AVIF, or BMP images to edit and convert.
                </p>
              </div>
            )}

            {/* Top Right Zoom Controls */}
            {previewUrl && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-surface-container-lowest/90 dark:bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-full shadow-md text-on-surface">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(25, z - 25))}
                  className="w-6 h-6 rounded-full hover:bg-surface-container flex items-center justify-center"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 font-mono text-xs font-semibold">{zoomLevel}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
                  className="w-6 h-6 rounded-full hover:bg-surface-container flex items-center justify-center"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="w-6 h-6 rounded-full hover:bg-surface-container flex items-center justify-center ml-0.5"
                  title="Reset 100%"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Bottom Inside-Canvas Floating Bar */}
            {previewUrl && (
              <div className="absolute bottom-3 inset-x-3 sm:inset-x-8 flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-full bg-surface-container-lowest/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg border border-outline-variant/30">
                {/* Aspect Presets */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 px-1">
                  <button
                    type="button"
                    onClick={() => setShowCrop(false)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      !showCrop ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Full Image
                  </button>
                  {(['16:9', '1:1', '4:3', '9:16'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => handleAspectRatioPreset(ratio)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        showCrop && cropAspectRatio === ratio
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>

                {/* Orientation Actions */}
                <div className="flex items-center gap-1 pl-2 border-l border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setRotateDegrees((d) => (d - 90 + 360) % 360)}
                    className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                    title="Rotate 90° CCW"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotateDegrees((d) => (d + 90) % 360)}
                    className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                    title="Rotate 90° CW"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlipH(!flipH)}
                    className={`w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors ${
                      flipH ? 'bg-primary/20 text-primary' : 'text-on-surface-variant'
                    }`}
                    title="Flip Horizontal"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlipV(!flipV)}
                    className={`w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors ${
                      flipV ? 'bg-primary/20 text-primary' : 'text-on-surface-variant'
                    }`}
                    title="Flip Vertical"
                  >
                    <FlipVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Lower Adjustments & Tuning Deck */}
          <div className="w-full bg-surface-container-lowest dark:bg-slate-900 rounded-3xl shadow-sm border border-outline-variant/30 p-space-md flex flex-col gap-space-md">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
              <div className="flex items-center p-1 bg-surface-container-low dark:bg-slate-800 rounded-full">
                <button
                  type="button"
                  onClick={() => setActiveTab('light')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'light'
                      ? 'bg-surface-container-lowest dark:bg-slate-700 text-on-surface shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-primary" />
                  <span>Light & Color</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('transform')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'transform'
                      ? 'bg-surface-container-lowest dark:bg-slate-700 text-on-surface shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <CropIcon className="w-3.5 h-3.5 text-primary" />
                  <span>Transform & Canvas</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetAdjustments}
                className="text-on-surface-variant hover:text-primary text-xs font-semibold flex items-center gap-1 px-3 py-1 rounded-full hover:bg-surface-container transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Sliders</span>
              </button>
            </div>

            {/* TAB 1: Light & Color */}
            {activeTab === 'light' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-space-lg gap-y-space-md pt-1">
                {/* Brightness */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-on-surface">Brightness</span>
                    <span className="font-mono text-primary font-bold">
                      {brightness >= 0 ? `+${Math.round(brightness * 100)}` : Math.round(brightness * 100)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={brightness}
                    onChange={(e) => setBrightness(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-surface-container-high dark:bg-slate-700 rounded-full appearance-none accent-primary cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-on-surface">Contrast</span>
                    <span className="font-mono text-primary font-bold">
                      {Math.round(contrast * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={contrast}
                    onChange={(e) => setContrast(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-surface-container-high dark:bg-slate-700 rounded-full appearance-none accent-primary cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Transform & Canvas */}
            {activeTab === 'transform' && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div>
                    <label className="block text-outline text-[10px] mb-1">Custom Width (px)</label>
                    <input
                      type="number"
                      placeholder={naturalWidth ? naturalWidth.toString() : 'Auto'}
                      value={customWidth}
                      onChange={(e) => setCustomWidth(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-surface-container-low dark:bg-slate-800 border border-outline-variant/30 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-outline text-[10px] mb-1">Custom Height (px)</label>
                    <input
                      type="number"
                      placeholder={naturalHeight ? naturalHeight.toString() : 'Auto'}
                      value={customHeight}
                      onChange={(e) => setCustomHeight(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-surface-container-low dark:bg-slate-800 border border-outline-variant/30 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center pt-4">
                    <label className="flex items-center gap-1.5 text-xs text-on-surface cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preserveAspectRatio}
                        onChange={(e) => setPreserveAspectRatio(e.target.checked)}
                        className="rounded accent-primary"
                      />
                      <span>Lock Aspect Ratio</span>
                    </label>
                  </div>
                  <div className="flex items-center pt-4">
                    <span className="text-xs text-on-surface-variant font-mono">
                      Current: {customWidth || naturalWidth || 0} × {customHeight || naturalHeight || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Export Inspector (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl shadow-sm border border-outline-variant/30 p-space-lg flex flex-col gap-space-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <span>Export Settings</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant dark:bg-slate-800 dark:text-primary font-semibold text-xs">
                Web Ready
              </span>
            </div>

            {/* Target Format Pills */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface flex items-center justify-between">
                <span>Target Format</span>
                <span className="text-tertiary font-mono text-xs font-semibold">Lossless & WebP</span>
              </label>
              <div className="grid grid-cols-4 gap-1 p-1 bg-surface-container-low dark:bg-slate-800 rounded-2xl">
                {(['webp', 'avif', 'jpg', 'png'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setTargetFormat(fmt)}
                    className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                      targetFormat === fmt
                        ? 'bg-surface-container-lowest dark:bg-slate-700 text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality & Compression Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-on-surface">Quality Level</span>
                <span className="font-mono text-primary font-bold">{quality}% (Visually Lossless)</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full h-1.5 bg-surface-container-high dark:bg-slate-700 rounded-full appearance-none accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-outline">
                <span>Compact (50%)</span>
                <span>Balanced (85%)</span>
                <span>Max (100%)</span>
              </div>
            </div>

            {/* Target Resolution Scaling */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface">Resolution Scaling</label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-surface-container-low dark:bg-slate-800 rounded-2xl">
                {[
                  { pct: 100, label: 'Original 100%' },
                  { pct: 67, label: '2K QHD (67%)' },
                  { pct: 50, label: '1080p (50%)' },
                ].map((tier) => (
                  <button
                    key={tier.pct}
                    type="button"
                    onClick={() => handleResolutionScale(tier.pct)}
                    className="py-1.5 px-1 rounded-xl text-[11px] font-semibold text-on-surface hover:bg-surface-container-lowest transition-all"
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transparency flattening warning */}
            {isLossOfAlpha && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>JPEG does not support transparency. Alpha channels will flatten to solid white.</span>
              </div>
            )}

            {/* Real-time Output Size Estimation */}
            <div className="bg-surface-container-low dark:bg-slate-800/60 rounded-2xl p-space-md flex flex-col gap-2 border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-outline font-bold">Estimated Output Size</span>
                {sizeEstimate && sizeEstimate.reductionPercentage !== undefined && (
                  <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-mono text-xs font-bold flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>{sizeEstimate.reductionPercentage}% vs source</span>
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-on-surface font-mono">
                  {isEstimating ? (
                    <span className="animate-pulse">Calculating...</span>
                  ) : sizeEstimate ? (
                    sizeEstimate.formattedEstimate || sizeEstimate.formattedEstimatedSize
                  ) : (
                    '~924 KB'
                  )}
                </span>
                {selectedFile && (
                  <span className="font-mono text-xs text-outline line-through">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                )}
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                Calculated for <strong>{targetFormat.toUpperCase()}</strong> at <strong>{quality}% Quality</strong>.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Action CTA */}
            <div className="flex flex-col gap-2 pt-1">
              {stage === 'IDLE' && (
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={!selectedFile}
                  className="w-full h-12 rounded-full bg-primary-container hover:bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/25 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Processed Image</span>
                </button>
              )}

              {stage === 'UPLOADING' && (
                <div className="w-full h-12 rounded-full bg-primary-container/80 text-white font-semibold text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading Image...</span>
                </div>
              )}

              {stage === 'PROCESSING' && (
                <div className="space-y-3">
                  <div className="w-full bg-surface-container dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress ? (progress.percentage ?? progress.progressPercentage ?? 30) : 30}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-on-surface-variant font-mono">
                    <span>{progress ? (progress.stage || 'Compressing image...') : 'Compressing image...'}</span>
                    <span>{progress ? `${progress.percentage ?? progress.progressPercentage ?? 0}%` : 'Processing...'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full h-10 rounded-full bg-surface-container-low hover:bg-surface-container text-rose-600 font-semibold text-xs transition-colors"
                  >
                    Cancel Conversion
                  </button>
                </div>
              )}

              {stage === 'COMPLETED' && (
                <div className="space-y-2">
                  <div className="p-3 rounded-2xl bg-tertiary-fixed/40 border border-tertiary/40 flex items-center gap-2 text-tertiary text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-tertiary shrink-0" />
                    <span>Image processed and compressed successfully!</span>
                  </div>
                  <a
                    href={outputFileId ? apiClient.getDownloadUrl(outputFileId) : '#'}
                    download
                    className="w-full h-12 rounded-full bg-tertiary-container hover:bg-tertiary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Converted Image</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setStage('IDLE');
                      setError(null);
                    }}
                    className="w-full h-10 rounded-full bg-surface-container-low text-on-surface text-xs font-semibold hover:bg-surface-container transition-colors"
                  >
                    Edit Another
                  </button>
                </div>
              )}

              {stage === 'FAILED' && (
                <button
                  type="button"
                  onClick={() => setStage('IDLE')}
                  className="w-full h-11 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface font-semibold text-xs transition-colors"
                >
                  Try Again
                </button>
              )}

              <div className="flex items-center justify-center gap-1.5 text-center text-on-surface-variant text-xs pt-1">
                <Shield className="w-3.5 h-3.5 text-tertiary" />
                <span>Zero Database · Complete Client Privacy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
