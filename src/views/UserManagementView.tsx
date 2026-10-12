import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Building2,
  Shield,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  department?: string | null;
  avatarUrl?: string | null;
  isSignupCompleted: boolean;
  createdAt?: string;
}

export const UserManagementView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeUserId } = useParams<{ id: string }>();
  const { preRegisterUser } = useAuth();

  // Determine active tab based on route pathname
  const isCreateRoute = location.pathname === '/users/register';
  const isPendingRoute = location.pathname === '/users/pending';

  const [activeTab, setActiveTab] = useState<'list' | 'create'>(isCreateRoute ? 'create' : 'list');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>(
    isPendingRoute ? 'pending' : 'all'
  );

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserDetail, setSelectedUserDetail] = useState<ManagedUser | null>(null);

  // Pre-registration form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDept, setFormDept] = useState('Operations');
  const [formRole, setFormRole] = useState<'Employee' | 'ProjectOwner'>('Employee');
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/users/management');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load user directory');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Sync tab and filter when route changes
  useEffect(() => {
    if (location.pathname === '/users/register') {
      setActiveTab('create');
    } else {
      setActiveTab('list');
      if (location.pathname === '/users/pending') {
        setStatusFilter('pending');
      } else if (location.pathname === '/users') {
        setStatusFilter('all');
      }
    }
  }, [location.pathname]);

  // Check if route has :id
  useEffect(() => {
    if (routeUserId && users.length > 0) {
      const match = users.find((u) => u.id === routeUserId);
      if (match) {
        setSelectedUserDetail(match);
      }
    }
  }, [routeUserId, users]);

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
      const res = await preRegisterUser({
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        department: formDept.trim(),
        role: formRole,
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

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D5]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl bg-white border border-[#DDD6C8] text-[#70685F] hover:text-[#231E1B] transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-[#70685F] mb-1">
              <span>Executive Control</span>
              <ChevronRight className="w-3 h-3 text-[#A49C90]" />
              <span className="font-semibold text-[#231E1B]">User Management</span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#231E1B]">
              Team Directory &amp; Pre-Registration
            </h1>
          </div>
        </div>

        {/* Tab Actions */}
        <div className="flex items-center gap-2">
          <button
            id="tab-btn-users-list"
            onClick={() => {
              navigate('/users');
              setActiveTab('list');
              setStatusFilter('all');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'list' && statusFilter === 'all'
                ? 'bg-[#C85A32] text-white shadow-xs'
                : 'bg-white text-[#70685F] hover:text-[#231E1B] border border-[#DDD6C8]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            All Directory ({users.length})
          </button>
          <button
            id="tab-btn-users-pending"
            onClick={() => {
              navigate('/users/pending');
              setActiveTab('list');
              setStatusFilter('pending');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'list' && statusFilter === 'pending'
                ? 'bg-[#B45309] text-white shadow-xs'
                : 'bg-white text-[#70685F] hover:text-[#231E1B] border border-[#DDD6C8]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending ({pendingCount})
          </button>
          <button
            id="tab-btn-users-register"
            onClick={() => {
              navigate('/users/register');
              setActiveTab('create');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-[#2D5A34] text-white shadow-xs'
                : 'bg-white text-[#2D5A34] hover:bg-[#EBF2EB] border border-[#C6DEC7]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Pre-Register User
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-3xl border border-[#E8E2D5] shadow-xs overflow-hidden">
        {activeTab === 'list' ? (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#8F867A]" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-[#DDD6C8] bg-white text-[#231E1B] placeholder-[#8F867A] focus:outline-hidden focus:border-[#C85A32]"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0 bg-[#F5F1E8] p-1 rounded-xl border border-[#E0D9CB]">
                <button
                  onClick={() => {
                    navigate('/users');
                    setStatusFilter('all');
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white text-[#231E1B] shadow-xs'
                      : 'text-[#70685F] hover:text-[#231E1B]'
                  }`}
                >
                  All ({users.length})
                </button>
                <button
                  onClick={() => {
                    navigate('/users/pending');
                    setStatusFilter('pending');
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'pending'
                      ? 'bg-white text-[#B45309] shadow-xs'
                      : 'text-[#70685F] hover:text-[#231E1B]'
                  }`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'completed'
                      ? 'bg-white text-[#15803D] shadow-xs'
                      : 'text-[#70685F] hover:text-[#231E1B]'
                  }`}
                >
                  Active ({completedCount})
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-xs text-[#991B1B] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Users Table / List */}
            {loading ? (
              <div className="py-12 text-center text-xs text-[#70685F]">
                Loading directory members...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#70685F]">
                No users match your current filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredUsers.map((u) => {
                  const isSelected = selectedUserDetail?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        setSelectedUserDetail(u);
                        navigate(`/users/${u.id}`);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'border-[#C85A32] bg-[#FDF8F5] ring-2 ring-[#C85A32]/20'
                          : 'border-[#EDE7DC] bg-[#FAF7F0] hover:border-[#DDD6C8] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={
                              u.avatarUrl ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`
                            }
                            alt={u.name}
                            className="w-10 h-10 rounded-full border border-[#DDD6C8] shrink-0 object-cover"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-[#231E1B] truncate">{u.name}</h4>
                            <span className="inline-block text-[10px] font-semibold text-[#70675D]">
                              {u.role === 'ProjectOwner' ? 'Project Owner' : u.role}
                            </span>
                          </div>
                        </div>

                        {u.isSignupCompleted ? (
                          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4EA] text-[#137333] border border-[#C6DEC7]">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-[11px] text-[#70685F] pt-2 border-t border-[#EDE7DC]">
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-[#8F867A] shrink-0" />
                          <span className="truncate">{u.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="w-3.5 h-3.5 text-[#8F867A] shrink-0" />
                          <span>{u.phone || 'No phone registered'}</span>
                        </div>
                        {u.department && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Building2 className="w-3.5 h-3.5 text-[#8F867A] shrink-0" />
                            <span>{u.department}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* PRE-REGISTER TAB */
          <div className="p-4 sm:p-8 max-w-xl mx-auto space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#231E1B]">Pre-Register New Team Member</h2>
              <p className="text-xs text-[#70685F] mt-1">
                Authorized HR/CEO registration: Candidates cannot sign up until their name, email, and mobile phone are pre-registered here.
              </p>
            </div>

            {formSuccess && (
              <div className="p-3.5 rounded-xl bg-[#E6F4EA] border border-[#C6DEC7] text-xs text-[#137333] flex items-start gap-2">
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

            <form onSubmit={handlePreRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Full Name <span className="text-[#C85A32]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] focus:outline-hidden focus:border-[#C85A32] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Corporate Email Address <span className="text-[#C85A32]">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sarah.jenkins@fernandfoley.internal"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] focus:outline-hidden focus:border-[#C85A32] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Mobile Phone Number <span className="text-[#C85A32]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +44 20 7946 0998"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] focus:outline-hidden focus:border-[#C85A32] min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                    Department
                  </label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] focus:outline-hidden focus:border-[#C85A32] min-h-[44px]"
                  >
                    <option value="Executive Leadership">Executive Leadership</option>
                    <option value="Operations">Operations</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Interior Design">Interior Design</option>
                    <option value="Project Management">Project Management</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] focus:outline-hidden focus:border-[#C85A32] min-h-[44px]"
                  >
                    <option value="Employee">Employee (Team Member)</option>
                    <option value="ProjectOwner">Project Owner (Lead)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#2D5A34] hover:bg-[#234729] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer min-h-[44px] disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  {submitting ? 'Registering Candidate...' : 'Pre-Register User & Authorize Signup'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
