-- Add AI enabled flag to groups table
ALTER TABLE groups ADD COLUMN ai_enabled BOOLEAN DEFAULT FALSE;

-- Update existing groups to have AI disabled by default
UPDATE groups SET ai_enabled = FALSE WHERE ai_enabled IS NULL;