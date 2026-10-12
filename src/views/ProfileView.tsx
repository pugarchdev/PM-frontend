import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Shield,
  UserCheck,
  Building2,
  Mail,
  Phone,
  Calendar,
  LogOut,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { currentUser, logout, isCEO } = useAuth();
  const navigate = useNavigate();

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'CEO':
        return 'bg-[#FBE8E2] text-[#A63C1E] border border-[#F3CEC1] font-semibold';
      case 'ProjectOwner':
        return 'bg-[#EBF2EB] text-[#2D5A34] border border-[#C6DEC7]';
      default:
        return 'bg-[#EFECE4] text-[#554E45] border border-[#DDD6C8]';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header & Back Button */}
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
            <h1 className="font-serif text-2xl font-bold text-[#231E1B]">Account Profile</h1>
            <p className="text-xs text-[#70685F]">Manage your identity credentials and workspace access</p>
          </div>
        </div>

        <button
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="px-4 py-2 rounded-xl bg-[#FBE8E2] hover:bg-[#F7D6CC] text-[#8C3A27] text-xs font-semibold flex items-center gap-1.5 border border-[#F3CEC1] transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl border border-[#E8E2D5] shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <img
            src={
              currentUser?.avatarUrl ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser?.name || 'User')}`
            }
            alt={currentUser?.name}
            className="w-20 h-20 rounded-full border-2 border-[#E8E2D5] shadow-xs object-cover shrink-0"
          />
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-[#231E1B]">{currentUser?.name}</h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full ${getRoleBadgeStyle(currentUser?.role)}`}
              >
                {currentUser?.role === 'ProjectOwner' ? 'Project Owner' : currentUser?.role}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#137333] border border-[#C6DEC7]">
                <CheckCircle2 className="w-3 h-3" />
                Active Account
              </span>
            </div>
            <p className="text-xs text-[#70685F]">
              {currentUser?.department || 'Operations Team'} &bull; PugArch Cloud Enterprise
            </p>
          </div>
        </div>

        {/* Detailed Attributes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#EDE7DC]">
          <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EDE7DC] space-y-1">
            <span className="text-[11px] font-semibold text-[#8F867A] uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#C85A32]" />
              Work Email Address
            </span>
            <div className="text-sm font-bold text-[#231E1B]">{currentUser?.email}</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EDE7DC] space-y-1">
            <span className="text-[11px] font-semibold text-[#8F867A] uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#C85A32]" />
              Registered Mobile Phone
            </span>
            <div className="text-sm font-bold text-[#231E1B]">
              {currentUser?.phone || 'Not registered'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EDE7DC] space-y-1">
            <span className="text-[11px] font-semibold text-[#8F867A] uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#C85A32]" />
              Department
            </span>
            <div className="text-sm font-bold text-[#231E1B]">
              {currentUser?.department || 'Executive'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EDE7DC] space-y-1">
            <span className="text-[11px] font-semibold text-[#8F867A] uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#C85A32]" />
              Security Status
            </span>
            <div className="text-sm font-bold text-[#231E1B]">Cryptographic Session &bull; HTTP-Only</div>
          </div>
        </div>

        {/* Pre-Registration Notice */}
        <div className="p-4 rounded-2xl bg-[#F5F1E8] border border-[#E0D9CB] flex items-start gap-3 text-xs text-[#70685F]">
          <UserCheck className="w-5 h-5 text-[#2D5A34] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-[#231E1B]">HR/CEO Enforced Account</div>
            <p className="leading-relaxed">
              Your account details were pre-authorized by executive management. Project roles and permissions are evaluated on the backend server for every action.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
