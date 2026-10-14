import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Shield, UserCheck, ChevronDown, Building2, Bell, LogOut, Calendar, X, Users, User, Settings } from 'lucide-react';
import pugLogo from '../assets/pugarch-logo.png';
import { UserManagementModal } from './UserManagementModal.tsx';

interface TopNavProps {
  onOpenNotifications?: () => void;
  onOpenCalendar?: () => void;
  unreadCount?: number;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenNotifications, onOpenCalendar, unreadCount = 0 }) => {
  const { currentUser, logout, isLoading, isCEO } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'CEO':
        return 'bg-[#FBE8E2] text-[#A63C1E] border border-[#F3CEC1] font-semibold';
      case 'CTO':
        return 'bg-[#EBF2EB] text-[#2D5A34] border border-[#C6DEC7] font-semibold';
      default:
        return 'bg-[#EFECE4] text-[#554E45] border border-[#DDD6C8]';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'CEO':
        return 'CEO';
      case 'CTO':
        return 'CTO';
      default:
        return 'Employee';
    }
  };

  const getInitialsAvatar = (name?: string, avatarUrl?: string | null) => {
    if (avatarUrl && !avatarUrl.includes('images.unsplash.com') && !avatarUrl.includes('photo-')) {
      return avatarUrl;
    }
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}`;
  };

  return (
    <>
      <header
        id="top-nav-bar"
        className="sticky top-0 z-40 w-full bg-[#FBF9F4]/95 backdrop-blur-md border-b border-[#E8E2D5] px-3 sm:px-4 lg:px-8 py-2 sm:py-3 lg:py-3.5"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Logo & Brand - Clickable navigation to /dashboard */}
          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 lg:gap-3 min-w-0 shrink-0 cursor-pointer select-none"
            title="PugArch Dashboard"
          >
            {/* Desktop brand */}
            <div className="hidden sm:flex items-center gap-2">
              <img
                src={pugLogo}
                alt="PugArch"
                className="h-10 w-auto object-contain shrink-0"
                style={{ mixBlendMode: 'multiply' }}
              />
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#EAE3D5] text-[#60564C]">
                PROJECTS
              </span>
            </div>
            {/* Mobile brand */}
            <div className="sm:hidden flex items-center gap-1.5">
              <img
                src={pugLogo}
                alt="PugArch"
                className="h-8 w-auto object-contain shrink-0"
                style={{ mixBlendMode: 'multiply' }}
              />
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[#EAE3D5] text-[#60564C]">
                PROJECTS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 shrink-0">
            {/* CEO User Management Button */}
            {isCEO && (
              <button
                id="top-nav-user-management-btn"
                onClick={() => navigate('/users')}
                className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full bg-[#EBF2EB] hover:bg-[#DCEADF] border border-[#C6DEC7] text-[#2D5A34] transition-colors flex items-center justify-center cursor-pointer"
                title="User Management & Pre-Registration"
              >
                <Users className="w-4 h-4" />
              </button>
            )}

            {/* Calendar Button */}
            {onOpenCalendar && (
              <button
                id="top-nav-calendar-btn"
                onClick={onOpenCalendar}
                className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full bg-[#F5F1E8] hover:bg-[#EDE7DC] border border-[#E0D9CB] text-[#70685F] hover:text-[#231E1B] transition-colors flex items-center justify-center cursor-pointer"
                title="Calendar"
              >
                <Calendar className="w-4 h-4" />
              </button>
            )}

            {/* Real-time Notifications Bell */}
            <button
              id="top-nav-notifications-btn"
              onClick={onOpenNotifications}
              className="relative w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full bg-[#F5F1E8] hover:bg-[#EDE7DC] border border-[#E0D9CB] text-[#70685F] hover:text-[#231E1B] transition-colors flex items-center justify-center cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold bg-[#C85A32] text-white flex items-center justify-center shadow-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Authenticated User Profile Button */}
            <div className="relative">
              <button
                id="user-profile-button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                disabled={isLoading}
                className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 pl-1 pr-2 sm:px-3 lg:pl-1.5 lg:pr-3 lg:py-1.5 rounded-full bg-[#F5F1E8] hover:bg-[#EDE7DC] border border-[#E0D9CB] transition-colors min-h-[36px] sm:min-h-[44px] cursor-pointer"
                title="Account Profile"
              >
                <img
                  src={getInitialsAvatar(currentUser?.name, currentUser?.avatarUrl)}
                  alt={currentUser?.name}
                  className="w-7 h-7 lg:w-8 lg:h-8 rounded-full object-cover border border-white shadow-2xs shrink-0"
                  referrerPolicy="no-referrer"
                />
                {/* Name + role: visible from sm up */}
                <div className="hidden sm:block text-left leading-tight">
                  <div className="text-xs font-semibold text-[#231E1B] truncate max-w-[120px]">
                    {currentUser?.name || 'Loading...'}
                  </div>
                  <div className="text-[10px] text-[#70675D]">
                    {currentUser ? getRoleLabel(currentUser.role) : ''}
                  </div>
                </div>
                {/* Role badge: hidden on mobile, shown on sm */}
                <span
                  className={`hidden sm:inline text-[10px] px-2 py-0.5 rounded-full ${currentUser ? getRoleBadgeStyle(currentUser.role) : ''}`}
                >
                  {currentUser?.role === 'CTO' ? 'CTO' : currentUser?.role}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#7A7165]" />
              </button>

              {/* Desktop Popover Dropdown (sm+) */}
              {isMenuOpen && (
                <div
                  id="user-profile-dropdown-desktop"
                  className="hidden sm:block absolute right-0 top-full mt-2 w-72 z-50 rounded-2xl bg-white shadow-xl border border-[#E2DBD0] p-4 animate-in slide-in-from-top-2 duration-150 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#EFECE4]">
                    <h4 className="font-semibold text-sm text-[#231E1B] flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-[#C85A32]" />
                      Account Profile
                    </h4>
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="text-xs text-[#8F867A] hover:text-[#231E1B] p-1 rounded-md cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={getInitialsAvatar(currentUser?.name, currentUser?.avatarUrl)}
                      alt={currentUser?.name}
                      className="w-12 h-12 rounded-full border border-[#E8E2D5] shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="text-sm font-bold text-[#231E1B] truncate">
                        {currentUser?.name}
                      </div>
                      <div className="text-xs text-[#7A7165] truncate">
                        {currentUser?.email}
                      </div>
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full ${currentUser ? getRoleBadgeStyle(currentUser.role) : ''}`}>
                        {currentUser ? getRoleLabel(currentUser.role) : ''}
                      </span>
                    </div>
                  </div>

                  {currentUser?.department && (
                    <div className="pt-2 border-t border-[#EFECE4] text-xs text-[#70685F] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#8F867A] shrink-0" />
                      Department: <strong className="text-[#231E1B]">{currentUser.department}</strong>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#EFECE4] text-[11px] text-[#7A7165] bg-[#FAF7F0] p-2.5 rounded-xl space-y-1">
                    <div className="font-semibold text-[#231E1B] flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-[#526E55]" />
                      Server-Enforced Access
                    </div>
                    <p className="text-[10px] text-[#7A7165] leading-relaxed">
                      Role and permissions are verified by the server on every request.
                    </p>
                  </div>

                  {/* Navigation Links */}
                  <div className="pt-2 border-t border-[#EFECE4] space-y-1">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/profile');
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#FAF7F0] hover:bg-[#F2ECE1] text-[#231E1B] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <User className="w-4 h-4 text-[#C85A32]" />
                      Account Profile
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#FAF7F0] hover:bg-[#F2ECE1] text-[#231E1B] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-[#70685F]" />
                      Settings &amp; Preferences
                    </button>
                  </div>

                  {/* CEO User Management Option */}
                  {isCEO && (
                    <button
                      id="desktop-open-user-mgmt-btn"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/users');
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#EBF2EB] hover:bg-[#DCEADF] text-[#2D5A34] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#C6DEC7] transition-colors cursor-pointer min-h-[44px]"
                    >
                      <Users className="w-4 h-4" />
                      User Management &amp; Pre-Registration
                    </button>
                  )}

                  {/* Sign Out Action */}
                  <button
                    id="user-logout-btn-desktop"
                    onClick={async () => {
                      setIsMenuOpen(false);
                      await logout();
                      navigate('/login');
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#F5F1E8] hover:bg-[#FBE8E2] text-[#8C3A27] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#E5DDCF] transition-colors cursor-pointer min-h-[44px]"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Sheet rendered in Portal to avoid CSS containing block issues */}
      {isMenuOpen &&
        createPortal(
          <div className="sm:hidden fixed inset-0 z-[100] flex flex-col justify-end">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Bottom Sheet Modal */}
            <div
              id="user-profile-dropdown"
              className="relative z-10 w-full bg-white rounded-t-3xl shadow-2xl border-t border-[#E2DBD0] p-5 pb-8 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            >
              {/* Drag Handle */}
              <div className="w-12 h-1.5 rounded-full bg-[#D4CBBF] mx-auto" />

              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#EFECE4]">
                <h4 className="font-semibold text-base text-[#231E1B] flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#C85A32]" />
                  Account Profile
                </h4>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="text-xs font-medium text-[#7A7165] hover:text-[#231E1B] p-1.5 rounded-lg bg-[#F5F1E8] border border-[#E0D9CB] cursor-pointer flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Close
                </button>
              </div>

              {/* User Identity Details */}
              <div className="flex items-center gap-3.5 pt-1">
                <img
                  src={getInitialsAvatar(currentUser?.name, currentUser?.avatarUrl)}
                  alt={currentUser?.name}
                  className="w-14 h-14 rounded-full border-2 border-[#E8E2D5] shadow-xs shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="text-base font-bold text-[#231E1B] truncate">
                    {currentUser?.name}
                  </div>
                  <div className="text-xs text-[#7A7165] truncate">
                    {currentUser?.email}
                  </div>
                  <span className={`inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full ${currentUser ? getRoleBadgeStyle(currentUser.role) : ''}`}>
                    {currentUser ? getRoleLabel(currentUser.role) : ''}
                  </span>
                </div>
              </div>

              {/* Department */}
              {currentUser?.department && (
                <div className="pt-2 border-t border-[#EFECE4] text-xs text-[#70685F] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#8F867A] shrink-0" />
                  <span>Department: <strong className="text-[#231E1B]">{currentUser.department}</strong></span>
                </div>
              )}

              {/* Navigation Links Mobile */}
              <div className="space-y-2 pt-2 border-t border-[#EFECE4]">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#FAF7F0] text-[#231E1B] text-xs font-semibold flex items-center gap-2 border border-[#EDE7DC]"
                >
                  <User className="w-4 h-4 text-[#C85A32]" />
                  View Account Profile
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#FAF7F0] text-[#231E1B] text-xs font-semibold flex items-center gap-2 border border-[#EDE7DC]"
                >
                  <Settings className="w-4 h-4 text-[#70685F]" />
                  Settings &amp; Preferences
                </button>
              </div>

              {/* Permissions & Security Badge */}
              <div className="border border-[#EAE3D5] text-xs text-[#7A7165] bg-[#FAF7F0] p-3 rounded-2xl space-y-1">
                <div className="font-semibold text-[#231E1B] flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#526E55]" />
                  Server-Enforced Access
                </div>
                <p className="text-[11px] text-[#7A7165] leading-relaxed">
                  Role permissions and project access rights are cryptographically verified by the server on every request.
                </p>
              </div>

              {/* CEO User Management Mobile */}
              {isCEO && (
                <button
                  id="mobile-open-user-mgmt-btn"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('/users');
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#EBF2EB] hover:bg-[#DCEADF] text-[#2D5A34] text-xs font-semibold flex items-center justify-center gap-2 border border-[#C6DEC7] transition-colors cursor-pointer min-h-[48px]"
                >
                  <Users className="w-4 h-4" />
                  User Management &amp; Pre-Registration
                </button>
              )}

              {/* Sign Out Action Button */}
              <button
                id="user-logout-btn"
                onClick={async () => {
                  setIsMenuOpen(false);
                  await logout();
                  navigate('/login');
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#FBE8E2] hover:bg-[#F7D6CC] text-[#8C3A27] text-sm font-bold flex items-center justify-center gap-2 border border-[#F3CEC1] transition-colors cursor-pointer min-h-[48px] shadow-xs active:scale-[0.99]"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* User Management & Pre-Registration Modal */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
      />
    </>
  );
};
