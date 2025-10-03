-- media_message table
CREATE TABLE media_message (
    media_id BIGSERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    group_id BIGINT REFERENCES groups(group_id) ON DELETE CASCADE
);

-- indexes
CREATE INDEX idx_media_group ON media_message(group_id);
CREATE INDEX idx_media_uploaded_at ON media_message(uploaded_at);

--Add column in messages table
ALTER TABLE messages
ADD COLUMN media_id BIGINT;

-- Set foreign key constraint to link messages to media_message
ALTER TABLE messages
ADD CONSTRAINT fk_message_media
FOREIGN KEY (media_id) REFERENCES media_message(media_id)
ON DELETE SET NULL;

-- index for faster media lookups
CREATE INDEX idx_message_media ON messages(media_id);