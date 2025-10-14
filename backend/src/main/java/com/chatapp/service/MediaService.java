package com.chatapp.service;

import com.chatapp.model.MediaMessage;
import com.chatapp.repository.MediaMessageRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;

@Service
public class MediaService {

    private final MediaMessageRepository mediaMessageRepository;

    @Value("${chatapp.upload-dir}")
    private String uploadDir;

    public MediaService(MediaMessageRepository mediaMessageRepository) {
        this.mediaMessageRepository = mediaMessageRepository;
    }

    public MediaMessage saveFile(MultipartFile file, Long groupId) throws IOException {
        String originalFileName = file.getOriginalFilename();
        String timestampedName = Instant.now().toEpochMilli() + "_" + originalFileName;

        // Base upload path (absolute)
        Path basePath = Paths.get(uploadDir).toAbsolutePath();

        // Group-specific folder
        Path groupPath = basePath.resolve(String.valueOf(groupId));
        Files.createDirectories(groupPath); // Creates folder if not exists

        // File path inside group folder
        Path filePath = groupPath.resolve(timestampedName);

        // Save the file
        file.transferTo(filePath.toFile());

        // Save metadata
        MediaMessage mediaMessage = new MediaMessage();
        mediaMessage.setFileName(originalFileName);
        mediaMessage.setFileType(file.getContentType());
        mediaMessage.setFileSize(file.getSize());
        mediaMessage.setFilePath(filePath.toString());
        mediaMessage.setUploadedAt(Instant.now());
        mediaMessage.setGroupId(groupId);

        return mediaMessageRepository.save(mediaMessage);
    }

    public File getFile(Long mediaId) throws IOException {
        MediaMessage media = mediaMessageRepository.findById(mediaId)
                .orElseThrow(() -> new IOException("Media not found"));

        return new File(media.getFilePath());
    }

    public MediaMessage getMediaMetadata(Long mediaId) throws IOException {
        return mediaMessageRepository.findById(mediaId)
                .orElseThrow(() -> new IOException("Media not found"));
    }
}
