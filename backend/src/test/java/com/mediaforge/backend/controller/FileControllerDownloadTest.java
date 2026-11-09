package com.mediaforge.backend.controller;

import com.mediaforge.backend.downloader.service.MediaStorageService;
import com.mediaforge.backend.entity.MediaFile;
import com.mediaforge.backend.security.SecurityConfig;
import com.mediaforge.backend.service.FileService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FileController.class)
@Import(SecurityConfig.class)
class FileControllerDownloadTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FileService fileService;

    @MockitoBean
    private MediaStorageService storageService;

    @Test
    @DisplayName("GET /api/v1/files/{id}/download should stream file with Content-Disposition")
    void testDownloadFile() throws Exception {
        UUID fileId = UUID.randomUUID();
        MediaFile mediaFile = new MediaFile(
                fileId,
                null,
                "presentation.mp4",
                fileId + ".mp4",
                "media/" + fileId + ".mp4",
                "video/mp4",
                12L,
                OffsetDateTime.now().plusHours(24)
        );

        byte[] content = "video-sample".getBytes();
        ByteArrayResource resource = new ByteArrayResource(content);

        when(storageService.getMediaFile(fileId)).thenReturn(mediaFile);
        when(storageService.loadAsResource(fileId)).thenReturn(resource);

        mockMvc.perform(get("/api/v1/files/{id}/download", fileId))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.valueOf("video/mp4")))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"presentation.mp4\""))
                .andExpect(content().bytes(content));
    }
}

