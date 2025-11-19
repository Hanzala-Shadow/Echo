#!/bin/bash

echo "🚀 Starting Echo Chat Refactor..."

# 1. Create the new directory structure
echo "📂 Creating new folders..."
mkdir -p src/pages
mkdir -p src/features/auth
mkdir -p src/features/chat
mkdir -p src/features/groups
mkdir -p src/features/friends
mkdir -p src/features/networks
mkdir -p src/components/ui
mkdir -p src/components/layout

# 2. Remove the redundant/broken file
echo "🗑️ Removing redundant components..."
# This file was a duplicate of src/components/Auth/Login.jsx and had broken imports
if [ -f "src/components/Login.jsx" ]; then
    rm src/components/Login.jsx
fi

# 3. Move Pages (Route Views)
echo "🚚 Moving Pages..."
# Moving Route components to src/pages
mv src/components/Dashboard.jsx src/pages/Dashboard.jsx
mv src/components/Auth/Login.jsx src/pages/Login.jsx
mv src/components/Auth/Register.jsx src/pages/Register.jsx
mv src/components/Chat/GroupChatPage.jsx src/pages/GroupChatPage.jsx
mv src/components/Chat/GroupChatLanding.jsx src/pages/LandingPage.jsx

# 4. Move Business Logic (Features)
echo "🚚 Moving Features..."

# Groups Feature
mv src/components/Chat/GroupSidebar.jsx src/features/groups/
mv src/components/Chat/AddMemberModal.jsx src/features/groups/
# Move everything inside Chat/Groups to features/groups
if [ -d "src/components/Chat/Groups" ]; then
    mv src/components/Chat/Groups/* src/features/groups/
fi

# Friends Feature
if [ -d "src/components/Friends" ]; then
    mv src/components/Friends/* src/features/friends/
fi

# Networks Feature
if [ -d "src/components/Networks" ]; then
    mv src/components/Networks/* src/features/networks/
fi

# Chat Feature (Core messaging logic)
mv src/components/Chat/ChatContainer.jsx src/features/chat/
mv src/components/Chat/DMContainer.jsx src/features/chat/
mv src/components/Chat/MessageList.jsx src/features/chat/
mv src/components/Chat/MessageInput.jsx src/features/chat/
mv src/components/Chat/MessageBubble.jsx src/features/chat/
mv src/components/Chat/ChatHeader.jsx src/features/chat/
mv src/components/Chat/DMSidebar.jsx src/features/chat/
mv src/components/Chat/UserSidebar.jsx src/features/chat/
mv src/components/Chat/FileUpload.jsx src/features/chat/
mv src/components/Chat/AuthenticatedImage.jsx src/features/chat/
mv src/components/Chat/InfoWidget.jsx src/features/chat/

# Auth Feature (Logic/Guards)
mv src/components/ProtectedRoute.jsx src/features/auth/

# 5. Move Shared Components (Dumb UI)
echo "🚚 Moving Shared UI..."
# Move Common contents to UI
if [ -d "src/components/Common" ]; then
    mv src/components/Common/* src/components/ui/
fi

# Move standalone UI components
mv src/components/ThemeToggle.jsx src/components/ui/
mv src/components/TimestampTest.jsx src/components/ui/

# Move Layout components
mv src/components/RetroCharacter.jsx src/components/layout/

# 6. Cleanup empty folders
echo "🧹 Cleaning up empty directories..."
rmdir src/components/Auth 2>/dev/null
rmdir src/components/Chat/Groups 2>/dev/null
rmdir src/components/Chat 2>/dev/null
rmdir src/components/Common 2>/dev/null
rmdir src/components/Friends 2>/dev/null
rmdir src/components/Networks 2>/dev/null

echo "✅ Refactor complete! Structure is now organized."
echo "⚠️  NEXT STEP: You must update your imports in App.jsx and other files to match the new paths."