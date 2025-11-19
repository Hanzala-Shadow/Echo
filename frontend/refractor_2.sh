#!/bin/bash

echo "🚀 Starting Echo Chat Refactor - Part 2 (Logic & Naming)..."

# 1. Rename ChatContainer to GroupChatContainer (Clarity)
# It handles groups, so let's name it that way.
if [ -f "src/features/chat/ChatContainer.jsx" ]; then
    echo "Rg Renaming ChatContainer.jsx -> GroupChatContainer.jsx..."
    mv src/features/chat/ChatContainer.jsx src/features/chat/GroupChatContainer.jsx
else
    echo "⚠️  ChatContainer.jsx not found in features/chat. Did you run Part 1?"
fi

# 2. Move Data Access Layer (Structure)
# apis.js is a service, not a utility.
if [ -f "src/utils/apis.js" ]; then
    echo "🚚 Moving utils/apis.js -> services/api.js..."
    mv src/utils/apis.js src/services/api.js
else
    echo "⚠️  src/utils/apis.js not found. Check if it was already moved."
fi

echo "✅ Part 2 complete! File structure is now perfect."