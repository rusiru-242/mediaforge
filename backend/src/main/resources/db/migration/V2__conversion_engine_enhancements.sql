-- =============================================================================
-- MediaForge — V2 Conversion Engine Enhancements Migration
-- =============================================================================

-- 1. Allow nullable job_id for standalone uploaded media files prior to conversion
ALTER TABLE media_files ALTER COLUMN job_id DROP NOT NULL;

-- 2. Add batch_id to media_jobs for grouping batch conversions
ALTER TABLE media_jobs ADD COLUMN batch_id UUID;
CREATE INDEX idx_media_jobs_batch_id ON media_jobs(batch_id);

-- 3. Enhance conversion_requests with full video, audio, and image parameters
ALTER TABLE conversion_requests ADD COLUMN video_bitrate VARCHAR(20);
ALTER TABLE conversion_requests ADD COLUMN frame_rate INTEGER;
ALTER TABLE conversion_requests ADD COLUMN video_codec VARCHAR(20);
ALTER TABLE conversion_requests ADD COLUMN audio_codec VARCHAR(20);
ALTER TABLE conversion_requests ADD COLUMN sample_rate INTEGER;
ALTER TABLE conversion_requests ADD COLUMN audio_channels INTEGER;
ALTER TABLE conversion_requests ADD COLUMN quality_preset VARCHAR(20);
ALTER TABLE conversion_requests ADD COLUMN remove_audio BOOLEAN DEFAULT FALSE;
ALTER TABLE conversion_requests ADD COLUMN image_width INTEGER;
ALTER TABLE conversion_requests ADD COLUMN image_height INTEGER;
ALTER TABLE conversion_requests ADD COLUMN image_quality INTEGER;
ALTER TABLE conversion_requests ADD COLUMN image_rotation INTEGER;
ALTER TABLE conversion_requests ADD COLUMN strip_metadata BOOLEAN DEFAULT TRUE;
ALTER TABLE conversion_requests ADD COLUMN custom_options_json TEXT;
