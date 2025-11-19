package com.chatapp.controller;

import com.chatapp.model.MediaMessage;
import com.chatapp.service.MediaService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;

@RestController
@RequestMapping("/media")
public class MediaController {

    private final MediaService mediaService;

    public MediaController(MediaService mediaService) {
        this.mediaService = mediaService;
    }

    @PostMapping("/upload/{groupId}")
    public ResponseEntity<?> uploadMedia(
            @RequestParam("file") MultipartFile file,
            @RequestParam("iv") String iv,
            @PathVariable Long groupId) {
        try {
            // Validate IV
            if (iv == null || iv.isBlank()) {
                return ResponseEntity.badRequest()
                        .body("IV (Initialization Vector) is required for encryption");
            }

            MediaMessage media = mediaService.saveFile(file, groupId, iv);
            return ResponseEntity.ok(media);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Upload failed: " + e.getMessage());
        }
    }

    @GetMapping("/download/{mediaId}")
    public ResponseEntity<FileSystemResource> downloadMedia(@PathVariable Long mediaId) {
        try {
            File file = mediaService.getFile(mediaId);
            MediaMessage metadata = mediaService.getMediaMetadata(mediaId);

            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }

            FileSystemResource resource = new FileSystemResource(file);

            // Safely determine file type
            String contentType = metadata.getFileType();
            if (contentType == null || contentType.isBlank()) {
                contentType = "application/octet-stream";
            }

            // Properly quoted filename for safe download
            String filename = metadata.getFileName().replace("\"", "");

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .header(HttpHeaders.EXPIRES, "0")
                    .contentLength(file.length())
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/info/{mediaId}")
    public ResponseEntity<?> getMediaInfo(@PathVariable Long mediaId) {
        try {
            MediaMessage metadata = mediaService.getMediaMetadata(mediaId);
            return ResponseEntity.ok(metadata);
        } catch (IOException e) {
            return ResponseEntity.notFound().build();
        }
    }
}