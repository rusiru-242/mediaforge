package com.mediaforge.backend.downloader.model;

@FunctionalInterface
public interface ProgressCallback {
    void onProgress(DownloadProgress progress);
}
