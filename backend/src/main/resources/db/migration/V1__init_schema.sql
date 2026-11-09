-- =============================================================================
-- MediaForge — V1 Initial Database Schema Migration
-- =============================================================================

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ROLE_USER',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Media Jobs Table
CREATE TABLE media_jobs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    job_type VARCHAR(20) NOT NULL,
    source_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    progress INTEGER NOT NULL DEFAULT 0,
    input_format VARCHAR(20),
    output_format VARCHAR(20) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_progress_range CHECK (progress >= 0 AND progress <= 100),
    CONSTRAINT chk_job_status CHECK (status IN ('PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    CONSTRAINT chk_job_type CHECK (job_type IN ('DOWNLOAD', 'CONVERSION')),
    CONSTRAINT chk_source_type CHECK (source_type IN ('URL', 'UPLOAD'))
);

-- 3. Media Files Table
CREATE TABLE media_files (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES media_jobs(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 4. Download Requests Table
CREATE TABLE download_requests (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES media_jobs(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    platform VARCHAR(50) NOT NULL,
    selected_format VARCHAR(20) NOT NULL,
    selected_quality VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Conversion Requests Table
CREATE TABLE conversion_requests (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES media_jobs(id) ON DELETE CASCADE,
    input_file_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
    output_format VARCHAR(20) NOT NULL,
    target_resolution VARCHAR(20),
    audio_bitrate INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Job Events Table
CREATE TABLE job_events (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES media_jobs(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Query Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

CREATE INDEX idx_media_jobs_user_id ON media_jobs(user_id);
CREATE INDEX idx_media_jobs_status ON media_jobs(status);
CREATE INDEX idx_media_jobs_created_at ON media_jobs(created_at DESC);

CREATE INDEX idx_media_files_job_id ON media_files(job_id);
CREATE INDEX idx_media_files_storage_key ON media_files(storage_key);

CREATE INDEX idx_download_requests_job_id ON download_requests(job_id);
CREATE INDEX idx_conversion_requests_job_id ON conversion_requests(job_id);
CREATE INDEX idx_job_events_job_id ON job_events(job_id);

