import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  Users,
  MessageSquare,
  UserPlus,
  Hash,
  User as UserIcon,
  ChevronLeft,
  Search,
  X,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { getSocket, joinProjectRoom, leaveProjectRoom } from '../lib/socket.ts';
import { apiFetch } from '../lib/api.ts';
import { ChatMessage, User, ChatConversationMeta, ProjectChatOverview } from '../types.ts';

interface ProjectChatTabProps {
  projectId: string;
  projectName: string;
  initialConversationId?: string;
}

export const ProjectChatTab: React.FC<ProjectChatTabProps> = ({
  projectId,
  projectName,
  initialConversationId,
}) => {
  const { currentUser } = useAuth();

  // Navigation mode: 'group' discussion or 'direct' private messages
  const [activeTab, setActiveTab] = useState<'group' | 'direct'>('group');
  const [selectedDirectConvId, setSelectedDirectConvId] = useState<string | null>(null);

  // Overview data (conversations list, members, unread counts)
  const [overview, setOverview] = useState<ProjectChatOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Active messages list & conversation details
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  // Message composer
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  // Direct message modal state
  const [showNewDirectModal, setShowNewDirectModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [initiatingDirect, setInitiatingDirect] = useState(false);

  // Typing state
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mention autocomplete
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionCursorIndex, setMentionCursorIndex] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Determine active conversation based on active tab and selected direct ID
  const activeConversation: ChatConversationMeta | null = useMemo(() => {
    if (!overview) return null;
    if (activeTab === 'group') {
      return overview.groupConversation;
    }
    if (selectedDirectConvId) {
      return (
        overview.directConversations.find((c) => c.id === selectedDirectConvId) || null
      );
    }
    // Default to first direct conversation if available
    return overview.directConversations[0] || null;
  }, [overview, activeTab, selectedDirectConvId]);

  // Load conversations overview for this project
  const fetchOverview = async (silent = false) => {
    try {
      if (!silent) setLoadingOverview(true);
      const res = await apiFetch(`/api/projects/${projectId}/chat/conversations`);
      if (res.ok) {
        const data: ProjectChatOverview = await res.json();
        setOverview(data);

        // If an initialConversationId was provided or active tab is direct without selection
        if (initialConversationId) {
          if (data.groupConversation.id === initialConversationId) {
            setActiveTab('group');
          } else {
            const matched = data.directConversations.find(
              (c) => c.id === initialConversationId
            );
            if (matched) {
              setActiveTab('direct');
              setSelectedDirectConvId(matched.id);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load chat overview:', err);
    } finally {
      if (!silent) setLoadingOverview(false);
    }
  };

  // Load messages for a given conversation
  const fetchMessages = async (convId: string, silent = false) => {
    try {
      if (!silent) setLoadingMessages(true);
      setMessagesError(null);
      const res = await apiFetch(
        `/api/projects/${projectId}/chat/conversations/${convId}/messages`
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to load conversation messages');
      }
      const data = await res.json();
      setMessages(data.messages || []);
      if (!silent) {
        setTimeout(() => scrollToBottom(false), 50);
      }
    } catch (err: any) {
      setMessagesError(err.message || 'Error loading conversation messages');
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  // Initial load when projectId changes
  useEffect(() => {
    fetchOverview();
  }, [projectId]);

  // Whenever activeConversation changes, fetch its messages
  useEffect(() => {
    if (activeConversation?.id) {
      fetchMessages(activeConversation.id);
    } else {
      setMessages([]);
    }
  }, [activeConversation?.id]);

  // Background polling (every 3 seconds) to ensure sync in all serverless/polling environments
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchOverview(true);
      if (activeConversation?.id) {
        fetchMessages(activeConversation.id, true);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [projectId, activeConversation?.id]);

  // Socket.IO real-time event subscriptions
  useEffect(() => {
    if (!currentUser) return;
    const socket = getSocket(currentUser.id);

    // Join project room for group notifications & group chat messages
    joinProjectRoom(projectId, currentUser.id);

    const handleMessage = (msg: ChatMessage) => {
      if (msg.projectId !== projectId) return;

      // Check if message belongs to currently displayed conversation
      if (activeConversation && msg.conversationId === activeConversation.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => scrollToBottom(true), 60);

        // Mark as read immediately on active conversation
        apiFetch(
          `/api/projects/${projectId}/chat/conversations/${activeConversation.id}/read`,
          { method: 'POST' }
        ).catch(() => {});
      }

      // Update overview conversation snippet and unread counts
      setOverview((prev) => {
        if (!prev) return prev;
        if (msg.conversationType === 'GROUP' || msg.conversationId === prev.groupConversation.id) {
          const isCurrentActive = activeTab === 'group';
          return {
            ...prev,
            groupConversation: {
              ...prev.groupConversation,
              lastMessage: {
                id: msg.id,
                body: msg.body,
                sentAt: msg.sentAt,
                author: { id: msg.author.id, name: msg.author.name },
              },
              unreadCount: isCurrentActive
                ? 0
                : (prev.groupConversation.unreadCount || 0) + (msg.authorId !== currentUser.id ? 1 : 0),
              updatedAt: msg.sentAt,
            },
          };
        } else {
          // Direct conversation
          let found = false;
          const updatedDirect = prev.directConversations.map((c) => {
            if (c.id === msg.conversationId) {
              found = true;
              const isCurrentActive = activeTab === 'direct' && selectedDirectConvId === c.id;
              return {
                ...c,
                lastMessage: {
                  id: msg.id,
                  body: msg.body,
                  sentAt: msg.sentAt,
                  author: { id: msg.author.id, name: msg.author.name },
                },
                unreadCount: isCurrentActive
                  ? 0
                  : (c.unreadCount || 0) + (msg.authorId !== currentUser.id ? 1 : 0),
                updatedAt: msg.sentAt,
              };
            }
            return c;
          });

          // If it was a new direct conversation created by another user, trigger overview refresh
          if (!found) {
            fetchOverview(true);
            return prev;
          }

          return { ...prev, directConversations: updatedDirect };
        }
      });
    };

    const handleTyping = ({
      projectId: pid,
      conversationId: cid,
      userName,
      isTyping,
    }: {
      projectId: string;
      conversationId?: string;
      userName: string;
      isTyping: boolean;
    }) => {
      if (pid === projectId && userName !== currentUser.name) {
        if (!cid || (activeConversation && cid === activeConversation.id)) {
          setTypingUsers((prev) => {
            if (isTyping) {
              return prev.includes(userName) ? prev : [...prev, userName];
            } else {
              return prev.filter((u) => u !== userName);
            }
          });
        }
      }
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:typing', handleTyping);

    return () => {
      leaveProjectRoom(projectId);
      socket.off('chat:message', handleMessage);
      socket.off('chat:typing', handleTyping);
    };
  }, [projectId, activeConversation?.id, activeTab, selectedDirectConvId, currentUser]);

  // Typing indicator trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (!currentUser || !activeConversation) return;
    const socket = getSocket(currentUser.id);

    const typingPayload = {
      projectId,
      conversationId: activeConversation.id,
      recipientId:
        activeConversation.type === 'DIRECT' ? activeConversation.otherUser?.id : undefined,
      userName: currentUser.name,
    };

    socket.emit('typing:start', typingPayload);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', typingPayload);
    }, 2000);

    // Mention trigger check (only relevant in group discussion or if user mentions)
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1 && (lastAtPos === 0 || /\s/.test(textBeforeCursor[lastAtPos - 1]))) {
      const query = textBeforeCursor.slice(lastAtPos + 1);
      if (!query.includes(' ') || query.length < 15) {
        setShowMentionSuggestions(true);
        setMentionQuery(query.toLowerCase());
        setMentionCursorIndex(lastAtPos);
        return;
      }
    }
    setShowMentionSuggestions(false);
  };

  const handleSelectMention = (member: User) => {
    const textBeforeAt = inputText.slice(0, mentionCursorIndex);
    const textAfterMention = inputText.slice(
      textareaRef.current?.selectionStart || mentionCursorIndex
    );
    const newText = `${textBeforeAt}@${member.name} ${textAfterMention}`;
    setInputText(newText);
    setShowMentionSuggestions(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // Send message to active conversation
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending || sendingRef.current || !activeConversation) return;
    sendingRef.current = true;

    try {
      setSending(true);
      if (currentUser) {
        const socket = getSocket(currentUser.id);
        socket.emit('typing:stop', {
          projectId,
          conversationId: activeConversation.id,
          recipientId:
            activeConversation.type === 'DIRECT'
              ? activeConversation.otherUser?.id
              : undefined,
          userName: currentUser.name,
        });
      }

      const res = await apiFetch(
        `/api/projects/${projectId}/chat/conversations/${activeConversation.id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: inputText.trim() }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to send message');
      }

      const newMessage: ChatMessage = await res.json();
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      setTimeout(() => scrollToBottom(true), 60);

      setInputText('');
      setShowMentionSuggestions(false);

      // Refresh overview in background to update last messages
      fetchOverview(true);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  // Start or open a direct private message with a project member
  const handleStartDirectMessage = async (recipientId: string) => {
    try {
      setInitiatingDirect(true);
      const res = await apiFetch(`/api/projects/${projectId}/chat/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to initiate direct message');
      }

      const data = await res.json();
      setShowNewDirectModal(false);
      setActiveTab('direct');
      setSelectedDirectConvId(data.conversation.id);

      // Refresh overview
      await fetchOverview(true);
    } catch (err: any) {
      alert(err.message || 'Failed to start direct conversation');
    } finally {
      setInitiatingDirect(false);
    }
  };

  // Filter members for @mention dropdown
  const membersList = overview?.members || [];
  const filteredMentionMembers = membersList.filter((m) =>
    m.name.toLowerCase().includes(mentionQuery)
  );

  // Available members to start a new 1-on-1 private conversation with (exclude current user)
  const availableDirectMembers = useMemo(() => {
    return membersList
      .filter((m) => m.id !== currentUser?.id)
      .filter((m) =>
        memberSearchQuery
          ? m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
            (m.role && m.role.toLowerCase().includes(memberSearchQuery.toLowerCase())) ||
            (m.department && m.department.toLowerCase().includes(memberSearchQuery.toLowerCase()))
          : true
      );
  }, [membersList, currentUser?.id, memberSearchQuery]);

  // Aggregate unread count for direct conversations
  const directTotalUnread = useMemo(() => {
    if (!overview?.directConversations) return 0;
    return overview.directConversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [overview?.directConversations]);

  const groupUnread = overview?.groupConversation?.unreadCount || 0;

  return (
    <div
      className="bg-white rounded-2xl border border-[#E8E2D5] shadow-xs overflow-hidden flex flex-col"
      style={{ height: 'min(calc(100dvh - 220px), 720px)', minHeight: '440px' }}
    >
      {/* Top Channel Navigation Bar: Group Discussion vs Direct Messages */}
      <div className="px-3 sm:px-4 py-2.5 bg-[#FBF9F4] border-b border-[#E8E2D5] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
          {/* Group Chat Tab */}
          <button
            onClick={() => setActiveTab('group')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'group'
                ? 'bg-white text-[#C85A32] shadow-2xs border border-[#C85A32]/30 ring-1 ring-[#C85A32]/10'
                : 'text-[#70685F] hover:text-[#231E1B] hover:bg-white/60'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Group Chat</span>
            {groupUnread > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold bg-[#C85A32] text-white rounded-full">
                {groupUnread}
              </span>
            )}
          </button>

          {/* Direct Messages Tab */}
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'direct'
                ? 'bg-white text-[#C85A32] shadow-2xs border border-[#C85A32]/30 ring-1 ring-[#C85A32]/10'
                : 'text-[#70685F] hover:text-[#231E1B] hover:bg-white/60'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Direct Messages</span>
            {directTotalUnread > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold bg-[#C85A32] text-white rounded-full">
                {directTotalUnread}
              </span>
            )}
          </button>
        </div>

        {/* Start Direct Message Button */}
        <button
          onClick={() => {
            setMemberSearchQuery('');
            setShowNewDirectModal(true);
          }}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#F5F1E8] hover:bg-[#EFE9DC] text-[#60564C] text-[11px] sm:text-xs font-semibold transition-all border border-[#DDD6C8] cursor-pointer shrink-0"
          title="Start private direct message with a project member"
        >
          <UserPlus className="w-3.5 h-3.5 text-[#C85A32]" />
          <span className="hidden sm:inline">New Direct Message</span>
          <span className="sm:hidden">Message</span>
        </button>
      </div>

      {/* Main Body: Split view when in Direct Messages or full canvas for Group Discussion */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Direct Conversations Sidebar (Visible when Direct Messages tab is active) */}
        {activeTab === 'direct' && (
          <div
            className={`w-full md:w-64 lg:w-72 bg-[#FBF9F4] border-r border-[#E8E2D5] flex flex-col shrink-0 ${
              selectedDirectConvId ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className="p-2.5 sm:p-3 border-b border-[#E8E2D5] flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#70685F]">
                Conversations ({overview?.directConversations?.length || 0})
              </span>
              <button
                onClick={() => {
                  setMemberSearchQuery('');
                  setShowNewDirectModal(true);
                }}
                className="text-[11px] text-[#C85A32] hover:text-[#A63C1E] font-semibold cursor-pointer"
              >
                + Member
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 sm:p-2 space-y-1">
              {loadingOverview ? (
                <div className="py-8 text-center text-xs text-[#70685F]">Loading conversations...</div>
              ) : overview?.directConversations.length === 0 ? (
                <div className="py-8 px-3 text-center space-y-2">
                  <MessageCircle className="w-8 h-8 text-[#DDD6C8] mx-auto" />
                  <p className="text-xs font-semibold text-[#231E1B]">No private chats yet</p>
                  <p className="text-[11px] text-[#70685F]">
                    Click "+ Member" above to start a 1-to-1 conversation with a teammate.
                  </p>
                </div>
              ) : (
                overview?.directConversations.map((conv) => {
                  const isSelected = selectedDirectConvId === conv.id;
                  const partner = conv.otherUser;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedDirectConvId(conv.id)}
                      className={`w-full text-left p-2 sm:p-2.5 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-white border-[#C85A32]/40 shadow-2xs ring-1 ring-[#C85A32]/20'
                          : 'border-transparent hover:bg-white hover:border-[#E8E2D5]'
                      }`}
                    >
                      <img
                        src={
                          partner?.avatarUrl ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${partner?.name || 'User'}`
                        }
                        alt={partner?.name}
                        className="w-8 h-8 rounded-full object-cover border border-[#E8E2D5] shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-[#231E1B] truncate">
                            {partner?.name || 'Team Member'}
                          </span>
                          {conv.unreadCount > 0 && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-[#C85A32] text-white rounded-full shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#70685F] truncate flex items-center gap-1">
                          <span className="truncate">
                            {conv.lastMessage?.body || partner?.role || 'Direct conversation'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Conversation Canvas */}
        <div
          className={`flex-1 flex flex-col min-h-0 bg-white ${
            activeTab === 'direct' && !selectedDirectConvId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Active Conversation Header */}
          <div className="px-3.5 sm:px-4 py-2.5 bg-white border-b border-[#E8E2D5] flex items-center justify-between gap-2 shrink-0">
            <div className="min-w-0 flex items-center gap-2">
              {/* Back button on mobile when viewing a direct chat */}
              {activeTab === 'direct' && (
                <button
                  onClick={() => setSelectedDirectConvId(null)}
                  className="md:hidden p-1.5 -ml-1 text-[#70685F] hover:text-[#231E1B] rounded-lg cursor-pointer"
                  title="Back to conversations list"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {activeTab === 'group' ? (
                <>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#FEF6F3] border border-[#F3CEC1] flex items-center justify-center shrink-0">
                    <Hash className="w-4 h-4 text-[#C85A32]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif font-bold text-xs sm:text-sm text-[#231E1B] truncate">
                      #{projectName} Group Discussion
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-[#70685F] truncate">
                      Shared channel for authorized project members
                    </p>
                  </div>
                </>
              ) : activeConversation?.otherUser ? (
                <>
                  <img
                    src={
                      activeConversation.otherUser.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${activeConversation.otherUser.name}`
                    }
                    alt={activeConversation.otherUser.name}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#E8E2D5] object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <h3 className="font-serif font-bold text-xs sm:text-sm text-[#231E1B] truncate">
                        {activeConversation.otherUser.name}
                      </h3>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#EFECE4] text-[#554E45] font-semibold">
                        {activeConversation.otherUser.role}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-[#70685F] truncate">
                      Private one-to-one conversation &bull; Only visible to you both
                    </p>
                  </div>
                </>
              ) : (
                <div className="min-w-0">
                  <h3 className="font-serif font-bold text-xs sm:text-sm text-[#231E1B]">
                    Direct Messages
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-[#70685F]">
                    Select or start a private conversation
                  </p>
                </div>
              )}
            </div>

            {/* Member count & avatars for group chat */}
            {activeTab === 'group' && (
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex -space-x-1.5 overflow-hidden">
                  {membersList.slice(0, 4).map((m) => (
                    <img
                      key={m.id}
                      src={
                        m.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${m.name}`
                      }
                      alt={m.name}
                      title={m.name}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-[#70685F] ml-0.5">
                  {membersList.length} {membersList.length === 1 ? 'member' : 'members'}
                </span>
              </div>
            )}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-[#FBF9F4]/40">
            {loadingMessages ? (
              <div className="py-20 text-center text-xs text-[#70685F]">
                Loading conversation messages...
              </div>
            ) : messagesError ? (
              <div className="py-12 text-center text-xs text-[#991B1B] bg-[#FDF2F2] rounded-xl p-4 border border-[#F8D7D7]">
                {messagesError}
              </div>
            ) : !activeConversation ? (
              <div className="py-20 text-center space-y-2">
                <MessageSquare className="w-10 h-10 text-[#DDD6C8] mx-auto" />
                <p className="font-serif text-sm font-bold text-[#231E1B]">No conversation selected</p>
                <p className="text-xs text-[#70685F] max-w-sm mx-auto">
                  Select a private conversation on the left or click "New Direct Message" to chat with a teammate.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <p className="font-serif text-sm font-bold text-[#231E1B]">No messages yet</p>
                <p className="text-xs text-[#70685F] max-w-sm mx-auto">
                  {activeTab === 'group'
                    ? 'Start the project discussion! Use @Name to mention team members.'
                    : `Start your private conversation with ${activeConversation.otherUser?.name || 'this team member'}!`}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.authorId === currentUser?.id;
                let mentionedUserIds: string[] = [];
                try {
                  mentionedUserIds = JSON.parse(msg.mentions || '[]');
                } catch {
                  mentionedUserIds = [];
                }
                const isMentioned = currentUser && mentionedUserIds.includes(currentUser.id);

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 sm:gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                  >
                    <img
                      src={
                        msg.author?.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${msg.author?.name || 'User'}`
                      }
                      alt={msg.author?.name}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#E8E2D5] object-cover shrink-0 mt-0.5 shadow-2xs"
                      referrerPolicy="no-referrer"
                    />

                    <div
                      className={`max-w-[85%] sm:max-w-[70%] ${
                        isMe ? 'items-end' : 'items-start'
                      } flex flex-col`}
                    >
                      <div
                        className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] mb-1 ${
                          isMe ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <span className="font-bold text-[#231E1B]">
                          {msg.author?.name || 'Unknown'}
                        </span>
                        <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-[#EFECE4] text-[#554E45]">
                          {msg.author?.role === 'CTO' ? 'CTO' : msg.author?.role}
                        </span>
                        <span className="text-[#9B9287] text-[9px] sm:text-[10px]">
                          {new Date(msg.sentAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div
                        className={`p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words shadow-2xs ${
                          isMe
                            ? 'bg-[#C85A32] text-white rounded-tr-xs'
                            : isMentioned
                            ? 'bg-[#FEF6F3] text-[#231E1B] border border-[#F3CEC1] rounded-tl-xs'
                            : 'bg-white text-[#231E1B] border border-[#E8E2D5] rounded-tl-xs'
                        }`}
                      >
                        {msg.body}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="px-4 py-1 text-[10px] sm:text-[11px] text-[#70685F] italic bg-[#F5F1E8] border-t border-[#E8E2D5] flex items-center gap-1.5 shrink-0">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C85A32] animate-ping" />
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          {/* Mention Auto-Suggest Dropdown */}
          {showMentionSuggestions && filteredMentionMembers.length > 0 && (
            <div className="bg-white border-t border-[#E8E2D5] max-h-40 overflow-y-auto p-2 shadow-md shrink-0">
              <div className="text-[10px] font-bold text-[#70685F] uppercase px-2 py-1">
                Mention Member
              </div>
              {filteredMentionMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectMention(m)}
                  className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[#F5F1E8] text-xs text-[#231E1B] transition-colors cursor-pointer min-h-[40px]"
                >
                  <img
                    src={
                      m.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${m.name}`
                    }
                    alt={m.name}
                    className="w-5 h-5 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="font-semibold">{m.name}</span>
                  <span className="text-[10px] text-[#70685F] ml-auto">{m.role}</span>
                </button>
              ))}
            </div>
          )}

          {/* Input Composer */}
          {activeConversation ? (
            <form
              onSubmit={handleSendMessage}
              className="p-2.5 sm:p-3 bg-white border-t border-[#E8E2D5] flex gap-2 items-end shrink-0"
            >
              <textarea
                ref={textareaRef}
                id="chat-message-input"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  activeTab === 'group'
                    ? 'Type a message or @Name to mention...'
                    : `Message ${activeConversation.otherUser?.name || 'privately'}...`
                }
                rows={2}
                className="flex-1 bg-[#FBF9F4] border border-[#DDD6C8] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#231E1B] focus:outline-hidden focus:ring-1 focus:ring-[#C85A32] resize-none min-h-[44px]"
              />

              <button
                type="submit"
                id="chat-send-button"
                disabled={!inputText.trim() || sending}
                className="p-3 rounded-xl bg-[#C85A32] text-white hover:bg-[#A63C1E] active:scale-95 disabled:opacity-40 transition-all shadow-xs shrink-0 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="p-3 bg-[#FBF9F4] border-t border-[#E8E2D5] text-center text-xs text-[#70685F] shrink-0">
              Select or start a conversation to compose a message
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Start New Direct Message (Member Picker) */}
      {showNewDirectModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8E2D5] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#FBF9F4] border-b border-[#E8E2D5] flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-sm text-[#231E1B]">
                  New Direct Message
                </h3>
                <p className="text-[11px] text-[#70685F] mt-0.5">
                  Select a project member from #{projectName} to chat privately
                </p>
              </div>
              <button
                onClick={() => setShowNewDirectModal(false)}
                className="p-1 rounded-lg text-[#70685F] hover:text-[#231E1B] hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Member Search Input */}
            <div className="p-3 border-b border-[#E8E2D5] bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#70685F] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Search team member by name or role..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#FBF9F4] border border-[#DDD6C8] text-xs text-[#231E1B] focus:outline-hidden focus:ring-1 focus:ring-[#C85A32]"
                  autoFocus
                />
              </div>
            </div>

            {/* Members List */}
            <div className="max-h-64 overflow-y-auto p-2 space-y-1">
              {availableDirectMembers.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#70685F]">
                  {memberSearchQuery
                    ? 'No matching project members found'
                    : 'No other members found in this project'}
                </div>
              ) : (
                availableDirectMembers.map((member) => (
                  <button
                    key={member.id}
                    disabled={initiatingDirect}
                    onClick={() => handleStartDirectMessage(member.id)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#FBF9F4] border border-transparent hover:border-[#E8E2D5] transition-all flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={
                          member.avatarUrl ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`
                        }
                        alt={member.name}
                        className="w-8 h-8 rounded-full object-cover border border-[#E8E2D5]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#231E1B] group-hover:text-[#C85A32] truncate">
                          {member.name}
                        </div>
                        <div className="text-[10px] text-[#70685F] truncate">
                          {member.role} {member.department ? `• ${member.department}` : ''}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold text-[#C85A32] bg-[#FEF6F3] px-2 py-1 rounded-lg border border-[#F3CEC1] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      Chat
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
