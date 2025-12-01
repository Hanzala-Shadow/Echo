import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ApiClient from '../../services/api';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserSidebar from './UserSidebar';
import ChatHeader from './ChatHeader';
import useRealTimeUserStatus from '../../hooks/useRealTimeUserStatus';

import GroupSidebar from '../groups/GroupSidebar';
import GroupCreateModal from '../groups/GroupCreateModal';
import AddMemberModal from '../groups/AddMemberModal';

import AiResultModal from './AI_ResultModal';

const ChatContainer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, isWebSocketConnected, webSocketMessages, sendWebSocketMessage, joinGroup, leaveGroup, showNotification, sendTypingIndicator, typingUsers } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [activeGroup, setActiveGroup] = useState(null);
  const [showGroupSidebar, setShowGroupSidebar] = useState(true);
  const [showUserSidebar, setShowUserSidebar] = useState(true);
  const [groups, setGroups] = useState([]);
  const [localMessages, setLocalMessages] = useState([]);
  const [loadedGroups, setLoadedGroups] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]); 
  const messagesEndRef = useRef(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showMobileAiTools, setShowMobileAiTools] = useState(false);

  const [showAiResultModal, setShowAiResultModal] = useState(false);
  const [aiResultData, setAiResultData] = useState(null);
  const [aiResultType, setAiResultType] = useState(null);

  // Helper for initials
  const getInitials = (name) => {
    return name
      ? name.split(" ").map(word => word[0]).join("").toUpperCase().slice(0, 2)
      : "?";
  };

  const typingStatusString = useMemo(() => {
    if (!activeGroup || !typingUsers[activeGroup.id]) return null;
    
    const typingUserIds = Object.keys(typingUsers[activeGroup.id]);
    if (typingUserIds.length === 0) return null;

    const names = typingUserIds.map(id => {
      const member = groupMembers.find(m => String(m.userId) === String(id));
      return member ? member.name : `User ${id}`;
    });

    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    if (names.length > 2) return `${names[0]}, ${names[1]} and ${names.length - 2} others are typing...`;
    return null;
  }, [activeGroup, typingUsers, groupMembers]);

  const groupMemberUsernames = useMemo(() =>
    groupMembers.map(member => member.username).filter(Boolean),
    [groupMembers.map(m => m.username).sort().join(',')]
  );

  const { getUserStatus } = useRealTimeUserStatus(groupMemberUsernames);
  const [showLeaveGroupConfirm, setShowLeaveGroupConfirm] = useState(false);

  useEffect(() => {
    if (groupMembers.length === 0) return;

    setGroupMembers(prevMembers => {
      let hasChanges = false;
      const updatedMembers = prevMembers.map(member => {
        if (member.userId === user?.userId) {
          if (member.status !== 'online') {
            hasChanges = true;
            return { ...member, status: 'online' };
          }
          return member;
        }

        const { isOnline } = getUserStatus(member.username);
        const newStatus = isOnline ? 'online' : 'offline';

        if (member.status !== newStatus) {
          hasChanges = true;
          return { ...member, status: newStatus };
        }
        return member;
      });

      return hasChanges ? updatedMembers : prevMembers;
    });
  }, [groupMembers, getUserStatus, user?.userId]);

  useEffect(() => {
    if (groupMembers.length === 0) return;

    const onlineCount = groupMembers.filter(member => member.status === 'online').length;

    setGroups(prevGroups => {
      const needsUpdate = prevGroups.some(group => group.isOnline !== (onlineCount > 0));
      return needsUpdate ? prevGroups.map(group => ({
        ...group,
        isOnline: onlineCount > 0,
        onlineCount: onlineCount
      })) : prevGroups;
    });
  }, [groupMembers, user?.userId]);

  const realTimeMessages = webSocketMessages;
  const isConnected = isWebSocketConnected;
  const sendMessage = sendWebSocketMessage;

  const allMessages = useMemo(() => {
    if (!activeGroup || !activeGroup.id) {
      return [];
    }
    const groupId = activeGroup.id;
    const localGroupMessages = localMessages.filter(msg => String(msg.groupId) === String(groupId));
    const realtimeGroupMessages = realTimeMessages.filter(msg => String(msg.groupId) === String(groupId));

    const messageMap = new Map();
    localGroupMessages.forEach(msg => messageMap.set(String(msg.id || ''), msg));
    realtimeGroupMessages.forEach(msg => messageMap.set(String(msg.id || ''), msg));

    const allGroupMessages = Array.from(messageMap.values());
    return allGroupMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [localMessages, realTimeMessages, activeGroup]);

  useEffect(() => {
    if (!activeGroup || !user) return;

    const newMessages = webSocketMessages.filter(msg => {
      return msg.groupId === activeGroup.id &&
        msg.senderId !== user.userId &&
        (new Date() - new Date(msg.timestamp)) < 5000;
    });

    newMessages.forEach(msg => {
      showNotification(
        `New message from ${msg.senderName || 'User'}`,
        msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content
      );
    });
  }, [webSocketMessages, activeGroup, user, showNotification]);

  useEffect(() => {
    const fetchUserGroups = async () => {
      if (!token || !user?.userId) return;

      setLoading(true);
      try {
        const userGroups = await ApiClient.chat.getGroups();
        const groupChats = userGroups.filter(group => {
          const memberCount = group.memberCount || group.member_count || 0;
          return !group.isDirect && memberCount > 0;
        });

        const transformedGroups = groupChats.map(group => {
          const groupId = group.groupId || group.group_id || group.id;
          const groupName = group.groupName || group.group_name || group.name || `Group ${groupId}`;
          const memberCount = group.memberCount;

          return {
            id: groupId,
            name: groupName,
            description: group.description || 'No description',
            memberCount: memberCount,
            isOnline: false,
            createdBy: group.createdBy || group.created_by,
            isDirect: group.isDirect || group.is_direct || false,
            aiEnabled: group.aiEnabled || group.ai_enabled || false
          };
        });

        setGroups(transformedGroups);

        if (location.state?.groupId) {
          const groupToSelect = transformedGroups.find(g => g.id === location.state.groupId);
          if (groupToSelect) {
            handleGroupSelect(groupToSelect);
          }
          window.history.replaceState({}, document.title, location.pathname);
        }

        if (location.state?.createGroup) {
          setIsCreateModalOpen(true);
          window.history.replaceState({}, document.title, location.pathname);
        }
      } catch (error) {
        console.error('❌ Error fetching groups:', error);
        setLoading(false);
      }
    };

    fetchUserGroups();
  }, [token, user?.userId]);

  const loadGroupMessages = useCallback(async (groupId) => {
    if (!groupId || !token) return;
    if (loadedGroups.has(groupId)) return;

    setLoading(true);
    try {
      const messageHistory = await ApiClient.chat.getGroupMessages(groupId);
      let messagesArray = [];

      if (Array.isArray(messageHistory)) {
        messagesArray = messageHistory;
      } else if (messageHistory && Array.isArray(messageHistory.messages)) {
        messagesArray = messageHistory.messages;
      } else if (messageHistory && messageHistory.content) {
        messagesArray = messageHistory.content;
      } else {
        messagesArray = messageHistory || [];
      }

      const transformedMessages = messagesArray.map((msg, index) => {
        let media = null;
        if (msg.media && typeof msg.media === 'object' && msg.media !== null) {
          const mediaObj = msg.media;
          const mediaId = mediaObj.media_id || mediaObj.id || mediaObj.mediaId;
          if (mediaId) {
            media = {
              media_id: mediaId,
              id: mediaId,
              mediaId: mediaId,
              file_name: mediaObj.file_name || mediaObj.fileName,
              fileName: mediaObj.file_name || mediaObj.fileName,
              file_type: mediaObj.file_type || mediaObj.fileType,
              fileType: msg.file_type || msg.fileType,
              file_size: msg.file_size || msg.fileSize,
              fileSize: msg.file_size || msg.fileSize
            };
          }
        } else if (msg.media_id || msg.mediaId) {
          const mediaId = msg.media_id || msg.mediaId;
          if (mediaId) {
            media = {
              media_id: mediaId,
              id: mediaId,
              mediaId: mediaId,
              file_name: msg.file_name || msg.fileName,
              fileName: msg.file_name || msg.fileName,
              file_type: msg.file_type || msg.fileType,
              fileType: msg.file_type || msg.fileType,
              file_size: msg.file_size || msg.fileSize,
              fileSize: msg.file_size || msg.fileSize
            };
          }
        }

        return {
          id: msg.messageId || msg.message_id || msg.id || `hist-${groupId}-${index}`,
          content: msg.content || msg.message || '',
          senderId: msg.senderId || msg.sender_id || msg.userId,
          senderName: msg.senderName || msg.sender_name || msg.username || msg.userName || `User ${msg.senderId || msg.sender_id || msg.userId}`,
          timestamp: new Date(msg.createdAt || msg.created_at || msg.timestamp || Date.now()),
          type: 'text',
          groupId: groupId,
          isCurrentUser: (msg.senderId || msg.sender_id || msg.userId) === user?.userId,
          status: 'delivered',
          media: media
        };
      });

      setLocalMessages(prev => {
        const filtered = prev.filter(msg => msg.groupId !== groupId);
        return [...filtered, ...transformedMessages];
      });

      setLoadedGroups(prev => {
        if (prev.has(groupId)) return prev;
        return new Set([...prev, groupId]);
      });

    } catch (error) {
      console.error(`❌ [CHAT_CONTAINER] Error fetching group messages for group ${groupId}:`, error);
    } finally {
      setLoading(false);
    }
  }, [token, user?.userId, loadedGroups]);

  const handleGroupSelect = useCallback(async (group) => {
    if (!group || !group.id) return;

    if (activeGroup && activeGroup.id !== group.id) {
      leaveGroup(activeGroup.id);
      setLocalMessages([]);
      setLoadedGroups(new Set());
    }

    setActiveGroup(group);
    localStorage.setItem('activeGroupId', group.id);
    joinGroup(group.id);
    await loadGroupMessages(group.id);
  }, [activeGroup, leaveGroup, joinGroup, loadGroupMessages]);

  useEffect(() => {
    const savedGroupId = localStorage.getItem('activeGroupId');
    if (savedGroupId && groups.length > 0 && !activeGroup) {
      const group = groups.find(g => String(g.id) === String(savedGroupId));
      if (group) {
        handleGroupSelect(group);
      }
    }
  }, [groups, activeGroup, handleGroupSelect]);

  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (!activeGroup || !activeGroup.id || !token) {
        setGroupMembers([]);
        return;
      }

      try {
        const membersData = await ApiClient.chat.getGroupMembers(activeGroup.id);
        const members = membersData?.members || [];
        const memberDetails = [];
        
        for (const member of members) {
          try {
            const memberId = member.user_id;
            const userDetails = await ApiClient.users.getProfile(memberId);
            memberDetails.push({
              userId: memberId,
              name: userDetails.username || `User ${memberId}`,
              username: userDetails.username || `user${memberId}`,
              email: userDetails.email || '',
              status: memberId === user?.userId ? 'online' : 'offline'
            });
          } catch (error) {
            memberDetails.push({
              userId: member.user_id,
              name: `User ${member.user_id}`,
              username: `user${member.user_id}`,
              email: '',
              status: 'offline'
            });
          }
        }
        setGroupMembers(memberDetails);
      } catch (error) {
        console.error('❌ Error fetching group members:', error);
        setGroupMembers([]);
      }
    };

    fetchGroupMembers();
  }, [activeGroup, token]);

  const handleSendMessage = ({ content, media }) => {
    if (!activeGroup) return;

    const hasContent = content && content.trim() !== '';
    const hasMedia = media && Object.keys(media).length > 0;

    if (!hasContent && !hasMedia) return;

    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage = {
      id: tempId,
      content: hasContent ? content.trim() : '',
      senderId: user.userId,
      senderName: user.username || "You",
      timestamp: new Date(),
      type: 'text',
      groupId: activeGroup.id,
      status: 'pending',
      isCurrentUser: true,
      media: hasMedia ? media : null
    };

    setLocalMessages(prev => [...prev, optimisticMessage]);

    const success = sendMessage({
      groupId: activeGroup.id,
      content: hasContent ? content.trim() : "",
      media: hasMedia ? media : null
    });

    if (!success) {
      setLocalMessages(prev =>
        prev.map(msg => msg.id === tempId ? { ...msg, status: 'failed' } : msg)
      );
    }
  };

  const handleCreateGroup = () => {
    setIsCreateModalOpen(true);
  };

  const handleGroupCreated = async (newGroup) => {
    setGroups(prev => [...prev, newGroup]);
    handleGroupSelect(newGroup);
    setIsCreateModalOpen(false);
  };

  useEffect(() => {
    return () => {
      if (activeGroup) {
        leaveGroup(activeGroup.id);
      }
      setLocalMessages([]);
      setLoadedGroups(new Set());
    };
  }, [activeGroup]);

  useEffect(() => {
    if (!activeGroup || !user) return;

    const confirmedOptimisticIds = new Set();

    realTimeMessages.forEach(wsMsg => {
      localMessages.forEach(localMsg => {
        const isOptimistic = typeof localMsg.id === 'string' && localMsg.id.startsWith('optimistic-');
        if (isOptimistic &&
          localMsg.content === wsMsg.content &&
          localMsg.groupId === wsMsg.groupId &&
          Math.abs(new Date(localMsg.timestamp) - new Date(wsMsg.timestamp)) < 3000) {
          confirmedOptimisticIds.add(localMsg.id);
        }
      });
    });

    if (confirmedOptimisticIds.size > 0) {
      setLocalMessages(prev =>
        prev.filter(msg => !confirmedOptimisticIds.has(msg.id))
      );
    }
  }, [realTimeMessages, localMessages, activeGroup, user]);

  const handleAiAction = async (actionType) => {
    if (!activeGroup?.id) return;

    const textMessages = allMessages
      .filter(msg => msg.type === 'text' && msg.content)
      .map(msg => ({
        sender_name: msg.senderName,
        content: msg.content,
        time_stamp: msg.timestamp
      }))
      .slice(-50);

    try {
      if (actionType === 'summarize') {
        const result = await ApiClient.ai.summarize(activeGroup.id, textMessages);
        setAiResultData(result);
        setAiResultType('summarize');
        setShowAiResultModal(true);
      }
      else if (actionType === 'deadlines') {
        const result = await ApiClient.ai.extractDeadlines(activeGroup.id, textMessages);
        setAiResultData(result);
        setAiResultType('deadlines');
        setShowAiResultModal(true);
      }
    } catch (error) {
      showNotification("Failed to perform AI action: " + (error.message || 'Unknown Error'), 'error');
    }
  };

  useEffect(() => {
    if (activeGroup) {
      if (window.innerWidth < 640) {
        setShowGroupSidebar(false);
        setShowUserSidebar(false);
        setShowMobileAiTools(false);
      }
    }
  }, [activeGroup]);

  useEffect(() => {
    if (!activeGroup || allMessages.length === 0) return;
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [allMessages, activeGroup]);

  const lastMessage = allMessages.length > 0 ? allMessages[allMessages.length - 1] : null;

  const handleTyping = useCallback((isTyping) => {
    if (!activeGroup) return;
    sendTypingIndicator(activeGroup.id, isTyping);
  }, [activeGroup, sendTypingIndicator]);

  const handleLeaveGroup = async () => {
    if (!activeGroup) return;
    setShowLeaveGroupConfirm(true);
  };

  const confirmLeaveGroup = async () => {
    if (!activeGroup) return;
    try {
      await ApiClient.chat.leaveGroup(activeGroup.id);
      showNotification('Left group successfully', 'success');
      setShowLeaveGroupConfirm(false);
      setActiveGroup(null);
      setLocalMessages([]);
      setLoadedGroups(new Set());
      localStorage.removeItem('activeGroupId');
      setGroups(prev => prev.filter(g => g.id !== activeGroup.id));
    } catch (error) {
      showNotification('Failed to leave group: ' + (error.message || 'Unknown error'), 'error');
      setShowLeaveGroupConfirm(false);
    }
  };

  const cancelLeaveGroup = () => {
    setShowLeaveGroupConfirm(false);
  };

  return (
    <div className="fixed inset-0 flex flex-col sm:flex-row theme-bg animate-slide-in-right overflow-hidden">
      {/* Group Sidebar */}
      <div
        className={`transition-all duration-300 ${showGroupSidebar ? 'w-full sm:w-80 absolute z-30 inset-0 sm:static' : 'w-0 absolute sm:static'} overflow-hidden border-r theme-border sm:block animate-slide-in-left`}
          style={{
          height: showGroupSidebar ? '100%' : '0',
          zIndex: showGroupSidebar ? 30 : -1
        }}
      >
        {showGroupSidebar && (
          <GroupSidebar
            groups={groups}
            activeGroupId={activeGroup?.id}
            onGroupSelect={handleGroupSelect}
            onCreateGroup={handleCreateGroup}
            isDarkMode={isDarkMode}
            colors={colors}
            loading={loading}
            currentUserId={user?.userId}
            onGroupLeft={(groupId) => {
              setGroups(prev => prev.filter(group => group.id !== groupId));
              if (activeGroup?.id === groupId) {
                setActiveGroup(null);
                setLocalMessages([]);
                setLoadedGroups(new Set());
              }
            }}
            typingUsers={typingUsers}
          />
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0 theme-bg h-full relative">
        
        {/* ✅ FIXED: Enhanced Mobile Header - Fixed to top */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-3 border-b theme-border sm:hidden backdrop-blur-md bg-opacity-95 h-16" style={{ backgroundColor: colors.surface }}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {activeGroup ? (
              // Back Button
              <button
                onClick={() => {
                  setActiveGroup(null);
                  localStorage.removeItem('activeGroupId');
                  setShowGroupSidebar(true);
                  setShowUserSidebar(false);
                  setLocalMessages([]);
                  setLoadedGroups(new Set());
                }}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="Back to Groups"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
            ) : (
              // Menu Buttons
              <>
                <button
                  onClick={() => { setShowGroupSidebar(!showGroupSidebar); setShowUserSidebar(false); }}
                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                </button>
                <button
                  onClick={() => { setShowUserSidebar(!showUserSidebar); setShowGroupSidebar(false); }}
                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <span className="text-xl">👥</span>
                </button>
              </>
            )}

            {/* Avatar & Title */}
            {activeGroup && (
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div 
                  className="h-9 w-9 rounded-full flex items-center justify-center font-medium text-sm shrink-0 shadow-sm"
                  style={{
                    backgroundColor: isDarkMode ? '#4b5563' : '#d1d5db',
                    color: isDarkMode ? '#ffffff' : '#000000'
                  }}
                >
                  {getInitials(activeGroup.name)}
                </div>
                
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base theme-text truncate leading-tight">
                      {activeGroup.name}
                    </h3>
                    {/* ✅ FIXED: Admin Crown Logic for Mobile */}
                    {activeGroup.createdBy === user?.userId && (
                      <span className="text-amber-500 text-xs shrink-0" title="You are the admin">👑</span>
                    )}
                    {/* ✅ FIXED: AI Label now visible on mobile */}
                    {activeGroup.aiEnabled && (
                      <span className="shrink-0 text-[10px] font-bold bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-1.5 py-0.5 rounded-full shadow-sm">
                        AI
                      </span>
                    )}
                  </div>
                  
                  {/* Subtitle: Typing or Members */}
                  <span className="text-xs theme-text-secondary truncate leading-tight">
                    {typingStatusString ? (
                      <span className="text-blue-500 font-medium italic animate-pulse">{typingStatusString}</span>
                    ) : (
                      `${activeGroup.memberCount} members`
                    )}
                  </span>
                </div>
              </div>
            )}
            
            {!activeGroup && (
              <h3 className="font-semibold theme-text ml-2">Select a group</h3>
            )}
          </div>

          {/* Right Actions */}
          {activeGroup ? (
            <div className="flex items-center gap-1">
              {activeGroup.aiEnabled && (
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMobileAiTools(prev => !prev); }}
                    className={`p-2 rounded-full transition-colors ${showMobileAiTools ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' : 'text-gray-500 hover:bg-black/5 dark:hover:bg-white/10'}`}
                  >
                    ✨
                  </button>
                  {/* Mobile AI Menu */}
                  {showMobileAiTools && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border theme-border z-50 p-2 animate-fade-in-up origin-top-right">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1 mb-1">AI TOOLS</div>
                      <button 
                        onClick={() => { setShowMobileAiTools(false); handleAiAction('summarize'); }} 
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        📝 <span>Summarize Chat</span>
                      </button>
                      <button 
                        onClick={() => { setShowMobileAiTools(false); handleAiAction('deadlines'); }} 
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        📅 <span>Extract Deadlines</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* ✅ FIXED: Leave Group Button RESTORED for Mobile */}
              {activeGroup.createdBy !== user?.userId && (
                <button
                  onClick={handleLeaveGroup}
                  className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title="Leave group"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </button>
              )}

              <button
                onClick={() => { setShowUserSidebar(!showUserSidebar); setShowGroupSidebar(false); }}
                className="p-2 rounded-full text-gray-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </button>
            </div>
          ) : (
            // ✅ FIXED: Show Dashboard button when NO active group
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
              title="Back to Dashboard"
            >
              <span className="text-xl">🏠</span>
            </button>
          )}
        </div>

        {/* Desktop ChatHeader */}
        <div className="hidden sm:block sticky top-[48px] z-10 sm:static" style={{ backgroundColor: colors.surface }}>
          <ChatHeader
            group={activeGroup}
            isConnected={isConnected}
            isDarkMode={isDarkMode}
            colors={colors}
            user={user}
            onAddMember={() => setShowAddMemberModal(true)}
            onLeaveGroup={handleLeaveGroup}
            enableAI={activeGroup?.aiEnabled}
            onAiAction={handleAiAction}
            typingStatus={typingStatusString}
          />
        </div>

        {/* Messages Area - Ensure it takes remaining height properly */}
        <div key={activeGroup?.id} className="flex-1 overflow-y-auto theme-bg animate-fade-in-up pt-16 sm:pt-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          <MessageList
            messages={allMessages}
            currentUserId={user?.userId}
            isDarkMode={isDarkMode}
            colors={colors}
            loading={loading && !loadedGroups.has(activeGroup?.id)}
            enableAI={activeGroup?.aiEnabled}
          />
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input - Sticky at bottom */}
        <div className="sticky bottom-0 z-10 bg-inherit sm:static border-t theme-border safe-area-bottom">
          <MessageInput
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            disabled={!activeGroup || !isConnected}
            placeholder={
              !activeGroup
                ? "Select a group to start chatting"
                : !isConnected
                  ? "Connecting..."
                  : "Type a message..."
            }
            isDarkMode={isDarkMode}
            colors={colors}
            activeGroupId={activeGroup?.id}
            enableAI={activeGroup?.aiEnabled}
            lastMessage={lastMessage}
          />
        </div>
      </div>

      {/* User Sidebar */}
      <div className={`transition-all duration-300 ${showUserSidebar ? 'w-full sm:w-64 absolute z-30 inset-0 sm:static' : 'w-0 absolute sm:static'} overflow-hidden border-l theme-border sm:block`}
        style={{
          height: showUserSidebar ? '100%' : '0',
          zIndex: showUserSidebar ? 30 : -1
        }}
      >
        {showUserSidebar && activeGroup && (
          <UserSidebar
            users={groupMembers}
            currentUserId={user?.userId}
            isDarkMode={isDarkMode}
            colors={colors}
            onClose={() => setShowUserSidebar(false)}
          />
        )}
      </div>

      {isCreateModalOpen && (
        <GroupCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onGroupCreated={handleGroupCreated}
          currentUserId={user?.userId}
          isDarkMode={isDarkMode}
          colors={colors}
        />
      )}

      {showAddMemberModal && (
        <AddMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          onMemberAdded={(newMembers) => {
            console.log('New members added:', newMembers);
          }}
          groupId={activeGroup?.id}
          currentUserId={user?.userId}
          isDarkMode={isDarkMode}
          colors={colors}
        />
      )}

      {showLeaveGroupConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className={`rounded-xl shadow-2xl max-w-md w-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'} animate-scale-in`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Leave Group
              </h2>
            </div>
            <div className="p-6">
              <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Are you sure you want to leave the group "<strong>{activeGroup?.name}</strong>"?
                You won't be able to see group messages anymore unless you're added back.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelLeaveGroup}
                  className={`px-4 py-2 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLeaveGroup}
                  className={`px-4 py-2 rounded-lg transition-colors bg-red-500 text-white hover:bg-red-600 shadow-md`}
                >
                  Leave Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAiResultModal && aiResultData && (
        <AiResultModal
          isOpen={showAiResultModal}
          onClose={() => setShowAiResultModal(false)}
          result={aiResultData}
          type={aiResultType}
          groupName={activeGroup?.name}
          isDarkMode={isDarkMode}
          colors={colors}
        />
      )}
      
    </div>
  );
};

export default ChatContainer;