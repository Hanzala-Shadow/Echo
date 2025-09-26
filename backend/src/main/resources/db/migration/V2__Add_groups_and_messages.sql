--  Add online status to users
ALTER TABLE users
ADD COLUMN online_status BOOLEAN DEFAULT FALSE;

--  Groups table (1-on-1 and group chats)
CREATE TABLE groups (
    group_id SERIAL PRIMARY KEY,
    group_name VARCHAR(255),
    created_by BIGINT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    is_direct BOOLEAN DEFAULT FALSE  -- TRUE = 1-on-1 chat
);

--  Group Members table
CREATE TABLE group_members (
    group_id BIGINT REFERENCES groups(group_id),
    user_id BIGINT REFERENCES users(user_id),
    joined_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY(group_id, user_id)
);

--  Messages table (per group, no delivered field)
CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    sender_id BIGINT REFERENCES users(user_id),
    group_id BIGINT REFERENCES groups(group_id),
    content TEXT NOT NULL,               -- ciphertext to be added in Phase 3
    created_at TIMESTAMP DEFAULT NOW()
);

--  Message Delivery table (tracks offline messages per user)
CREATE TABLE message_delivery (
    message_id BIGINT REFERENCES messages(message_id),
    user_id BIGINT REFERENCES users(user_id),
    delivered BOOLEAN DEFAULT FALSE,      -- FALSE = offline, TRUE = delivered
    PRIMARY KEY(message_id, user_id)
);
