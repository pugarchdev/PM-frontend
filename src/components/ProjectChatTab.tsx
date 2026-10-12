import React, { useState, useEffect, useRef } from 'react';
import { Send, AtSign, Users, Smile, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { getSocket, joinProjectRoom, leaveProjectRoom } from '../lib/socket.ts';
import { apiFetch } from '../lib/api.ts';
import { ChatMessage, User } from '../types.ts';

interface ProjectChatTabProps {
  projectId: string;
  projectName: string;
}

export const ProjectChatTab: React.FC<ProjectChatTabProps> = ({ projectId, projectName }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchChat = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/projects/${projectId}/chat`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load project chat');
      }
      const data = await res.json();
      setMessages(data.messages || []);
      setMembers(data.members || []);
      setTimeout(() => scrollToBottom(false), 50);
    } catch (err: any) {
      setError(err.message || 'Error loading chat');
    } finally {
      setLoading(false);
    }
  };

  // Silent poll for real-time chat updates across serverless/polling environments
  const pollChatMessages = async () => {
    try {
      const res = await apiFetch(`/api/projects/${projectId}/chat`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setMessages((prev) => {
            if (data.messages.length !== prev.length || (data.messages.length > 0 && data.messages[data.messages.length - 1]?.id !== prev[prev.length - 1]?.id)) {
              setTimeout(() => scrollToBottom(true), 50);
              return data.messages;
            }
            return prev;
          });
        }
      }
    } catch {
      // silent background sync
    }
  };

  useEffect(() => {
    fetchChat();
    // Poll chat every 3.5 seconds to guarantee instant message delivery on serverless environments
    const timer = setInterval(pollChatMessages, 2500);
    return () => clearInterval(timer);
  }, [projectId]);

  // Socket.IO real-time events
  useEffect(() => {
    if (!currentUser) return;
    const socket = getSocket(currentUser.id);

    console.log('[ProjectChatTab] Initializing socket listener for project:', projectId, 'user:', currentUser.id);
    // Join and track project room (auto-reconnect supported)
    joinProjectRoom(projectId, currentUser.id, (res) => {
      console.log('[ProjectChatTab] joinProjectRoom response:', res);
    });

    const handleMessage = (msg: ChatMessage) => {
      console.log('[ProjectChatTab] Received chat:message event:', msg);
      if (msg.projectId === projectId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => scrollToBottom(true), 100);
      }
    };

    const handleTyping = ({ projectId: pid, userName, isTyping }: { projectId: string; userName: string; isTyping: boolean }) => {
      if (pid === projectId && userName !== currentUser.name) {
        setTypingUsers((prev) => {
          if (isTyping) {
            return prev.includes(userName) ? prev : [...prev, userName];
          } else {
            return prev.filter((u) => u !== userName);
          }
        });
      }
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:typing', handleTyping);

    return () => {
      leaveProjectRoom(projectId);
      socket.off('chat:message', handleMessage);
      socket.off('chat:typing', handleTyping);
    };
  }, [projectId, currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (!currentUser) return;
    const socket = getSocket(currentUser.id);

    // Broadcast typing indicator
    socket.emit('typing:start', { projectId, userName: currentUser.name });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { projectId, userName: currentUser.name });
    }, 2000);

    // Check for @mention trigger
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
    const textAfterMention = inputText.slice(textareaRef.current?.selectionStart || mentionCursorIndex);
    const newText = `${textBeforeAt}@${member.name} ${textAfterMention}`;
    setInputText(newText);
    setShowMentionSuggestions(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const sendingRef = useRef(false);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending || sendingRef.current) return;
    sendingRef.current = true;

    try {
      setSending(true);
      if (currentUser) {
        const socket = getSocket(currentUser.id);
        socket.emit('typing:stop', { projectId, userName: currentUser.name });
      }

      const res = await apiFetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: inputText.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send message');
      }

      const newMessage = await res.json();
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      setTimeout(() => scrollToBottom(true), 100);

      setInputText('');
      setShowMentionSuggestions(false);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(mentionQuery)
  );

  return (
    <div className="bg-white rounded-2xl border border-[#E8E2D5] shadow-xs overflow-hidden flex flex-col" style={{ height: 'min(calc(100dvh - 240px), 640px)', minHeight: '380px' }}>
      {/* Thread Header */}
      <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 bg-[#FBF9F4] border-b border-[#E8E2D5] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-serif font-bold text-xs sm:text-sm text-[#231E1B] flex items-center gap-1.5 truncate">
            <span>Project Discussion</span>
            <span className="text-[11px] font-normal text-[#70685F] truncate">&bull; #{projectName}</span>
          </h3>
          <p className="text-[10px] sm:text-[11px] text-[#70685F] truncate">
            Real-time collaboration &amp; mentions
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex -space-x-1.5 overflow-hidden">
            {members.slice(0, 4).map((m) => (
              <img
                key={m.id}
                src={m.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${m.name}`}
                alt={m.name}
                title={m.name}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white object-cover"
                referrerPolicy="no-referrer"
              />
            ))}
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#70685F] ml-0.5">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-[#FBF9F4]/40">
        {loading ? (
          <div className="py-20 text-center text-xs text-[#70685F]">Loading project chat...</div>
        ) : error ? (
          <div className="py-12 text-center text-xs text-[#991B1B] bg-[#FDF2F2] rounded-xl p-4 border border-[#F8D7D7]">
            {error}
          </div>
        ) : messages.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <p className="font-serif text-sm font-bold text-[#231E1B]">No messages yet</p>
            <p className="text-xs text-[#70685F] max-w-sm mx-auto">
              Start the discussion! Type a message below and use @Name to mention team members.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.authorId === currentUser?.id;
            let mentionedUserIds: string[] = [];
            try {
              mentionedUserIds = JSON.parse(msg.mentions || '[]');
            } catch (e) {
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

                <div className={`max-w-[85%] sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="font-bold text-[#231E1B]">{msg.author?.name || 'Unknown'}</span>
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-[#EFECE4] text-[#554E45]">
                      {msg.author?.role === 'ProjectOwner' ? 'Owner' : msg.author?.role}
                    </span>
                    <span className="text-[#9B9287] text-[9px] sm:text-[10px]">
                      {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words shadow-2xs ${isMe
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
        <div className="px-4 py-1 text-[10px] sm:text-[11px] text-[#70685F] italic bg-[#F5F1E8] border-t border-[#E8E2D5] flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C85A32] animate-ping" />
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Mention Auto-Suggest Dropdown */}
      {showMentionSuggestions && filteredMembers.length > 0 && (
        <div className="bg-white border-t border-[#E8E2D5] max-h-40 overflow-y-auto p-2 shadow-md">
          <div className="text-[10px] font-bold text-[#70685F] uppercase px-2 py-1">
            Mention Member
          </div>
          {filteredMembers.map((m) => (
            <button
              key={m.id}
              onClick={() => handleSelectMention(m)}
              className="w-full text-left flex items-center gap-2 px-2.5 py-2.5 rounded-lg hover:bg-[#F5F1E8] text-xs text-[#231E1B] transition-colors cursor-pointer min-h-[44px]"
            >
              <img
                src={m.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${m.name}`}
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
      <form onSubmit={handleSendMessage} className="p-2.5 sm:p-3 bg-white border-t border-[#E8E2D5] flex gap-2 items-end">
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
          placeholder="Type a message or @Name to mention..."
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
    </div>
  );
};
