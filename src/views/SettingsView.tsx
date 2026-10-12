import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Settings,
  Bell,
  Shield,
  Smartphone,
  Globe,
  ArrowLeft,
  Check,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E8E2D5]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl bg-white border border-[#DDD6C8] text-[#70685F] hover:text-[#231E1B] transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#231E1B]">User Settings</h1>
            <p className="text-xs text-[#70685F]">Manage preferences, notifications, and security</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#E8E2D5] shadow-xs p-6 sm:p-8 space-y-6">
        {/* Notifications Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#231E1B] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#C85A32]" />
            Notification Preferences
          </h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#EDE7DC] cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-[#231E1B]">Email Notifications</div>
                <div className="text-[11px] text-[#70685F]">
                  Receive email alerts for project risks, blockers, and CEO approvals
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#C85A32] rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#EDE7DC] cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-[#231E1B]">Push Notifications</div>
                <div className="text-[11px] text-[#70685F]">
                  Real-time mobile &amp; browser alerts via WebSocket
                </div>
              </div>
              <input
                type="checkbox"
                checked={pushAlerts}
                onChange={(e) => setPushAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#C85A32] rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Security & Access Section */}
        <div className="pt-4 border-t border-[#EDE7DC] space-y-4">
          <h2 className="text-sm font-bold text-[#231E1B] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#C85A32]" />
            Authentication &amp; Access Controls
          </h2>
          <div className="p-4 rounded-2xl bg-[#F5F1E8] border border-[#E0D9CB] text-xs text-[#70685F] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#231E1B]">Primary Identifier:</span>
              <span className="font-mono">{currentUser?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#231E1B]">Mobile Phone:</span>
              <span className="font-mono">{currentUser?.phone || 'Not set'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#231E1B]">Role Authorization:</span>
              <span className="font-semibold text-[#C85A32]">{currentUser?.role}</span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          {savedNotice ? (
            <span className="text-xs text-[#15803D] font-semibold flex items-center gap-1">
              <Check className="w-4 h-4" /> Preferences saved!
            </span>
          ) : (
            <span />
          )}
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#A63C1E] text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
