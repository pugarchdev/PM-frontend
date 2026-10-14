import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Shield,
  Building2,
  Mail,
  Phone,
  Calendar,
  Clock,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Check,
  X,
  Lock,
  User as UserIcon,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { currentUser, logout, isCEO, updateProfile } = useAuth();
  const navigate = useNavigate();

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Validation & Feedback state
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync form inputs with current user
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setDepartment(currentUser.department || '');
    }
  }, [currentUser]);

  // Clear feedback after 4 seconds
  useEffect(() => {
    if (feedback?.type === 'success') {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'CEO':
        return 'bg-[#FBE8E2] text-[#A63C1E] border border-[#F3CEC1] font-semibold';
      case 'CTO':
        return 'bg-[#EBF2EB] text-[#2D5A34] border border-[#C6DEC7] font-semibold';
      default:
        return 'bg-[#EFECE4] text-[#554E45] border border-[#DDD6C8]';
    }
  };

  const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return 'Not available';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return 'Not available';
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Not available';
    }
  };

  const formatDateTime = (dateString?: string | Date | null) => {
    if (!dateString) return 'Not available';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return 'Not available';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return 'Not available';
    }
  };

  const handleStartEditing = () => {
    setName(currentUser?.name || '');
    setEmail(currentUser?.email || '');
    setPhone(currentUser?.phone || '');
    setDepartment(currentUser?.department || '');
    setNameError(null);
    setEmailError(null);
    setPhoneError(null);
    setFeedback(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setName(currentUser?.name || '');
    setEmail(currentUser?.email || '');
    setPhone(currentUser?.phone || '');
    setDepartment(currentUser?.department || '');
    setNameError(null);
    setEmailError(null);
    setPhoneError(null);
    setFeedback(null);
    setIsEditing(false);
  };

  const validateName = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) {
      setNameError('Full name is required.');
      return false;
    }
    if (trimmed.length < 2) {
      setNameError('Full name must be at least 2 characters.');
      return false;
    }
    if (trimmed.length > 100) {
      setNameError('Full name must not exceed 100 characters.');
      return false;
    }
    if (/[<>{}]/.test(trimmed)) {
      setNameError('Full name contains invalid characters.');
      return false;
    }
    setNameError(null);
    return true;
  };

  const validateEmail = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) {
      setEmailError('Email address is required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validatePhone = (val: string): boolean => {
    const trimmed = val.trim();
    if (trimmed) {
      const digitsOnly = trimmed.replace(/\D/g, '');
      if (digitsOnly.length < 7 || digitsOnly.length > 15) {
        setPhoneError('Phone number must contain 7 to 15 digits.');
        return false;
      }
    }
    setPhoneError(null);
    return true;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isPhoneValid = validatePhone(phone);

    if (!isNameValid || !isEmailValid || !isPhoneValid) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        department: isCEO ? department.trim() : undefined,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Profile information updated successfully.',
        });
        setIsEditing(false);
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to update profile. Please try again.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'An unexpected error occurred while saving profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header & Action Bar */}
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
            <h1 className="font-serif text-2xl font-bold text-[#231E1B]">Account Profile</h1>
            <p className="text-xs text-[#70685F]">View and manage your identity credentials and workspace access</p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!isEditing ? (
            <>
              <button
                type="button"
                onClick={handleStartEditing}
                className="px-4 py-2 rounded-xl bg-[#C85A32] hover:bg-[#B34D28] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Profile
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                className="px-4 py-2 rounded-xl bg-[#FBE8E2] hover:bg-[#F7D6CC] text-[#8C3A27] text-xs font-semibold flex items-center gap-1.5 border border-[#F3CEC1] transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#FAF7F0] text-[#70685F] text-xs font-semibold flex items-center gap-1.5 border border-[#DDD6C8] transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-[#C85A32] hover:bg-[#B34D28] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save Changes
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-medium transition-all ${
            feedback.type === 'success'
              ? 'bg-[#EAF5EA] border border-[#C2E4C3] text-[#1D5E25]'
              : 'bg-[#FDF0ED] border border-[#F6C6BA] text-[#A63C1E]'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2D5A34]" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-[#C85A32]" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Identity Banner Card */}
      <div className="bg-white rounded-3xl border border-[#E8E2D5] shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Visual Initials Avatar (Read-only, no upload) */}
          <div className="w-20 h-20 rounded-2xl bg-[#F5EFEB] border-2 border-[#E8E2D5] flex items-center justify-center text-2xl font-serif font-bold text-[#8C3A27] shrink-0 shadow-xs">
            {currentUser?.name
              ? currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : 'U'}
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-[#231E1B]">{currentUser?.name}</h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full ${getRoleBadgeStyle(currentUser?.role)}`}
              >
                {currentUser?.role}
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
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION A: PERSONAL INFORMATION */}
        <div className="bg-white rounded-3xl border border-[#E8E2D5] shadow-xs p-6 sm:p-8 space-y-5">
          <div className="pb-3 border-b border-[#EDE7DC]">
            <h2 className="text-base font-bold text-[#231E1B] flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-[#C85A32]" />
              Personal Information
            </h2>
            <p className="text-xs text-[#70685F] mt-0.5">
              Your personal identity and contact details within the organization
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name (Editable) */}
            <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EDE7DC] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-[#8F867A] uppercase tracking-wider flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#C85A32]" />
                  Full Name {isEditing && <span className="text-[#C85A32]">*</span>}
                </label>
                <span className="text-[10px] font-medium text-[#70685F] bg-white px-2 py-0.5 rounded-md border border-[#E0D9CB]">
                  {isEditing ? 'Editing' : 'Editable'}
                </span>
              </div>

              {!isEditing ? (
                <div className="text-sm font-bold text-[#231E1B] pt-0.5">{currentUser?.name}</div>
              ) : (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) validateName(e.target.value);
                    }}
                    placeholder="Enter your full name"
                    className={`w-full px-3 py-2 text-sm rounded-xl bg-white border text-[#231E1B] placeholder-[#9E9589] focus:outline-hidden focus:ring-1 transition-colors ${
                      nameError
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-[#DDD6C8] focus:border-[#C85A32] focus:ring-[#C85A32]'
                    }`}
                    autoFocus
                  />
                  {nameError && (
                    <p className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {nameError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Email Address (Editable) */}
            <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EDE7DC] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-[#8F867A] uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#C85A32]" />
                  Email Address {isEditing && <span className="text-[#C85A32]">*</span>}
                </label>
                <span className="text-[10px] font-medium text-[#70685F] bg-white px-2 py-0.5 rounded-md border border-[#E0D9CB]">
                  {isEditing ? 'Editing' : 'Editable'}
                </span>
              </div>

              {!isEditing ? (
                <>
                  <div className="text-sm font-bold text-[#231E1B] pt-0.5">{currentUser?.email}</div>
                  <p className="text-[11px] text-[#70685F] pt-0.5">
                    Primary login credential and project notification address.
                  </p>
                </>
              ) : (
                <div className="space-y-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) validateEmail(e.target.value);
                    }}
                    placeholder="Enter email address"
                    className={`w-full px-3 py-2 text-sm rounded-xl bg-white border text-[#231E1B] placeholder-[#9E9589] focus:outline-hidden focus:ring-1 transition-colors ${
                      emailError
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-[#DDD6C8] focus:border-[#C85A32] focus:ring-[#C85A32]'
                    }`}
                  />
                  {emailError && (
                    <p className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {emailError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Phone (Editable) */}
            <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EDE7DC] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-[#8F867A] uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#C85A32]" />
                  Mobile Phone
                </label>
                <span className="text-[10px] font-medium text-[#70685F] bg-white px-2 py-0.5 rounded-md border border-[#E0D9CB]">
                  {isEditing ? 'Editing' : 'Editable'}
                </span>
              </div>

              {!isEditing ? (
                <>
                  <div className="text-sm font-bold text-[#231E1B] pt-0.5">
                    {currentUser?.phone || 'Not registered'}
                  </div>
                  <p className="text-[11px] text-[#70685F] pt-0.5">
                    Used for SMS alerts, two-factor verification, and recovery.
                  </p>
                </>
              ) : (
                <div className="space-y-1">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) validatePhone(e.target.value);
                    }}
                    placeholder="e.g. +442079460991"
                    className={`w-full px-3 py-2 text-sm rounded-xl bg-white border text-[#231E1B] placeholder-[#9E9589] focus:outline-hidden focus:ring-1 transition-colors ${
                      phoneError
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-[#DDD6C8] focus:border-[#C85A32] focus:ring-[#C85A32]'
                    }`}
                  />
                  {phoneError && (
                    <p className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {phoneError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Department (Editable for CEO, Read-only for others) */}
            <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EDE7DC] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#8F867A] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#C85A32]" />
                  Department
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#70685F] bg-white px-2 py-0.5 rounded-md border border-[#E0D9CB]">
                  {isCEO ? (
                    isEditing ? 'Editing' : 'Executive Control'
                  ) : (
                    <>
                      <Lock className="w-2.5 h-2.5 text-[#8F867A]" />
                      Read-Only
                    </>
                  )}
                </span>
              </div>

              {!isEditing || !isCEO ? (
                <>
                  <div className="text-sm font-bold text-[#231E1B]">
                    {currentUser?.department || 'Operations Team'}
                  </div>
                  <p className="text-[11px] text-[#70685F] pt-0.5">
                    {isCEO
                      ? 'Executive department designation.'
                      : 'Assigned by Executive Management / HR.'}
                  </p>
                </>
              ) : (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Enter department name"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-[#DDD6C8] text-[#231E1B] placeholder-[#9E9589] focus:outline-hidden focus:border-[#C85A32] focus:ring-1 focus:ring-[#C85A32] transition-colors"
                  />
                  <p className="text-[11px] text-[#70685F]">
                    CEO authority permitted to update organizational designation.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION B: ACCOUNT INFORMATION (All Read-only) */}
        <div className="bg-white rounded-3xl border border-[#E8E2D5] shadow-xs p-6 sm:p-8 space-y-5">
          <div className="pb-3 border-b border-[#EDE7DC]">
            <h2 className="text-base font-bold text-[#231E1B] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#C85A32]" />
              Account Information
            </h2>
            <p className="text-xs text-[#70685F] mt-0.5">
              System access credentials, privileges, and account timestamp logs
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* User Role */}
            <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EDE7DC] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#8F867A] uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#C85A32]" />
                  System Role
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#70685F] bg-white px-2 py-0.5 rounded-md border border-[#E0D9CB]">
                  <Lock className="w-2.5 h-2.5 text-[#8F867A]" />
                  Read-Only
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full ${getRoleBadgeStyle(currentUser?.role)}`}
                >
                  {currentUser?.role}
                </span>
              </div>
              <p className="text-[11px] text-[#70685F]">
                Determines workspace permissions. Role changes are restricted to executive management.
              </p>
            </div>

            {/* Account Creation Date */}
            <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EDE7DC] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#8F867A] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#C85A32]" />
                  Account Created
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#70685F] bg-white px-2 py-0.5 rounded-md border border-[#E0D9CB]">
                  <Lock className="w-2.5 h-2.5 text-[#8F867A]" />
                  Read-Only
                </span>
              </div>
              <div className="text-sm font-bold text-[#231E1B]">
                {formatDate(currentUser?.createdAt)}
              </div>
              <p className="text-[11px] text-[#70685F]">
                Timestamp when your account profile was initially provisioned.
              </p>
            </div>

            {/* Last Updated */}
            <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EDE7DC] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#8F867A] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#C85A32]" />
                  Last Updated
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#70685F] bg-white px-2 py-0.5 rounded-md border border-[#E0D9CB]">
                  <Lock className="w-2.5 h-2.5 text-[#8F867A]" />
                  Read-Only
                </span>
              </div>
              <div className="text-sm font-bold text-[#231E1B]">
                {formatDateTime(currentUser?.updatedAt || currentUser?.createdAt)}
              </div>
              <p className="text-[11px] text-[#70685F]">
                Last recorded database modification to your profile attributes.
              </p>
            </div>

            {/* Session Security */}
            <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EDE7DC] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#8F867A] uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#C85A32]" />
                  Security Session
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#70685F] bg-white px-2 py-0.5 rounded-md border border-[#E0D9CB]">
                  <CheckCircle2 className="w-2.5 h-2.5 text-[#137333]" />
                  Secure
                </span>
              </div>
              <div className="text-sm font-bold text-[#231E1B]">Cryptographic HTTP-Only</div>
              <p className="text-[11px] text-[#70685F]">
                Protected with SameSite cookie policy &amp; salted scrypt hashing.
              </p>
            </div>
          </div>
        </div>

        {/* Governance & Policy Advisory */}
        <div className="p-4 rounded-2xl bg-[#F5F1E8] border border-[#E0D9CB] flex items-start gap-3 text-xs text-[#70685F]">
          <Info className="w-5 h-5 text-[#8C3A27] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-[#231E1B]">Enterprise Security &amp; Policy Control</div>
            <p className="leading-relaxed">
              Profile changes are logged and synchronized in real-time across project memberships and workspace directories. Sensitive identity credentials (work email, mobile phone, system role) are governed by executive management policies to preserve institutional audit trails.
            </p>
          </div>
        </div>

        {/* Bottom Floating/Fixed Save Bar when in Edit Mode */}
        {isEditing && (
          <div className="p-4 rounded-2xl bg-white border border-[#E8E2D5] shadow-xs flex items-center justify-between">
            <div className="text-xs text-[#70685F]">
              Unsaved changes will be discarded if you navigate away or click Cancel.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#FAF7F0] text-[#70685F] text-xs font-semibold flex items-center gap-1.5 border border-[#DDD6C8] transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-[#C85A32] hover:bg-[#B34D28] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
