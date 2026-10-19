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
  Network,
  Edit2,
  Trash2,
  Plus,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { RoleDefinition } from '../types.ts';

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
  roleDefinition?: { id: string; name: string; rank: number; isExecutive: boolean; canManageUsers: boolean } | null;
  department?: string | null;
  avatarUrl?: string | null;
  isSignupCompleted: boolean;
  createdAt?: string;
}

export const UserManagementView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeUserId } = useParams<{ id: string }>();
  const { preRegisterUser, isExecutive, canManageUsers } = useAuth();

  // Determine active tab based on route pathname
  const isCreateRoute = location.pathname === '/users/register';
  const isPendingRoute = location.pathname === '/users/pending';
  const isHierarchyRoute = location.pathname === '/users/hierarchy';

  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'hierarchy'>(
    isCreateRoute ? 'create' : isHierarchyRoute ? 'hierarchy' : 'list'
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>(
    isPendingRoute ? 'pending' : 'all'
  );

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserDetail, setSelectedUserDetail] = useState<ManagedUser | null>(null);

  // Pre-registration form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDept, setFormDept] = useState('Operations');
  const [formRoleId, setFormRoleId] = useState<string>('');
  const [formManagerId, setFormManagerId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Role Management State
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormRank, setRoleFormRank] = useState<number>(3);
  const [roleFormIsExecutive, setRoleFormIsExecutive] = useState(false);
  const [roleFormCanManageUsers, setRoleFormCanManageUsers] = useState(false);
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleFeedback, setRoleFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // User Reassignment Modal State
  const [reassignUser, setReassignUser] = useState<ManagedUser | null>(null);
  const [reassignRoleId, setReassignRoleId] = useState<string>('');
  const [reassignManagerId, setReassignManagerId] = useState<string>('');
  const [reassignSubmitting, setReassignSubmitting] = useState(false);
  const [reassignFeedback, setReassignFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchUsersAndRoles = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersRes, rolesRes] = await Promise.all([
        apiFetch('/api/users/management'),
        apiFetch('/api/roles'),
      ]);

      if (!usersRes.ok) {
        const data = await usersRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load user directory');
      }
      const userData = await usersRes.json();
      setUsers(userData);

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData);
        if (rolesData.length > 0 && !formRoleId) {
          const defaultRole = rolesData.find((r: any) => r.name === 'Employee') || rolesData[rolesData.length - 1];
          setFormRoleId(defaultRole.id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users and roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  // Sync tab and filter when route changes
  useEffect(() => {
    if (location.pathname === '/users/register') {
      setActiveTab('create');
    } else if (location.pathname === '/users/hierarchy') {
      setActiveTab('hierarchy');
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
        await fetchUsersAndRoles();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to pre-register user');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Role Modal for Create or Edit
  const openCreateRole = () => {
    setEditingRoleId(null);
    setRoleFormName('');
    const maxRank = roles.reduce((max, r) => Math.max(max, r.rank), 0);
    setRoleFormRank(maxRank + 1);
    setRoleFormIsExecutive(false);
    setRoleFormCanManageUsers(false);
    setRoleFeedback(null);
    setShowRoleModal(true);
  };

  const openEditRole = (role: RoleDefinition) => {
    setEditingRoleId(role.id);
    setRoleFormName(role.name);
    setRoleFormRank(role.rank);
    setRoleFormIsExecutive(role.isExecutive);
    setRoleFormCanManageUsers(role.canManageUsers);
    setRoleFeedback(null);
    setShowRoleModal(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormName.trim()) {
      setRoleFeedback({ type: 'error', message: 'Role name is required.' });
      return;
    }

    setRoleSubmitting(true);
    setRoleFeedback(null);
    try {
      if (editingRoleId) {
        // Update existing role
        const res = await apiFetch(`/api/roles/${editingRoleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: roleFormName.trim(),
            rank: Number(roleFormRank),
            isExecutive: roleFormIsExecutive,
            canManageUsers: roleFormCanManageUsers,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update role');
        setRoleFeedback({ type: 'success', message: `Role "${data.name}" updated successfully.` });
      } else {
        // Create new role
        const res = await apiFetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: roleFormName.trim(),
            rank: Number(roleFormRank),
            isExecutive: roleFormIsExecutive,
            canManageUsers: roleFormCanManageUsers,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create role');
        setRoleFeedback({ type: 'success', message: `Role "${data.name}" created successfully.` });
      }
      await fetchUsersAndRoles();
      setTimeout(() => setShowRoleModal(false), 800);
    } catch (err: any) {
      setRoleFeedback({ type: 'error', message: err.message || 'Operation failed' });
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: RoleDefinition) => {
    if (!window.confirm(`Are you sure you want to deactivate or remove role "${role.name}"?`)) {
      return;
    }
    try {
      const res = await apiFetch(`/api/roles/${role.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove role');
      await fetchUsersAndRoles();
    } catch (err: any) {
      alert(err.message || 'Failed to delete role');
    }
  };

  // Open Reassign Modal for User
  const openReassignUser = (user: ManagedUser) => {
    setReassignUser(user);
    setReassignRoleId(user.roleId || (roles.find((r) => r.name === user.role)?.id || ''));
    setReassignManagerId(user.managerId || '');
    setReassignFeedback(null);
  };

  const handleSaveReassignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignUser) return;

    setReassignSubmitting(true);
    setReassignFeedback(null);
    try {
      // 1. Update role if changed
      if (reassignRoleId) {
        const roleRes = await apiFetch(`/api/users/${reassignUser.id}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roleId: reassignRoleId }),
        });
        const roleData = await roleRes.json();
        if (!roleRes.ok) throw new Error(roleData.error || 'Failed to update user role');
      }

      // 2. Update manager
      const mgrRes = await apiFetch(`/api/users/${reassignUser.id}/manager`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId: reassignManagerId || null }),
      });
      const mgrData = await mgrRes.json();
      if (!mgrRes.ok) throw new Error(mgrData.error || 'Failed to update reporting manager');

      setReassignFeedback({ type: 'success', message: 'User role and reporting manager successfully updated.' });
      await fetchUsersAndRoles();
      setTimeout(() => setReassignUser(null), 800);
    } catch (err: any) {
      setReassignFeedback({ type: 'error', message: err.message || 'Reassignment failed' });
    } finally {
      setReassignSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery)) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.role && u.role.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'pending') return !u.isSignupCompleted;
    if (statusFilter === 'completed') return u.isSignupCompleted;
    return true;
  });

  const pendingCount = users.filter((u) => !u.isSignupCompleted).length;

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
              <span>Organization</span>
              <ChevronRight className="w-3 h-3 text-[#A49C90]" />
              <span className="font-semibold text-[#231E1B]">Team &amp; Access Control</span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#231E1B]">
              Directory &amp; Organizational Hierarchy
            </h1>
          </div>
        </div>

        {/* Tab Actions */}
        <div className="flex items-center gap-2 flex-wrap">
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
            id="tab-btn-users-hierarchy"
            onClick={() => {
              navigate('/users/hierarchy');
              setActiveTab('hierarchy');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'hierarchy'
                ? 'bg-[#231E1B] text-white shadow-xs'
                : 'bg-white text-[#231E1B] hover:bg-[#F5F2EB] border border-[#DDD6C8]'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Roles &amp; Hierarchy ({roles.length})
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

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-[#E8E2D5] shadow-xs overflow-hidden">
        {activeTab === 'list' ? (
          /* USER DIRECTORY TAB */
          <div className="p-4 sm:p-6 space-y-4">
            {/* Search and Stats */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#8F867A]" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone, role, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] placeholder-[#8F867A] focus:outline-hidden focus:border-[#C85A32]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#70685F]">
                  Showing {filteredUsers.length} of {users.length} members
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-[#70685F]">Loading organizational directory...</div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-xs text-[#991B1B] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#70685F] bg-[#FAF8F4] rounded-2xl border border-dashed border-[#DDD6C8]">
                No members found matching your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredUsers.map((u) => {
                  const roleRank = u.roleDefinition?.rank ?? u.roleRank ?? (u.role === 'CEO' ? 1 : u.role === 'CTO' ? 2 : u.role === 'Intern' ? 4 : 3);
                  const isExec = u.roleDefinition?.isExecutive ?? (u.role === 'CEO');

                  return (
                    <div
                      key={u.id}
                      className="p-4 rounded-2xl border border-[#EDE7DC] bg-[#FAF8F4] hover:border-[#DDD6C8] transition-all flex flex-col justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-2">
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
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isExec
                                      ? 'bg-[#FBE8E2] text-[#A63C1E] border border-[#F3CEC1]'
                                      : roleRank <= 2
                                      ? 'bg-[#EBF2EB] text-[#2D5A34] border border-[#C6DEC7]'
                                      : 'bg-[#EFECE4] text-[#554E45] border border-[#DDD6C8]'
                                  }`}
                                >
                                  {u.roleDefinition?.name || u.role} (Rank {roleRank})
                                </span>
                              </div>
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

                        {/* Reporting line */}
                        <div className="text-[11px] text-[#70685F] bg-white px-2.5 py-1.5 rounded-xl border border-[#EDE7DC]">
                          <span className="font-semibold text-[#231E1B]">Reports to: </span>
                          {u.manager ? (
                            <span>
                              {u.manager.name} ({u.manager.role})
                            </span>
                          ) : (
                            <span className="italic text-[#8F867A]">Top-Level / Executive</span>
                          )}
                        </div>

                        <div className="space-y-1 text-[11px] text-[#70685F] pt-1">
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

                      {/* Reassign action button */}
                      {canManageUsers && (
                        <div className="pt-2 border-t border-[#EDE7DC] flex justify-end">
                          <button
                            onClick={() => openReassignUser(u)}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-[#DDD6C8] hover:border-[#C85A32] text-[#70685F] hover:text-[#C85A32] transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <ArrowUpDown className="w-3 h-3" />
                            Assign Role &amp; Manager
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'hierarchy' ? (
          /* HIERARCHY & ROLES TAB */
          <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EDE7DC]">
              <div>
                <h2 className="text-base font-bold text-[#231E1B]">Dynamic Organizational Hierarchy</h2>
                <p className="text-xs text-[#70685F] mt-0.5">
                  Hierarchy ranks govern management scopes, reporting lines, and project/workload visibility.
                </p>
              </div>

              {canManageUsers && (
                <button
                  onClick={openCreateRole}
                  className="px-3.5 py-2 rounded-xl bg-[#231E1B] hover:bg-[#3D352E] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Create New Role
                </button>
              )}
            </div>

            {/* Visual Hierarchy Tiers */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#70685F]">
                Configured Role Levels
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {roles
                  .slice()
                  .sort((a, b) => a.rank - b.rank)
                  .map((r, index) => {
                    const assignedUsers = users.filter((u) => u.roleDefinition?.id === r.id || u.role === r.name);
                    return (
                      <div
                        key={r.id}
                        className="p-4 rounded-2xl border border-[#EDE7DC] bg-[#FAF8F4] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white border border-[#DDD6C8] flex items-center justify-center font-bold text-xs text-[#231E1B] shrink-0">
                            #{r.rank}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-[#231E1B]">{r.name}</h4>
                              {r.isExecutive && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBE8E2] text-[#A63C1E] border border-[#F3CEC1]">
                                  Executive Visibility
                                </span>
                              )}
                              {r.canManageUsers && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2EB] text-[#2D5A34] border border-[#C6DEC7]">
                                  Can Manage Users
                                </span>
                              )}
                              {!r.isActive && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F3F4F6] text-[#6B7280]">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#70685F] mt-0.5">
                              {assignedUsers.length} assigned member{assignedUsers.length === 1 ? '' : 's'}
                              {assignedUsers.length > 0 && (
                                <span className="ml-1 text-[#231E1B]">
                                  ({assignedUsers.map((u) => u.name).slice(0, 3).join(', ')}
                                  {assignedUsers.length > 3 ? ` +${assignedUsers.length - 3} more` : ''})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {canManageUsers && (
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => openEditRole(r)}
                              className="p-2 rounded-xl bg-white border border-[#DDD6C8] text-[#70685F] hover:text-[#231E1B] hover:border-[#C85A32] transition-colors cursor-pointer"
                              title="Edit Role Definition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRole(r)}
                              className="p-2 rounded-xl bg-white border border-[#DDD6C8] text-[#991B1B] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                              title="Deactivate Role"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Organizational Reporting Structure Map */}
            <div className="p-4 rounded-2xl bg-[#F5F2EB] border border-[#EDE7DC] space-y-2">
              <h4 className="text-xs font-bold text-[#231E1B]">How Dynamic Access Control Works:</h4>
              <ul className="text-xs text-[#70685F] space-y-1 list-disc list-inside">
                <li>
                  <strong className="text-[#231E1B]">Executive Leadership (Rank 1):</strong> Complete organization-wide visibility into all projects, tasks, employees, workloads, and analytics.
                </li>
                <li>
                  <strong className="text-[#231E1B]">Managers &amp; Leads (Configurable Ranks):</strong> Visibility over direct and recursive subordinates within their assigned and authorized projects. Excludes workloads of higher-ranking leaders and unrelated organizational projects.
                </li>
                <li>
                  <strong className="text-[#231E1B]">Operational Members &amp; Interns:</strong> Strictly limited to their own assigned workload and authorized project details.
                </li>
              </ul>
            </div>
          </div>
        ) : (
          /* PRE-REGISTER TAB */
          <div className="p-4 sm:p-8 max-w-xl mx-auto space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#231E1B]">Pre-Register New Team Member</h2>
              <p className="text-xs text-[#70685F] mt-1">
                Authorized registration: Candidates cannot sign up until their name, corporate email, mobile phone, and role hierarchy are configured here.
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
                  placeholder="e.g. Jordan Reed"
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
                  placeholder="e.g. jordan.reed@fernandfoley.internal"
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
                    value={formRoleId}
                    onChange={(e) => setFormRoleId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] focus:outline-hidden focus:border-[#C85A32] min-h-[44px]"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] focus:outline-hidden focus:border-[#C85A32] min-h-[44px]"
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

      {/* Role Create / Edit Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#E8E2D5] shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE7DC]">
              <h3 className="text-sm font-bold text-[#231E1B]">
                {editingRoleId ? 'Edit Role Definition' : 'Create New Organizational Role'}
              </h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-[#70685F] hover:text-[#231E1B] text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {roleFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  roleFeedback.type === 'success'
                    ? 'bg-[#E6F4EA] border border-[#C6DEC7] text-[#137333]'
                    : 'bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B]'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{roleFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveRole} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Architect, VP of Engineering"
                  value={roleFormName}
                  onChange={(e) => setRoleFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] focus:outline-hidden focus:border-[#C85A32]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">
                  Hierarchy Rank (Lower number = Higher authority)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  required
                  value={roleFormRank}
                  onChange={(e) => setRoleFormRank(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] focus:outline-hidden focus:border-[#C85A32]"
                />
                <span className="text-[10px] text-[#70685F] mt-0.5 block">
                  Example: 1 = CEO, 2 = CTO, 2.5 = VP, 3 = Employee, 4 = Intern
                </span>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#231E1B]">
                  <input
                    type="checkbox"
                    checked={roleFormIsExecutive}
                    onChange={(e) => setRoleFormIsExecutive(e.target.checked)}
                    className="rounded border-[#DDD6C8] text-[#C85A32] focus:ring-[#C85A32]"
                  />
                  <span className="font-semibold">Executive Level (Organization-wide visibility)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#231E1B]">
                  <input
                    type="checkbox"
                    checked={roleFormCanManageUsers}
                    onChange={(e) => setRoleFormCanManageUsers(e.target.checked)}
                    className="rounded border-[#DDD6C8] text-[#C85A32] focus:ring-[#C85A32]"
                  />
                  <span className="font-semibold">Can Manage Users &amp; Directory Pre-Registration</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EDE7DC]">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-3 py-2 rounded-xl border border-[#DDD6C8] text-xs font-semibold text-[#70685F] hover:bg-[#FAF8F4] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={roleSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#231E1B] hover:bg-[#3D352E] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {roleSubmitting ? 'Saving...' : editingRoleId ? 'Save Changes' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Reassignment Modal */}
      {reassignUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#E8E2D5] shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE7DC]">
              <div>
                <h3 className="text-sm font-bold text-[#231E1B]">Assign Role &amp; Manager</h3>
                <p className="text-xs text-[#70685F] mt-0.5">{reassignUser.name}</p>
              </div>
              <button
                onClick={() => setReassignUser(null)}
                className="text-[#70685F] hover:text-[#231E1B] text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {reassignFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  reassignFeedback.type === 'success'
                    ? 'bg-[#E6F4EA] border border-[#C6DEC7] text-[#137333]'
                    : 'bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B]'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reassignFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveReassignment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">Assigned Role</label>
                <select
                  value={reassignRoleId}
                  onChange={(e) => setReassignRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] focus:outline-hidden focus:border-[#C85A32]"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Rank {r.rank}{r.isExecutive ? ' • Executive' : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231E1B] mb-1">Reporting Manager</label>
                <select
                  value={reassignManagerId}
                  onChange={(e) => setReassignManagerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] focus:outline-hidden focus:border-[#C85A32]"
                >
                  <option value="">None (Top-Level / Self-Managed)</option>
                  {users
                    .filter((u) => u.id !== reassignUser.id && u.isSignupCompleted)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.role} ({u.email})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EDE7DC]">
                <button
                  type="button"
                  onClick={() => setReassignUser(null)}
                  className="px-3 py-2 rounded-xl border border-[#DDD6C8] text-xs font-semibold text-[#70685F] hover:bg-[#FAF8F4] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassignSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#2D5A34] hover:bg-[#234729] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {reassignSubmitting ? 'Updating...' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
