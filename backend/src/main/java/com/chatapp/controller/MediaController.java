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
    public ResponseEntity<MediaMessage> uploadMedia(@RequestParam("file") MultipartFile file,
                                                    @PathVariable Long groupId) {
        try {
            MediaMessage media = mediaService.saveFile(file, groupId);
            return ResponseEntity.ok(media);
        } catch (IOException e) {
            e.printStackTrace(); 
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/download/{mediaId}")
    public ResponseEntity<FileSystemResource> downloadMedia(@PathVariable Long mediaId) {
        try {
            File file = mediaService.getFile(mediaId);
            MediaMessage metadata = mediaService.getMediaMetadata(mediaId);

            FileSystemResource resource = new FileSystemResource(file);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + metadata.getFileName())
                    .contentLength(metadata.getFileSize())
                    .contentType(MediaType.parseMediaType(metadata.getFileType()))
                    .body(resource);

        } catch (IOException e) {
            e.printStackTrace(); 
            return ResponseEntity.notFound().build();
        }
    }
}
