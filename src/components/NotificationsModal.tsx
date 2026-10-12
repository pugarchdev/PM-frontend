import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X, ExternalLink, MessageSquare, AlertCircle, FileCheck, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { getSocket } from '../lib/socket.ts';
import { apiFetch } from '../lib/api.ts';
import { NotificationItem } from '../types.ts';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (url: string) => void;
  onSelectProject?: (projectId: string, initialTab?: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const res = await apiFetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, currentUser]);

  // Real-time socket listener
  useEffect(() => {
    if (!currentUser) return;
    const socket = getSocket(currentUser.id);

    const handleNewNotification = (notification: NotificationItem) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((c) => c + 1);
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [currentUser]);

  const pendingReadSetRef = useRef(new Set<string>());

  const markAsRead = async (id: string) => {
    if (pendingReadSetRef.current.has(id)) return;
    pendingReadSetRef.current.add(id);
    try {
      const res = await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount(data.unreadCount ?? Math.max(0, unreadCount - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    } finally {
      pendingReadSetRef.current.delete(id);
    }
  };

  const markAllRead = async () => {
    if (pendingReadSetRef.current.has('ALL')) return;
    pendingReadSetRef.current.add('ALL');
    try {
      const res = await apiFetch('/api/notifications/read-all', { method: 'POST' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      pendingReadSetRef.current.delete('ALL');
    }
  };

  if (!isOpen) return null;

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const getIcon = (type: string) => {
    if (type.includes('chat') || type.includes('mention')) {
      return <MessageSquare className="w-4 h-4 text-[#C85A32]" />;
    }
    if (type.includes('issue') || type.includes('critical')) {
      return <AlertCircle className="w-4 h-4 text-[#991B1B]" />;
    }
    if (type.includes('approval')) {
      return <FileCheck className="w-4 h-4 text-[#526E55]" />;
    }
    if (type.includes('budget')) {
      return <DollarSign className="w-4 h-4 text-[#B45309]" />;
    }
    return <Bell className="w-4 h-4 text-[#70685F]" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        id="notifications-modal"
        className="w-full max-w-lg bg-[#FBF9F4] rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-[#E8E2D5] overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
      >
        {/* Mobile handle */}
        <div className="pt-3 pb-1 bg-white sm:hidden">
          <div className="w-12 h-1.5 bg-[#DDD6C8] rounded-full mx-auto" />
        </div>

        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-white border-b border-[#E8E2D5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F6EADB] flex items-center justify-center text-[#C85A32] shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-[#231E1B]">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#C85A32] text-white">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-[#70685F]">Real-time system &amp; collaboration alerts</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {unreadCount > 0 && (
              <button
                id="btn-mark-all-read"
                onClick={markAllRead}
                className="text-xs font-semibold text-[#526E55] hover:text-[#2D5A34] active:scale-95 flex items-center justify-center gap-1 px-3 py-2 rounded-lg hover:bg-[#EBF2EB] transition-colors cursor-pointer min-h-[44px]"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-[#EDE7DC] active:scale-95 text-[#70685F] transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#F5F1E8] border-b border-[#E8E2D5] flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer min-h-[44px] flex items-center justify-center ${
              filter === 'all'
                ? 'bg-white text-[#231E1B] shadow-xs'
                : 'text-[#70685F] hover:text-[#231E1B]'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer min-h-[44px] flex items-center justify-center ${
              filter === 'unread'
                ? 'bg-white text-[#231E1B] shadow-xs'
                : 'text-[#70685F] hover:text-[#231E1B]'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#70685F]">Loading notifications...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-medium text-[#70685F]">No notifications found</p>
              <p className="text-xs text-[#9B9287]">
                {filter === 'unread' ? "You're all caught up!" : 'New alerts will appear here in real-time.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`p-3 sm:p-3.5 rounded-xl border transition-all flex items-start gap-2.5 sm:gap-3 ${
                  item.isRead
                    ? 'bg-white/70 border-[#E8E2D5] text-[#70685F]'
                    : 'bg-white border-[#C85A32]/40 shadow-xs'
                }`}
              >
                <div className="mt-0.5 p-2 rounded-lg bg-[#F7F4EC] shrink-0">
                  {getIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-xs font-semibold truncate ${
                        item.isRead ? 'text-[#3E3832]' : 'text-[#231E1B] font-bold'
                      }`}
                    >
                      {item.title}
                    </h4>
                    <span className="text-[10px] text-[#9B9287] shrink-0">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-[#554E44] mt-0.5 leading-relaxed break-words">
                    {item.message}
                  </p>

                  <div className="mt-2.5 flex items-center gap-3">
                    {item.linkUrl && (
                      <button
                        onClick={() => {
                          if (onNavigate) onNavigate(item.linkUrl!);
                          onClose();
                        }}
                        className="text-xs font-semibold text-[#C85A32] hover:underline active:scale-95 flex items-center gap-1 cursor-pointer py-1"
                      >
                        View details
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {!item.isRead && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        className="text-xs text-[#526E55] hover:text-[#2D5A34] active:scale-95 font-semibold flex items-center gap-1 cursor-pointer py-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
