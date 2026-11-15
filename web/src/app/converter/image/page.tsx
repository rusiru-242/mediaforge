'use client';

import { useNavigationGuard } from '@/hooks/useNavigationGuard';

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
  Layers,
  ChevronDown,
  Trash2,
  Plus,
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
import { JobResponse, ConversionProgressResponse } from '@/types/api';
import { ImageCropPreview } from '@/components/editor/ImageCropPreview';
import { IMAGE_FILTERS, IMAGE_RATIOS } from '@/utils/imageFilters';
import { clampCrop, CropRect } from '@/utils/videoCrop';
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
  const [cropAspectRatio, setCropAspectRatio] = useState<string>('original');
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

  const [saturation, setSaturation] = useState(1);
  const [warmth, setWarmth] = useState(0);
  const [imageFilter, setImageFilter] = useState('original');
  const updateCrop = (rect: CropRect) => {
    const next = clampCrop(rect, naturalWidth, naturalHeight);
    setCropX(next.x); setCropY(next.y); setCropWidth(next.width); setCropHeight(next.height);
  };
  const applyFilter = (id: string) => {
    const preset = IMAGE_FILTERS.find(p => p.id === id); if (!preset) return;
    setImageFilter(id); setBrightness(preset.brightness); setContrast(preset.contrast); setSaturation(preset.saturation); setWarmth(preset.warmth);
  };
  // Stages & Job Tracking
  const [stage, setStage] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'>('IDLE');
  useNavigationGuard(stage === 'UPLOADING' || stage === 'PROCESSING');
  const [error, setError] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<JobResponse | null>(null);
  const [progress, setProgress] = useState<ConversionProgressResponse | null>(null);
  const [outputFileId, setOutputFileId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const exportSettings = JSON.stringify({ selectedFile: selectedFile && [selectedFile.name, selectedFile.lastModified], targetFormat,
    quality, customWidth, customHeight, preserveAspectRatio, showCrop, cropX, cropY, cropWidth, cropHeight,
    rotateDegrees, flipH, flipV, brightness, contrast, saturation, warmth });
  const completedSettings = useRef(exportSettings);
  useEffect(() => {
    if (stage === 'COMPLETED' && completedSettings.current !== exportSettings) {
      setStage('IDLE'); setOutputFileId(null);
    }
  }, [stage, exportSettings]);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

    if (preset === 'original') { setShowCrop(false); setCropX(0); setCropY(0); setCropWidth(naturalWidth); setCropHeight(naturalHeight); return; }
    if (preset === 'custom') return;
    const [rw, rh] = preset.split(':').map(Number);
    const ratio = rw / rh;
    const targetW = Math.floor(Math.min(naturalWidth, naturalHeight * ratio));
    const targetH = Math.floor(targetW / ratio);

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

    completedSettings.current = exportSettings;
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
        saturation, warmth,
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
    setSaturation(1); setWarmth(0); setImageFilter('original');
    setBrightness(0);
    setContrast(1.0);
    setRotateDegrees(0);
    setFlipH(false);
    setFlipV(false);
    setShowCrop(false);
    setCropAspectRatio('original');
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
    <div className="image-editor w-full max-w-7xl mx-auto px-gutter py-space-md flex flex-col gap-space-md text-slate-900 dark:text-slate-100">
      {/* Top Workspace Status Bar */}
      <div className="w-full bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-space-md shadow-sm border border-outline-variant/30 flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary-fixed dark:bg-slate-800 text-primary flex items-center justify-center font-bold">
              <ImageIcon className="w-4 h-4" />
            </span>
            <Link href="/" className="text-xs text-on-surface-variant dark:text-slate-300 hover:text-on-surface font-semibold">
              Image Editor
            </Link>
            <span className="text-outline-variant text-xs">/</span>
            <span className="text-sm font-bold text-on-surface dark:text-slate-100 truncate max-w-[280px] sm:max-w-md">
              {selectedFile ? selectedFile.name : 'No image loaded'}
            </span>
          </div>
          {selectedFile && naturalWidth > 0 && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-slate-300 font-mono text-xs">
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-slate-300 hover:bg-surface-container font-semibold text-xs disabled:opacity-40"
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
          <div className="relative bg-slate-50 dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm aspect-[16/10] flex items-center justify-center group select-none border border-outline-variant/30 transition-colors">
            {previewUrl ? (
              <ImageCropPreview src={previewUrl} name={selectedFile?.name || 'Preview'} width={naturalWidth} height={naturalHeight}
                crop={{ x: cropX, y: cropY, width: cropWidth, height: cropHeight }} enabled={showCrop} onCrop={rect => { setCropAspectRatio('custom'); updateCrop(rect); }} onLoad={handleImageLoaded}
                filter={`brightness(${1 + brightness}) contrast(${contrast}) saturate(${saturation}) sepia(${Math.abs(warmth) * 0.3}) hue-rotate(${warmth < 0 ? 180 : 0}deg)`}
                transform={`scale(${zoomLevel / 100}) rotate(${rotateDegrees}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`} />
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center text-center p-8 cursor-pointer hover:opacity-90 transition-opacity"
              >
                <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Click to Upload Image</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm">
                  Drag and drop PNG, JPEG, WebP, AVIF, or BMP images to edit and convert.
                </p>
              </div>
            )}

            {/* Top Right Zoom Controls */}
            {previewUrl && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-surface-container-lowest/90 dark:bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-full shadow-md text-on-surface dark:text-slate-100">
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
                      !showCrop ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant dark:text-slate-300 hover:text-on-surface'
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
                          : 'text-on-surface-variant dark:text-slate-300 hover:text-on-surface'
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
                    className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant dark:text-slate-300 hover:text-on-surface transition-colors"
                    title="Rotate 90° CCW"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotateDegrees((d) => (d + 90) % 360)}
                    className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant dark:text-slate-300 hover:text-on-surface transition-colors"
                    title="Rotate 90° CW"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlipH(!flipH)}
                    className={`w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors ${
                      flipH ? 'bg-primary/20 text-primary' : 'text-on-surface-variant dark:text-slate-300'
                    }`}
                    title="Flip Horizontal"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlipV(!flipV)}
                    className={`w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors ${
                      flipV ? 'bg-primary/20 text-primary' : 'text-on-surface-variant dark:text-slate-300'
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
                      ? 'bg-surface-container-lowest dark:bg-slate-700 text-on-surface dark:text-slate-100 shadow-xs'
                      : 'text-on-surface-variant dark:text-slate-300 hover:text-on-surface'
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
                      ? 'bg-surface-container-lowest dark:bg-slate-700 text-on-surface dark:text-slate-100 shadow-xs'
                      : 'text-on-surface-variant dark:text-slate-300 hover:text-on-surface'
                  }`}
                >
                  <CropIcon className="w-3.5 h-3.5 text-primary" />
                  <span>Transform & Canvas</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetAdjustments}
                className="text-on-surface-variant dark:text-slate-300 hover:text-primary text-xs font-semibold flex items-center gap-1 px-3 py-1 rounded-full hover:bg-surface-container transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Sliders</span>
              </button>
            </div>

            <fieldset disabled={!selectedFile || stage === 'UPLOADING' || stage === 'PROCESSING'} className="space-y-4 ">
              <div className="space-y-2"><h3 className="text-sm font-semibold">Photo Filters</h3>
                <div className="flex flex-wrap gap-2">{IMAGE_FILTERS.map(preset => <button type="button" key={preset.id} aria-pressed={imageFilter === preset.id} onClick={() => applyFilter(preset.id)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold ${imageFilter === preset.id ? 'bg-primary-container text-white' : 'bg-surface-container-low dark:bg-slate-800 text-on-surface dark:text-slate-100'}`}>{preset.label}</button>)}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[
                { name: 'Saturation', value: saturation, min: 0, max: 2, set: setSaturation },
                { name: 'Warmth', value: warmth, min: -1, max: 1, set: setWarmth },
              ].map(control => <label key={control.name} className="text-xs font-semibold space-y-2 block">
                <span className="flex justify-between"><span>{control.name}</span><span>{Math.round(control.value * 100)}%</span></span>
                <input aria-label={control.name} disabled={!selectedFile} type="range" min={control.min} max={control.max} step="0.01" value={control.value}
                  onChange={e => { control.set(Number(e.target.value)); setImageFilter('custom'); }} className="w-full accent-primary dark:accent-violet-400" />
              </label>)}</div>
            </fieldset>

            {/* TAB 1: Light & Color */}
            {activeTab === 'light' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-space-lg gap-y-space-md pt-1">
                {/* Brightness */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-on-surface dark:text-slate-100">Brightness</span>
                    <span className="font-mono text-primary font-bold">
                      {brightness >= 0 ? `+${Math.round(brightness * 100)}` : Math.round(brightness * 100)}
                    </span>
                  </div>
                  <input
                    disabled={!selectedFile} type="range"
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
                    <span className="text-on-surface dark:text-slate-100">Contrast</span>
                    <span className="font-mono text-primary font-bold">
                      {Math.round(contrast * 100)}%
                    </span>
                  </div>
                  <input
                    disabled={!selectedFile} type="range"
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
                <fieldset disabled={!selectedFile} className="space-y-3 ">
                  <h3 className="text-sm font-semibold">Crop & Aspect Ratio</h3>
                  <div className="flex flex-wrap gap-2">{IMAGE_RATIOS.map(ratio => <button key={ratio} type="button" aria-pressed={cropAspectRatio === ratio} onClick={() => handleAspectRatioPreset(ratio)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${cropAspectRatio === ratio ? 'bg-primary-container text-white' : 'bg-surface-container-low dark:bg-slate-800'}`}>{ratio === 'original' ? 'Original' : ratio === 'custom' ? 'Custom' : ratio}</button>)}</div>
                  {showCrop && <p className="text-xs text-on-surface-variant dark:text-slate-300">Drag the corners or edges to crop freely. Drag inside to reposition.</p>}
                  <div className="flex flex-wrap gap-2">{[
                    { name: 'Rotate Left', run: () => setRotateDegrees(v => (v + 270) % 360) },
                    { name: 'Rotate Right', run: () => setRotateDegrees(v => (v + 90) % 360) },
                    { name: 'Flip Horizontal', run: () => setFlipH(v => !v) },
                    { name: 'Flip Vertical', run: () => setFlipV(v => !v) },
                  ].map(tool => <button key={tool.name} type="button" onClick={tool.run} className="rounded-full bg-surface-container-low dark:bg-slate-800 px-3 py-2 text-xs">{tool.name}</button>)}</div>
                </fieldset>


              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Export Inspector (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl shadow-sm border border-outline-variant/30 p-space-lg flex flex-col gap-space-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
              <h2 className="text-base font-bold text-on-surface dark:text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <span>Export Settings</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant dark:bg-slate-800 dark:text-primary font-semibold text-xs">
                Web Ready
              </span>
            </div>

            {/* Target Format Pills */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface dark:text-slate-100 flex items-center justify-between">
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
                        : 'text-on-surface-variant dark:text-slate-300 hover:text-on-surface'
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
                <span className="text-on-surface dark:text-slate-100">Quality Level</span>
                <span className="font-mono text-primary font-bold">{quality}% (Visually Lossless)</span>
              </div>
              <input
                disabled={!selectedFile} type="range"
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
              <label className="text-xs font-semibold text-on-surface dark:text-slate-100">Resolution Scaling</label>
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
                    className="py-1.5 px-1 rounded-xl text-[11px] font-semibold text-on-surface dark:text-slate-100 hover:bg-surface-container-lowest transition-all"
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
                  <div className="flex items-center justify-between text-xs text-on-surface-variant dark:text-slate-300 font-mono">
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
                    className="w-full h-10 rounded-full bg-surface-container-low text-on-surface dark:text-slate-100 text-xs font-semibold hover:bg-surface-container transition-colors"
                  >
                    Edit Another
                  </button>
                </div>
              )}

              {stage === 'FAILED' && (
                <button
                  type="button"
                  onClick={() => setStage('IDLE')}
                  className="w-full h-11 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface dark:text-slate-100 font-semibold text-xs transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
