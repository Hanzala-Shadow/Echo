-- Encryption Key Tables

-- 1) USER KEYS TABLE (includes encrypted private key for password backup)
CREATE TABLE user_keys (
user_id BIGINT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
public_key TEXT NOT NULL,
encrypted_private_key TEXT NOT NULL,
nonce TEXT NOT NULL,
salt TEXT NOT NULL,
created_at TIMESTAMP DEFAULT NOW()
);


-- 2) GROUP PUBLIC KEY TABLE (one row per group)
CREATE TABLE group_public_keys (
group_id BIGINT PRIMARY KEY REFERENCES groups(group_id) ON DELETE CASCADE,
group_public_key TEXT NOT NULL,
created_at TIMESTAMP DEFAULT NOW()
);


-- 3) GROUP MEMBER ENCRYPTED KEYS (one encrypted copy of group private key per member)
CREATE TABLE group_keys (
id BIGSERIAL PRIMARY KEY,
group_id BIGINT NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
encrypted_group_private_key TEXT NOT NULL,
nonce TEXT NOT NULL,
created_at TIMESTAMP DEFAULT NOW(),
UNIQUE (group_id, user_id)
);


-- Indexes
CREATE INDEX idx_group_keys_group_id ON group_keys(group_id);
CREATE INDEX idx_group_keys_user_id ON group_keys(user_id);
CREATE INDEX idx_user_keys_created_at ON user_keys(created_at);
CREATE INDEX idx_group_public_keys_created_at ON group_public_keys(created_at);