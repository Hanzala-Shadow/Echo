package com.chatapp.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "media_message")
public class MediaMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "media_id")
    private Long mediaId;

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false)
    private String fileType;

    @Column(nullable = false)
    private Long fileSize;

    @Column(nullable = false)
    private String filePath;

    @Column(nullable = false)
    private Instant uploadedAt;

    @Column(name = "group_id")
    private Long groupId;

    @Column(nullable = false)
    private String iv; 

    // Getters and setters...
    public Long getMediaId() { return mediaId; }
    public void setMediaId(Long mediaId) { this.mediaId = mediaId; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

    public Instant getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(Instant uploadedAt) { this.uploadedAt = uploadedAt; }

    public Long getGroupId() { return groupId; }
    public void setGroupId(Long groupId) { this.groupId = groupId; }

    public String getIv() { return iv; }
    public void setIv(String iv) { this.iv = iv; }
}