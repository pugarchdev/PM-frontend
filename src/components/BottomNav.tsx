import React from 'react';
import { Bell, FolderKanban, AlertCircle, Users, MessageSquare } from 'lucide-react';

export type NavTab = 'alerts' | 'projects' | 'issues' | 'workload' | 'chat';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  alertsCount?: number;
  criticalIssuesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  alertsCount = 0,
  criticalIssuesCount = 0,
}) => {
  const tabs = [
    {
      id: 'alerts' as NavTab,
      label: 'Dashboard',
      icon: Bell,
      badge: alertsCount > 0 ? alertsCount : null,
      badgeColor: 'bg-[#C85A32] text-white',
    },
    {
      id: 'projects' as NavTab,
      label: 'Projects',
      icon: FolderKanban,
    },
    {
      id: 'issues' as NavTab,
      label: 'Issues',
      icon: AlertCircle,
      badge: criticalIssuesCount > 0 ? criticalIssuesCount : null,
      badgeColor: 'bg-[#991B1B] text-white',
    },
    {
      id: 'workload' as NavTab,
      label: 'Workload',
      icon: Users,
    },
    {
      id: 'chat' as NavTab,
      label: 'Chat',
      icon: MessageSquare,
      subBadge: 'P2',
    },
  ];

  return (
    <nav
      id="bottom-nav-bar"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#FBF9F4]/95 backdrop-blur-md border-t border-[#E8E2D5] px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] sm:py-2 transition-all shadow-xs"
    >
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 px-1 rounded-2xl transition-all cursor-pointer select-none active:scale-95 ${
                isActive ? 'text-[#C85A32] font-semibold' : 'text-[#70685F] hover:text-[#231E1B]'
              }`}
            >
              <div className={`relative p-1 rounded-xl transition-all ${isActive ? 'bg-[#FBE8E2]/60' : ''}`}>
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-105 stroke-[2.3]' : 'stroke-[1.8]'
                  }`}
                />
                {tab.badge !== null && tab.badge !== undefined && (
                  <span
                    className={`absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs ${tab.badgeColor}`}
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
                {tab.subBadge && (
                  <span className="absolute -top-1 -right-2.5 px-1 py-0.2 rounded-full text-[8px] font-bold bg-[#E8E2D5] text-[#70675D]">
                    {tab.subBadge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight transition-all ${
                  isActive ? 'font-bold text-[#C85A32]' : 'font-medium text-[#70685F]'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-[#C85A32]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
