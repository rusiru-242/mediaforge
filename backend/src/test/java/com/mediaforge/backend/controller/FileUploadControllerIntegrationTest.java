package com.mediaforge.backend.controller;

import com.mediaforge.backend.converter.service.ConversionStorageService;
import com.mediaforge.backend.downloader.service.MediaStorageService;
import com.mediaforge.backend.entity.MediaFile;
import com.mediaforge.backend.security.SecurityConfig;
import com.mediaforge.backend.service.FileService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FileController.class)
@Import(SecurityConfig.class)
class FileUploadControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FileService fileService;

    @MockitoBean
    private MediaStorageService storageService;

    @MockitoBean
    private ConversionStorageService conversionStorageService;

    @Test
    @DisplayName("POST /api/v1/files/upload should accept multipart file and return 201 CREATED")
    void testUploadFile() throws Exception {
        UUID fileId = UUID.randomUUID();
        MediaFile saved = new MediaFile(
                fileId,
                null,
                "sample.png",
                fileId + ".png",
                "uploads/" + fileId + ".png",
                "image/png",
                1024L,
                OffsetDateTime.now().plusHours(24)
        );

        when(conversionStorageService.storeUploadedFile(any())).thenReturn(saved);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "sample.png",
                "image/png",
                new byte[]{(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}
        );

        mockMvc.perform(multipart("/api/v1/files/upload").file(file))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileId").value(fileId.toString()))
                .andExpect(jsonPath("$.originalFilename").value("sample.png"))
                .andExpect(jsonPath("$.fileSize").value(1024));
    }
}
