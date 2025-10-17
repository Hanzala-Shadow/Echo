-- Allow content to be NULL
ALTER TABLE messages
ALTER COLUMN content DROP NOT NULL;


ALTER TABLE messages
ADD CONSTRAINT chk_message_content_or_media
CHECK (
    (content IS NOT NULL) OR (media_id IS NOT NULL)
);
