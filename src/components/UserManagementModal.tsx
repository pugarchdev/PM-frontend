import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  UserPlus,
  Search,
  X,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Building2,
  Shield,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useUsersManagementQuery, useRolesQuery, invalidateUserQueries } from '../lib/queries.ts';
import { queryClient } from '../lib/queryClient.ts';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  roleId?: string | null;
  roleRank?: number;
  isExecutive?: boolean;
  canManageUsers?: boolean;
  managerId?: string | null;
  manager?: { id: string; name: string; role: string } | null;
  roleDefinition?: { id: string; name: string; rank: number; isExecutive: boolean } | null;
  department?: string | null;
  avatarUrl?: string | null;
  isSignupCompleted: boolean;
  createdAt?: string;
}

interface RoleOption {
  id: string;
  name: string;
  rank: number;
  isExecutive: boolean;
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, preRegisterUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const { data: usersData = [], isLoading: usersLoading, error: usersErr } = useUsersManagementQuery(currentUser?.id);
  const { data: rolesData = [], isLoading: rolesLoading } = useRolesQuery(currentUser?.id);

  const users = usersData as ManagedUser[];
  const roles = rolesData as RoleOption[];
  const loading = usersLoading || rolesLoading;
  const [mutationError, setMutationError] = useState<string | null>(null);
  const error = mutationError || (usersErr ? (usersErr as Error).message : null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDept, setFormDept] = useState('Operations');
  const [formRoleId, setFormRoleId] = useState<string>('');
  const [formManagerId, setFormManagerId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (roles.length > 0 && !formRoleId) {
      const defaultRole = roles.find((r: any) => r.name === 'Employee') || roles[roles.length - 1];
      setFormRoleId(defaultRole.id);
    }
  }, [roles, formRoleId]);

  const fetchUsers = async () => {
    invalidateUserQueries(queryClient, currentUser?.id);
  };

  useEffect(() => {
    if (isOpen) {
      setFormSuccess(null);
      setFormError(null);
    }
  }, [isOpen]);

  const handlePreRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formName.trim() || !formEmail.trim() || !formPhone.trim()) {
      setFormError('Please fill in Full Name, Email, and Phone Number.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedRole = roles.find((r) => r.id === formRoleId);
      const res = await preRegisterUser({
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        department: formDept.trim(),
        role: selectedRole?.name || 'Employee',
        roleId: formRoleId || undefined,
        managerId: formManagerId || undefined,
      });

      if (!res.success) {
        setFormError(res.error || 'Pre-registration failed');
      } else {
        setFormSuccess(
          `User "${formName}" was successfully pre-registered. They can now complete signup using their email and phone.`
        );
        setFormName('');
        setFormEmail('');
        setFormPhone('');
        await fetchUsers();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to pre-register user');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery)) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'pending') return !u.isSignupCompleted;
    if (statusFilter === 'completed') return u.isSignupCompleted;
    return true;
  });

  const pendingCount = users.filter((u) => !u.isSignupCompleted).length;
  const completedCount = users.filter((u) => u.isSignupCompleted).length;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="user-management-modal"
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#E2DBD0] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#EFECE4] bg-[#FBF9F4]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EBF2EB] text-[#2D5A34] flex items-center justify-center border border-[#C6DEC7]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#231E1B]">
                User Management &amp; Pre-Registration
              </h3>
              <p className="text-xs text-[#7A7165]">
                HR &amp; Executive control: Pre-register candidates and oversee signup completion status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8F867A] hover:text-[#231E1B] hover:bg-[#EFECE4] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#EFECE4] px-4 sm:px-6 bg-[#FAF7F0] gap-2 pt-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'border-[#C85A32] text-[#C85A32]'
                : 'border-transparent text-[#70685F] hover:text-[#231E1B]'
            }`}
          >
            <Users className="w-4 h-4" />
            Registered Users ({users.length})
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#FFF8E6] text-[#B45309] border border-[#FDE68A]">
                {pendingCount} Pending
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-[#C85A32] text-[#C85A32]'
                : 'border-transparent text-[#70685F] hover:text-[#231E1B]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            + Pre-Register User
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'list' ? (
            <div className="space-y-4">
              {/* Search & Filter bar */}
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-[#8F867A]" />
                  <input
                    type="text"
                    placeholder="Search by name, email, phone, or department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#DDD6C8] bg-white text-[#231E1B] placeholder-[#8F867A] focus:outline-hidden focus:border-[#C85A32]"
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0 bg-[#F5F1E8] p-1 rounded-xl border border-[#E0D9CB]">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-white text-[#231E1B] shadow-2xs'
                        : 'text-[#70685F] hover:text-[#231E1B]'
                    }`}
                  >
                    All ({users.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      statusFilter === 'pending'
                        ? 'bg-white text-[#B45309] shadow-2xs font-bold'
                        : 'text-[#70685F] hover:text-[#231E1B]'
                    }`}
                  >
                    Pending ({pendingCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('completed')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      statusFilter === 'completed'
                        ? 'bg-white text-[#2D5A34] shadow-2xs font-bold'
                        : 'text-[#70685F] hover:text-[#231E1B]'
                    }`}
                  >
                    Completed ({completedCount})
                  </button>
                </div>
              </div>

              {/* User List */}
              {loading ? (
                <div className="py-12 text-center text-xs text-[#70685F]">Loading user directory...</div>
              ) : error ? (
                <div className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-xs text-[#991B1B] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#70685F] bg-[#FAF7F0] rounded-2xl border border-dashed border-[#DDD6C8]">
                  No matching users found.
                </div>
              ) : (
                <div className="divide-y divide-[#EFECE4] border border-[#E8E2D5] rounded-2xl overflow-hidden bg-white">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-3 sm:p-4 hover:bg-[#FAF7F0] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={
                            u.avatarUrl ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`
                          }
                          alt={u.name}
                          className="w-10 h-10 rounded-full object-cover border border-[#E0D9CB] shrink-0"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-[#231E1B] truncate">{u.name}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                u.roleDefinition?.isExecutive || u.role === 'CEO'
                                  ? 'bg-[#FBE8E2] text-[#A63C1E] border border-[#F3CEC1]'
                                  : (u.roleRank ?? 3) <= 2
                                  ? 'bg-[#EBF2EB] text-[#2D5A34] border border-[#C6DEC7]'
                                  : 'bg-[#EFECE4] text-[#554E45] border border-[#DDD6C8]'
                              }`}
                            >
                              {u.roleDefinition?.name || u.role}
                            </span>
                            {u.manager && (
                              <span className="text-[10px] text-[#70685F] italic">
                                Reports to: {u.manager.name} ({u.manager.role})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[#70685F] flex-wrap">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-[#8F867A]" />
                              {u.email}
                            </span>
                            {u.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-[#8F867A]" />
                                {u.phone}
                              </span>
                            )}
                            {u.department && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-[#8F867A]" />
                                {u.department}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
                        {u.isSignupCompleted ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EBF2EB] text-[#2D5A34] border border-[#C6DEC7] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Signup Completed
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FFF8E6] text-[#B45309] border border-[#FDE68A] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pending Signup
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* PRE-REGISTER FORM */
            <form onSubmit={handlePreRegister} className="space-y-4 max-w-xl mx-auto py-2">
              <div className="p-3 rounded-2xl bg-[#F5F1E8] border border-[#E0D9CB] text-xs text-[#70685F] space-y-1">
                <div className="font-bold text-[#231E1B] flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#C85A32]" />
                  HR/CEO Pre-Registration Policy
                </div>
                <p className="leading-relaxed">
                  Enter the candidate's verified name, email address, and phone number. The user will be required to input matching credentials upon signup before their account is activated.
                </p>
              </div>

              {formSuccess && (
                <div className="p-3.5 rounded-xl bg-[#EBF2EB] border border-[#C6DEC7] text-xs text-[#2D5A34] flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {formError && (
                <div className="p-3.5 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-xs text-[#991B1B] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Full Name <span className="text-[#C85A32]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Reed"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] placeholder-[#8F867A] focus:outline-hidden focus:border-[#C85A32] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Official Work Email <span className="text-[#C85A32]">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. jordan.reed@fernandfoley.internal"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] placeholder-[#8F867A] focus:outline-hidden focus:border-[#C85A32] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Phone Number <span className="text-[#C85A32]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +44 20 7946 0998"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] placeholder-[#8F867A] focus:outline-hidden focus:border-[#C85A32] min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Operations"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] placeholder-[#8F867A] focus:outline-hidden focus:border-[#C85A32] min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={formRoleId}
                    onChange={(e) => setFormRoleId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] focus:outline-hidden focus:border-[#C85A32] min-h-[44px]"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Rank {r.rank}{r.isExecutive ? ' • Executive' : ''})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Reporting Manager
                </label>
                <select
                  value={formManagerId}
                  onChange={(e) => setFormManagerId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] focus:outline-hidden focus:border-[#C85A32] min-h-[44px]"
                >
                  <option value="">None (Top-Level / Self-Managed)</option>
                  {users
                    .filter((u) => u.isSignupCompleted)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.role} ({u.email})
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#C85A32] hover:bg-[#A63C1E] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer min-h-[44px] disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  {submitting ? 'Pre-Registering...' : 'Pre-Register User Record'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
