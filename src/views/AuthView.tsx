import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { evaluatePassword } from '../lib/passwordValidation.ts';
import pugLogo from '../assets/pugarch-logo.png';
import {
  Shield,
  Lock,
  UserPlus,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  Phone,
  User as UserIcon,
  ArrowLeft,
  KeyRound,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

type AuthTab = 'signin' | 'signup' | 'forgot';

export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email || '';
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 1) {
    return `${localPart}*****@${domain}`;
  }
  return `${localPart[0]}*****@${domain}`;
};

export const AuthView: React.FC = () => {
  const {
    currentUser,
    directory,
    login,
    sendVerificationCode,
    verifyEmailOtp,
    resendVerificationCode,
    signup,
    forgotPassword,
    resetPassword,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine initial tab from current URL
  const getInitialTab = (): AuthTab => {
    if (location.pathname === '/signup' || location.pathname === '/verify-account') return 'signup';
    if (location.pathname === '/forgot-password' || location.pathname === '/reset-password') return 'forgot';
    return 'signin';
  };

  const [tab, setTab] = useState<AuthTab>(getInitialTab);

  // Common UI State
  const [loading, setLoading] = useState<boolean>(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devNotice, setDevNotice] = useState<string | null>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (type: 'error' | 'success', text: string, duration = 5000) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ type, text });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, duration);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // 1. Sign In State
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [showDirectoryFallback, setShowDirectoryFallback] = useState<boolean>(false);
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<string>('');

  // 2. Sign Up State
  const [signupStep, setSignupStep] = useState<1 | 2 | 3>(() => {
    if (sessionStorage.getItem('ff_email_verified') === 'true') return 3;
    if (location.pathname === '/verify-account') return 2;
    return 1;
  });
  const [signupEmail, setSignupEmail] = useState<string>(
    () => sessionStorage.getItem('ff_signup_email') || ''
  );
  const [signupPhone, setSignupPhone] = useState<string>(
    () => sessionStorage.getItem('ff_signup_phone') || ''
  );
  const [signupName, setSignupName] = useState<string>(
    () => sessionStorage.getItem('ff_signup_name') || ''
  );
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(
    () => sessionStorage.getItem('ff_email_verified') === 'true'
  );
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCountdown, setResendCountdown] = useState<number>(0);
  const [signupCode, setSignupCode] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState<string>('');
  const [showSignupPassword, setShowSignupPassword] = useState<boolean>(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState<boolean>(false);

  // Sync signupCode whenever otpDigits change
  useEffect(() => {
    setSignupCode(otpDigits.join(''));
  }, [otpDigits]);

  // 60-Second Cooldown Timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // 3. Forgot Password State
  const [forgotStep, setForgotStep] = useState<1 | 2>(
    location.pathname === '/reset-password' ? 2 : 1
  );
  const [forgotIdentifier, setForgotIdentifier] = useState<string>('');
  const [forgotCode, setForgotCode] = useState<string>('');
  const [forgotPasswordInput, setForgotPasswordInput] = useState<string>('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState<string>('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState<boolean>(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState<boolean>(false);

  // Dynamic Password Validation States
  const signupPasswordState = useMemo(
    () => evaluatePassword(signupPassword),
    [signupPassword]
  );
  const forgotPasswordState = useMemo(
    () => evaluatePassword(forgotPasswordInput),
    [forgotPasswordInput]
  );

  // Synchronize internal tab state with URL path
  useEffect(() => {
    if (location.pathname === '/signup') {
      setTab('signup');
      if (sessionStorage.getItem('ff_email_verified') === 'true') {
        setSignupStep(3);
      } else {
        setSignupStep(1);
      }
    } else if (location.pathname === '/verify-account') {
      setTab('signup');
      if (sessionStorage.getItem('ff_email_verified') === 'true') {
        setSignupStep(3);
      } else {
        setSignupStep(2);
      }
    } else if (location.pathname === '/forgot-password') {
      setTab('forgot');
      setForgotStep(1);
    } else if (location.pathname === '/reset-password') {
      setTab('forgot');
      setForgotStep(2);
    } else if (location.pathname === '/login') {
      setTab('signin');
    }
  }, [location.pathname]);

  // Target destination after login (preserves deep links)
  const intendedDestination = (location.state as any)?.from?.pathname || '/dashboard';

  // If already authenticated and completed signup, immediately redirect
  if (currentUser && currentUser.isSignupCompleted) {
    return <Navigate to={intendedDestination} replace />;
  }

  const resetAllFeedback = () => {
    setError(null);
    setSuccessMessage(null);
    setDevNotice(null);
  };

  const handleTabChange = (newTab: AuthTab) => {
    setTab(newTab);
    resetAllFeedback();
    setToastMessage(null);
    if (newTab === 'signin') navigate('/login');
    else if (newTab === 'signup') {
      if (sessionStorage.getItem('ff_email_verified') === 'true') {
        setSignupStep(3);
        navigate('/verify-account');
      } else if (sessionStorage.getItem('ff_signup_email')) {
        setSignupStep(2);
        navigate('/verify-account');
      } else {
        setSignupStep(1);
        navigate('/signup');
      }
    } else if (newTab === 'forgot') navigate('/forgot-password');
  };

  // -------------------------------------------------------------
  // SIGN IN HANDLER
  // -------------------------------------------------------------
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    resetAllFeedback();

    const cleanIdentifier = loginIdentifier.trim();
    const cleanPassword = loginPassword.trim();

    if (!cleanIdentifier) {
      const msg = 'Please enter your work email address or mobile phone number.';
      setError(msg);
      showToast('error', msg);
      return;
    }

    if (!cleanPassword) {
      const msg = 'Please enter your password.';
      setError(msg);
      showToast('error', msg);
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const res = await login({
        identifier: cleanIdentifier,
        password: cleanPassword,
      });

      if (!res.success) {
        const errorMsg = res.error || 'Invalid credentials. Password is incorrect. Please check your password.';
        setError(errorMsg);
        showToast('error', errorMsg);
      } else {
        showToast('success', 'Authentication successful. Accessing your workspace...');
        navigate(intendedDestination, { replace: true });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Authentication error. Please try again.';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  // Optional directory quick-picker for developer convenience
  const handleDirectorySignIn = async (userId: string) => {
    if (!userId || submittingRef.current || loading) return;
    resetAllFeedback();
    submittingRef.current = true;
    setLoading(true);

    try {
      // Find user from directory
      const targetUser = directory.find((u) => u.id === userId);
      if (targetUser) {
        setLoginIdentifier(targetUser.email);
        setLoginPassword('PugArch@2026'); // Seed default
      }

      const res = await login({ userId, password: 'PugArch@2026' });
      if (!res.success) {
        const msg = res.error || 'Failed to authenticate selected user.';
        setError(msg);
        showToast('error', msg);
      } else {
        showToast('success', 'Authentication successful. Accessing your workspace...');
        navigate(intendedDestination, { replace: true });
      }
    } catch (err: any) {
      const msg = err.message || 'Authentication failed';
      setError(msg);
      showToast('error', msg);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // SIGN UP & OTP VERIFICATION HANDLERS
  // -------------------------------------------------------------
  const handleSendSignupCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    resetAllFeedback();

    const cleanEmail = signupEmail.trim();
    const cleanPhone = signupPhone.trim();

    if (!cleanEmail || !cleanPhone) {
      const msg = 'Please provide both your pre-registered work email and mobile phone number.';
      setError(msg);
      showToast('error', msg);
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const res = await sendVerificationCode({
        email: cleanEmail,
        phone: cleanPhone,
      });

      if (!res.success) {
        const msg = res.error || 'Verification failed. Pre-registration could not be confirmed.';
        setError(msg);
        showToast('error', msg);
      } else {
        sessionStorage.setItem('ff_signup_email', cleanEmail);
        sessionStorage.setItem('ff_signup_phone', cleanPhone);
        if (signupName.trim()) {
          sessionStorage.setItem('ff_signup_name', signupName.trim());
        }
        sessionStorage.removeItem('ff_email_verified');
        setIsEmailVerified(false);

        setResendCountdown(60);
        setSignupStep(2);
        navigate('/verify-account');

        const successMsg = 'Pre-registration confirmed! A 6-digit identity verification code has been dispatched to your email.';
        setSuccessMessage(successMsg);
        showToast('success', successMsg);

        if (res.devCode) {
          setDevNotice(`Dev Environment Verification Code: ${res.devCode}`);
          const digits = res.devCode.split('').slice(0, 6);
          setOtpDigits(digits);
        } else {
          setOtpDigits(['', '', '', '', '', '']);
        }
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to dispatch verification code.';
      setError(msg);
      showToast('error', msg);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) {
      const updated = [...otpDigits];
      updated[index] = '';
      setOtpDigits(updated);
      return;
    }

    const digit = cleaned[cleaned.length - 1];
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    // Auto-advance to next slot
    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
      otpInputRefs.current[index + 1]?.select();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const updated = [...otpDigits];
        updated[index - 1] = '';
        setOtpDigits(updated);
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      otpInputRefs.current[index - 1]?.focus();
      otpInputRefs.current[index - 1]?.select();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      otpInputRefs.current[index + 1]?.focus();
      otpInputRefs.current[index + 1]?.select();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || '';
    }
    setOtpDigits(updated);

    const focusIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[focusIdx]?.focus();
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    resetAllFeedback();

    const code = otpDigits.join('').trim();
    if (code.length < 6) {
      const msg = 'Please enter the complete 6-digit verification code.';
      setError(msg);
      showToast('error', msg);
      return;
    }

    if (!signupEmail) {
      const msg = 'Email address not found. Please re-enter your pre-registered details.';
      setError(msg);
      showToast('error', msg);
      setSignupStep(1);
      navigate('/signup');
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const res = await verifyEmailOtp({
        email: signupEmail.trim(),
        phone: signupPhone.trim() || undefined,
        code,
      });

      if (!res.success) {
        const msg = res.error || 'Verification failed. Please check the code.';
        setError(msg);
        showToast('error', msg);
      } else {
        setIsEmailVerified(true);
        sessionStorage.setItem('ff_email_verified', 'true');
        const successMsg = res.message || 'Email verified successfully!';
        setSuccessMessage(successMsg);
        showToast('success', successMsg);
        setSignupStep(3);
      }
    } catch (err: any) {
      const msg = err.message || 'Verification failed. Please try again.';
      setError(msg);
      showToast('error', msg);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleResendSignupCode = async () => {
    if (resendCountdown > 0 || submittingRef.current || loading) return;
    resetAllFeedback();

    if (!signupEmail) {
      const msg = 'Email address is missing. Please enter your pre-registration details.';
      setError(msg);
      showToast('error', msg);
      setSignupStep(1);
      navigate('/signup');
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const res = await resendVerificationCode({
        email: signupEmail.trim(),
        phone: signupPhone.trim() || undefined,
      });

      if (!res.success) {
        const msg = res.error || 'Failed to resend verification code.';
        setError(msg);
        showToast('error', msg);
        if (res.remainingSeconds) {
          setResendCountdown(res.remainingSeconds);
        }
      } else {
        setResendCountdown(60);
        setOtpDigits(['', '', '', '', '', '']);
        const successMsg = res.message || 'A new 6-digit verification code has been dispatched to your email.';
        setSuccessMessage(successMsg);
        showToast('success', successMsg);
        if (res.devCode) {
          setDevNotice(`Dev Environment Verification Code: ${res.devCode}`);
          const digits = res.devCode.split('').slice(0, 6);
          setOtpDigits(digits);
        }
        otpInputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to resend verification code.';
      setError(msg);
      showToast('error', msg);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    resetAllFeedback();

    if (!signupEmail || !signupPhone) {
      const msg = 'Pre-registered credentials are missing. Please return to Step 1.';
      setError(msg);
      showToast('error', msg);
      setSignupStep(1);
      navigate('/signup');
      return;
    }

    if (!signupPasswordState.allSatisfied) {
      const firstUnsatisfied = signupPasswordState.rules.find((r) => !r.satisfied);
      const msg = firstUnsatisfied
        ? `Password requirement not met: ${firstUnsatisfied.label}.`
        : 'Password does not meet all security requirements.';
      setError(msg);
      showToast('error', msg);
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      const msg = 'Passwords do not match. Please ensure both fields are identical.';
      setError(msg);
      showToast('error', msg);
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const res = await signup({
        email: signupEmail.trim(),
        phone: signupPhone.trim(),
        name: signupName.trim() || undefined,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
        code: otpDigits.join('').trim() || undefined,
      });

      if (!res.success) {
        const msg = res.error || 'Registration failed.';
        setError(msg);
        showToast('error', msg);
      } else {
        sessionStorage.removeItem('ff_signup_email');
        sessionStorage.removeItem('ff_signup_phone');
        sessionStorage.removeItem('ff_signup_name');
        sessionStorage.removeItem('ff_email_verified');

        const successMsg = 'Account created and verified successfully! Accessing your workspace...';
        setSuccessMessage(successMsg);
        showToast('success', successMsg);
        setTimeout(() => {
          navigate(intendedDestination, { replace: true });
        }, 1000);
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to complete registration.';
      setError(msg);
      showToast('error', msg);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // FORGOT PASSWORD HANDLERS
  // -------------------------------------------------------------
  const handleRequestRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    resetAllFeedback();

    const cleanId = forgotIdentifier.trim();
    if (!cleanId) {
      const msg = 'Please enter your registered email address or mobile phone number.';
      setError(msg);
      showToast('error', msg);
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const res = await forgotPassword({ identifier: cleanId });
      if (!res.success) {
        const msg = res.error || 'Failed to request recovery code.';
        setError(msg);
        showToast('error', msg);
      } else {
        setForgotStep(2);
        navigate('/reset-password');
        const successMsg = res.message || 'If an account matches your details, a 6-digit recovery code has been sent.';
        setSuccessMessage(successMsg);
        showToast('success', successMsg);
        if (res.devCode) {
          setDevNotice(`Dev Environment Recovery Code: ${res.devCode}`);
          setForgotCode(res.devCode);
        }
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to send recovery code.';
      setError(msg);
      showToast('error', msg);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleCompletePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    resetAllFeedback();

    const cleanCode = forgotCode.trim();

    if (!cleanCode) {
      const msg = 'Please enter your 6-digit recovery code.';
      setError(msg);
      showToast('error', msg);
      return;
    }

    if (!forgotPasswordState.allSatisfied) {
      const firstUnsatisfied = forgotPasswordState.rules.find((r) => !r.satisfied);
      const msg = firstUnsatisfied
        ? `Password requirement not met: ${firstUnsatisfied.label}.`
        : 'New password does not meet all security requirements.';
      setError(msg);
      showToast('error', msg);
      return;
    }

    if (forgotPasswordInput !== forgotConfirmPassword) {
      const msg = 'Passwords do not match. Please ensure both fields are identical.';
      setError(msg);
      showToast('error', msg);
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const res = await resetPassword({
        identifier: forgotIdentifier.trim(),
        code: cleanCode,
        newPassword: forgotPasswordInput,
        confirmPassword: forgotConfirmPassword,
      });

      if (!res.success) {
        const msg = res.error || 'Password reset failed. Invalid or expired recovery code.';
        setError(msg);
        showToast('error', msg);
      } else {
        const successMsg = 'Password reset successfully! You can now sign in with your new password.';
        setSuccessMessage(successMsg);
        showToast('success', successMsg);
        // Auto-fill signin identifier & switch to sign in tab
        setLoginIdentifier(forgotIdentifier.trim());
        setLoginPassword(forgotPasswordInput);
        setTimeout(() => {
          navigate('/login');
          setTab('signin');
          setForgotStep(1);
          setForgotCode('');
          setForgotPasswordInput('');
          setForgotConfirmPassword('');
        }, 1500);
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to reset password.';
      setError(msg);
      showToast('error', msg);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F4] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-[#F3CEC1] selection:text-[#A63C1E] relative">
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          id="auth-toast-notification"
          role="alert"
          aria-live="assertive"
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-xl border max-w-sm sm:max-w-md animate-in slide-in-from-top-3 flex items-center justify-between gap-3 text-xs backdrop-blur-md transition-all duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-[#FEE2E2]/95 text-[#991B1B] border-[#FECACA] shadow-[0_10px_25px_-5px_rgba(220,38,38,0.25)]'
              : 'bg-[#EBF2EB]/95 text-[#2D5A34] border-[#C4D9C5] shadow-[0_10px_25px_-5px_rgba(45,90,52,0.25)]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
            )}
            <span className="font-semibold leading-relaxed">{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 opacity-70 hover:opacity-100 transition-colors cursor-pointer"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2 mb-6">
        <div className="flex justify-center mb-1">
          <img
            src={pugLogo}
            alt="PugArch Logo"
            className="h-16 sm:h-20 w-auto object-contain transition-transform duration-300 hover:scale-105"
            style={{ mixBlendMode: 'multiply' }}
          />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#231E1B]">
          PugArch &mdash; Projects
        </h1>
        <p className="text-xs sm:text-sm text-[#70685F] max-w-xs mx-auto">
          Mobile-First Project Operations &amp; Execution System
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 sm:px-9 rounded-3xl border border-[#E8E2D5] shadow-[0_10px_35px_-4px_rgba(35,30,27,0.08)] space-y-5 transition-all">
          {/* Top Pill Tab Selector (Sign In vs Create Account) */}
          {tab !== 'forgot' ? (
            location.pathname === '/verify-account' ? (
              <div className="flex items-center justify-between pb-2 border-b border-[#F0ECE1]">
                <button
                  type="button"
                  onClick={() => {
                    setSignupStep(1);
                    navigate('/signup');
                    resetAllFeedback();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#70685F] hover:text-[#231E1B] cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Registration
                </button>
                <span className="text-xs font-semibold text-[#A63C1E] flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  Email Verification
                </span>
              </div>
            ) : (
              <div className="flex rounded-2xl bg-[#F5F1E8] p-1 border border-[#E0D9CB]">
                <button
                  id="tab-signin-btn"
                  type="button"
                  onClick={() => handleTabChange('signin')}
                  className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                    tab === 'signin'
                      ? 'bg-white text-[#231E1B] shadow-xs'
                      : 'text-[#70685F] hover:text-[#231E1B]'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </button>
                <button
                  id="tab-signup-btn"
                  type="button"
                  onClick={() => handleTabChange('signup')}
                  className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                    tab === 'signup'
                      ? 'bg-white text-[#231E1B] shadow-xs'
                      : 'text-[#70685F] hover:text-[#231E1B]'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Create Account
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center justify-between pb-2 border-b border-[#F0ECE1]">
              <button
                type="button"
                onClick={() => handleTabChange('signin')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#70685F] hover:text-[#231E1B] cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
              <span className="text-xs font-semibold text-[#A63C1E] flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" />
                Password Recovery
              </span>
            </div>
          )}

          {/* Feedback & Alert Banners */}
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-xs text-[#991B1B] flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-[#E6F4EA] border border-[#C6DEC7] text-xs text-[#137333] flex items-start gap-2.5 animate-fadeIn"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#16A34A]" />
              <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
            </div>
          )}

          {devNotice && (
            <div className="p-3 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-xs text-[#92400E] flex items-center gap-2">
              <KeyRound className="w-4 h-4 shrink-0 text-[#D97706]" />
              <span className="font-mono text-[11px] font-semibold">{devNotice}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 1: SIGN IN VIEW                                            */}
          {/* ============================================================== */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="signin-identifier-input"
                    className="block text-xs font-semibold text-[#231E1B]"
                  >
                    Email Address or Mobile Number
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F867A]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="signin-identifier-input"
                    name="identifier"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="e.g. eleanor.foley@fernandfoley.internal or +442079460991"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] placeholder-[#A49C90] focus:outline-hidden focus:ring-2 focus:ring-[#C85A32]/25 focus:border-[#C85A32] min-h-[44px] transition-all"
                  />
                </div>
                <p className="mt-1 text-[11px] text-[#8F867A]">
                  Accepts your registered corporate email or phone number.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="signin-password-input"
                    className="block text-xs font-semibold text-[#231E1B]"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => handleTabChange('forgot')}
                    className="text-[11px] font-medium text-[#C85A32] hover:text-[#A63C1E] cursor-pointer hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F867A]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="signin-password-input"
                    name="password"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your account password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] placeholder-[#A49C90] focus:outline-hidden focus:ring-2 focus:ring-[#C85A32]/25 focus:border-[#C85A32] min-h-[44px] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8F867A] hover:text-[#231E1B] cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="signin-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#C85A32] hover:bg-[#A63C1E] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer min-h-[44px] disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Workspace</span>
                  </>
                )}
              </button>

              {/* Developer / Testing Account Directory Helper (Retained non-obtrusively) */}
              {/* <div className="pt-2 border-t border-[#F2ECE0]">
                <button
                  type="button"
                  onClick={() => setShowDirectoryFallback(!showDirectoryFallback)}
                  className="w-full text-left flex items-center justify-between text-[11px] text-[#8F867A] hover:text-[#231E1B] cursor-pointer py-1"
                >
                  <span>Quick Test Directory (Demo / Seed Accounts)</span>
                  {showDirectoryFallback ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showDirectoryFallback && (
                  <div className="mt-2 p-3 bg-[#FAF7F0] rounded-xl border border-[#EDE7DC] space-y-2">
                    <p className="text-[10px] text-[#7A7165]">
                      Select an account to auto-fill its credentials or instantly log in:
                    </p>
                    <select
                      id="dev-directory-select"
                      value={selectedDirectoryId}
                      onChange={(e) => {
                        setSelectedDirectoryId(e.target.value);
                        handleDirectorySignIn(e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-[#DDD6C8] bg-white text-[11px] text-[#231E1B] focus:outline-hidden focus:border-[#C85A32]"
                    >
                      <option value="">-- Choose active directory member --</option>
                      {directory.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role}) — {u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div> */}
            </form>
          )}

          {/* ============================================================== */}
          {/* TAB 2: SIGN UP VIEW (HR/CEO PRE-REGISTRATION REQUIRED)         */}
          {/* ============================================================== */}
          {tab === 'signup' && (
            <div className="space-y-4">
              {/* HR/CEO Pre-Registration Callout Banner */}
              <div className="text-[11px] text-[#7A7165] bg-[#FAF7F0] p-3 rounded-2xl border border-[#EDE7DC] space-y-1">
                <div className="font-semibold text-[#231E1B] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#C85A32]" />
                  HR/CEO Pre-Registration Required
                </div>
                <p className="text-[11px] text-[#7A7165] leading-relaxed">
                  Only accounts pre-registered by HR or CEO can complete activation. Roles and project privileges are assigned by leadership.
                </p>
              </div>

              {/* STEP 1: Verify Pre-Registration */}
              {signupStep === 1 ? (
                <form onSubmit={handleSendSignupCode} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="signup-email-input"
                      className="block text-xs font-semibold text-[#231E1B] mb-1"
                    >
                      Pre-Registered Work Email <span className="text-[#C85A32]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F867A]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="signup-email-input"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="e.g. candidate@fernandfoley.internal"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] placeholder-[#A49C90] focus:outline-hidden focus:ring-2 focus:ring-[#C85A32]/25 focus:border-[#C85A32] min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-phone-input"
                      className="block text-xs font-semibold text-[#231E1B] mb-1"
                    >
                      Pre-Registered Mobile Number <span className="text-[#C85A32]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F867A]">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        id="signup-phone-input"
                        name="phone"
                        type="tel"
                        required
                        autoComplete="tel"
                        placeholder="e.g. +44 20 7946 0992 or 02079460992"
                        value={signupPhone}
                        onChange={(e) => setSignupPhone(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] placeholder-[#A49C90] focus:outline-hidden focus:ring-2 focus:ring-[#C85A32]/25 focus:border-[#C85A32] min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-name-input"
                      className="block text-xs font-semibold text-[#231E1B] mb-1"
                    >
                      Full Name (Optional Confirmation)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F867A]">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        id="signup-name-input"
                        name="name"
                        type="text"
                        autoComplete="name"
                        placeholder="e.g. Marcus Vance"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] placeholder-[#A49C90] focus:outline-hidden focus:ring-2 focus:ring-[#C85A32]/25 focus:border-[#C85A32] min-h-[44px]"
                      />
                    </div>
                  </div>

                  <button
                    id="signup-verify-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#526E55] hover:bg-[#3E5540] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer min-h-[44px] disabled:opacity-50 mt-1"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Pre-Registration...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        <span>Verify Details &amp; Send Verification Code</span>
                      </>
                    )}
                  </button>
                </form>
              ) : signupStep === 2 ? (
                /* STEP 2: Email OTP Verification */
                <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                  {/* Masked Email Address Card */}
                  <div className="p-3.5 bg-[#FAF7F0] rounded-2xl border border-[#EDE7DC] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#F0ECE1] flex items-center justify-center text-[#C85A32] shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[11px] text-[#70685F] font-medium">Verification Code Sent To</div>
                        <div className="font-mono font-semibold text-[#231E1B] text-xs tracking-wide">
                          {maskEmail(signupEmail) || 'Registered Work Email'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSignupStep(1);
                        navigate('/signup');
                        resetAllFeedback();
                      }}
                      className="text-[11px] font-semibold text-[#C85A32] hover:text-[#A63C1E] hover:underline cursor-pointer px-2 py-1"
                    >
                      Change
                    </button>
                  </div>

                  {!signupEmail ? (
                    <div className="text-center py-4 space-y-3">
                      <p className="text-xs text-[#70685F]">
                        No pre-registered email detected. Please start by entering your pre-registered work credentials.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSignupStep(1);
                          navigate('/signup');
                        }}
                        className="py-2.5 px-4 rounded-xl bg-[#C85A32] hover:bg-[#A63C1E] text-white text-xs font-semibold shadow-xs transition-colors"
                      >
                        Enter Pre-Registration Details
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Six-Digit OTP Input Grid */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-semibold text-[#231E1B]">
                            Enter 6-Digit Code <span className="text-[#C85A32]">*</span>
                          </label>
                          {resendCountdown > 0 ? (
                            <span className="text-[11px] font-medium text-[#70685F]">
                              Resend in <span className="font-mono font-semibold">{resendCountdown}s</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResendSignupCode}
                              disabled={loading}
                              className="text-[11px] font-semibold text-[#C85A32] hover:text-[#A63C1E] hover:underline cursor-pointer disabled:opacity-50"
                            >
                              Resend Code
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                          {otpDigits.map((digit, idx) => (
                            <input
                              key={idx}
                              ref={(el) => {
                                otpInputRefs.current[idx] = el;
                              }}
                              id={`signup-otp-input-${idx}`}
                              name={`otp-${idx}`}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                              onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                              onPaste={handleOtpPaste}
                              disabled={loading}
                              autoFocus={idx === 0}
                              className={`w-11 h-12 sm:w-12 sm:h-13 text-center font-mono text-lg font-bold rounded-xl border ${
                                digit ? 'border-[#C85A32] bg-[#FAF7F0]' : 'border-[#DDD6C8] bg-white'
                              } text-[#231E1B] placeholder-[#A49C90] focus:outline-hidden focus:ring-2 focus:ring-[#C85A32]/25 focus:border-[#C85A32] transition-all shadow-2xs`}
                            />
                          ))}
                        </div>
                        <p className="mt-1.5 text-[11px] text-[#70685F]">
                          Paste or enter the 6-digit verification code received in your registered corporate email.
                        </p>
                      </div>

                      {/* Verify Email Submit Button */}
                      <button
                        id="verify-email-btn"
                        type="submit"
                        disabled={loading || otpDigits.join('').trim().length < 6}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#C85A32] hover:bg-[#A63C1E] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer min-h-[44px] disabled:opacity-50 mt-1"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Verifying Code...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Verify Email</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </form>
              ) : (
                /* STEP 3: Create Password & Complete Registration */
                <form onSubmit={handleCompleteSignup} className="space-y-3.5">
                  {/* Verified Status Confirmation Card */}
                  <div className="p-3 bg-[#ECFDF5] rounded-xl border border-[#A7F3D0] flex items-center justify-between text-xs text-[#065F46]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                      <div>
                        <div className="font-semibold text-[#065F46]">Email Verified</div>
                        <div className="font-mono text-[11px] text-[#047857]">{maskEmail(signupEmail)}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-[#D1FAE5] text-[#065F46] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                      Verified
                    </span>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-password-input"
                      className="block text-xs font-semibold text-[#231E1B] mb-1"
                    >
                      Create Password <span className="text-[#C85A32]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F867A]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="signup-password-input"
                        name="password"
                        type={showSignupPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        placeholder="At least 12 characters"
                        value={signupPassword}
                        onChange={(e) => {
                          setSignupPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] placeholder-[#A49C90] focus:outline-hidden focus:ring-2 focus:ring-[#C85A32]/25 focus:border-[#C85A32] min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8F867A] hover:text-[#231E1B] cursor-pointer"
                      >
                        {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {signupPassword.length > 0 && (
                      <div className="mt-2.5 space-y-1.5" id="signup-password-strength-container">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#70685F] font-medium">Password Strength</span>
                          <span
                            id="signup-password-strength-label"
                            className={`font-semibold ${
                              signupPasswordState.strength === 'strong'
                                ? 'text-[#16A34A]'
                                : signupPasswordState.strength === 'fair'
                                ? 'text-[#D97706]'
                                : 'text-[#DC2626]'
                            }`}
                          >
                            {signupPasswordState.strengthLabel}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full">
                          {[1, 2, 3].map((bar) => (
                            <div
                              key={bar}
                              className={`h-full rounded-full transition-all duration-300 ${
                                bar <= signupPasswordState.strengthBars
                                  ? signupPasswordState.strengthColor
                                  : 'bg-[#EDE7DC]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Password Requirements Indicator Checklist */}
                    <div
                      id="signup-password-requirements-list"
                      className="mt-3 p-3 bg-[#FAF7F0] rounded-xl border border-[#EDE7DC] space-y-2"
                    >
                      <div className="text-[11px] font-semibold text-[#70685F] uppercase tracking-wider">
                        Password Requirements
                      </div>
                      <ul className="space-y-1.5 text-xs">
                        {signupPasswordState.rules.map((rule) => (
                          <li
                            key={rule.id}
                            id={`signup-rule-${rule.id}`}
                            className={`flex items-center gap-2 transition-colors ${
                              rule.satisfied ? 'text-[#16A34A] font-medium' : 'text-[#70685F]'
                            }`}
                          >
                            {rule.satisfied ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-[#C2B7A5] shrink-0 flex items-center justify-center">
                                <div className="w-1 h-1 rounded-full bg-[#A49C90]" />
                              </div>
                            )}
                            <span>{rule.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-confirm-password-input"
                      className="block text-xs font-semibold text-[#231E1B] mb-1"
                    >
                      Confirm Password <span className="text-[#C85A32]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F867A]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="signup-confirm-password-input"
                        name="confirmPassword"
                        type={showSignupConfirmPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        placeholder="Re-enter password"
                        value={signupConfirmPassword}
                        onChange={(e) => {
                          setSignupConfirmPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] placeholder-[#A49C90] focus:outline-hidden focus:ring-2 focus:ring-[#C85A32]/25 focus:border-[#C85A32] min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                        aria-label={showSignupConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8F867A] hover:text-[#231E1B] cursor-pointer"
                      >
                        {showSignupConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {signupConfirmPassword.length > 0 && (
                      <div
                        id="signup-confirm-feedback"
                        className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${
                          signupPassword === signupConfirmPassword ? 'text-[#16A34A]' : 'text-[#DC2626]'
                        }`}
                      >
                        {signupPassword === signupConfirmPassword ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                            <span>Passwords match</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                            <span>Passwords do not match</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    id="signup-complete-btn"
                    type="submit"
                    disabled={
                      loading ||
                      !signupPasswordState.allSatisfied ||
                      !signupConfirmPassword ||
                      signupPassword !== signupConfirmPassword
                    }
                    className="w-full py-2.5 px-4 rounded-xl bg-[#C85A32] hover:bg-[#A63C1E] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer min-h-[44px] disabled:opacity-50 mt-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create Account &amp; Sign In</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: FORGOT PASSWORD / PASSWORD RECOVERY                     */}
          {/* ============================================================== */}
          {tab === 'forgot' && (
            <div className="space-y-4">
              <div className="text-center pb-1">
                <h2 className="text-base font-semibold text-[#231E1B]">Password Recovery</h2>
                <p className="text-xs text-[#70685F] mt-1">
                  Enter your registered work email or phone number to reset your password.
                </p>
              </div>

              {forgotStep === 1 ? (
                <form onSubmit={handleRequestRecoveryCode} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="forgot-identifier-input"
                      className="block text-xs font-semibold text-[#231E1B] mb-1"
                    >
                      Work Email Address or Mobile Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F867A]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="forgot-identifier-input"
                        name="identifier"
                        type="text"
                        required
                        placeholder="e.g. name@fernandfoley.internal or +442079460991"
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] placeholder-[#A49C90] focus:outline-hidden focus:ring-2 focus:ring-[#C85A32]/25 focus:border-[#C85A32] min-h-[44px]"
                      />
                    </div>
                  </div>

                  <button
                    id="forgot-send-code-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#C85A32] hover:bg-[#A63C1E] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer min-h-[44px] disabled:opacity-50 mt-1"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending Recovery Code...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Send 6-Digit Recovery Code</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCompletePasswordReset} className="space-y-3.5">
                  <div className="p-3 bg-[#F5F1E8] rounded-xl border border-[#E0D9CB] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[11px] text-[#70685F]">Target Account:</span>
                      <div className="font-semibold text-[#231E1B]">{forgotIdentifier}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep(1);
                        resetAllFeedback();
                      }}
                      className="text-[11px] font-semibold text-[#C85A32] hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  <div>
                    <label
                      htmlFor="forgot-code-input"
                      className="block text-xs font-semibold text-[#231E1B] mb-1"
                    >
                      6-Digit Recovery Code <span className="text-[#C85A32]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F867A]">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        id="forgot-code-input"
                        name="code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        placeholder="123456"
                        value={forgotCode}
                        onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs font-mono font-bold tracking-widest text-[#231E1B] placeholder-[#A49C90] focus:outline-hidden focus:ring-2 focus:ring-[#C85A32]/25 focus:border-[#C85A32] min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="forgot-new-password-input"
                      className="block text-xs font-semibold text-[#231E1B] mb-1"
                    >
                      New Password <span className="text-[#C85A32]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F867A]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="forgot-new-password-input"
                        name="newPassword"
                        type={showForgotNewPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        placeholder="At least 12 characters"
                        value={forgotPasswordInput}
                        onChange={(e) => {
                          setForgotPasswordInput(e.target.value);
                          if (error) setError(null);
                        }}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] placeholder-[#A49C90] focus:outline-hidden focus:ring-2 focus:ring-[#C85A32]/25 focus:border-[#C85A32] min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        aria-label={showForgotNewPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8F867A] hover:text-[#231E1B] cursor-pointer"
                      >
                        {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {forgotPasswordInput.length > 0 && (
                      <div className="mt-2.5 space-y-1.5" id="forgot-password-strength-container">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#70685F] font-medium">Password Strength</span>
                          <span
                            id="forgot-password-strength-label"
                            className={`font-semibold ${
                              forgotPasswordState.strength === 'strong'
                                ? 'text-[#16A34A]'
                                : forgotPasswordState.strength === 'fair'
                                ? 'text-[#D97706]'
                                : 'text-[#DC2626]'
                            }`}
                          >
                            {forgotPasswordState.strengthLabel}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full">
                          {[1, 2, 3].map((bar) => (
                            <div
                              key={bar}
                              className={`h-full rounded-full transition-all duration-300 ${
                                bar <= forgotPasswordState.strengthBars
                                  ? forgotPasswordState.strengthColor
                                  : 'bg-[#EDE7DC]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Password Requirements Indicator Checklist */}
                    <div
                      id="forgot-password-requirements-list"
                      className="mt-3 p-3 bg-[#FAF7F0] rounded-xl border border-[#EDE7DC] space-y-2"
                    >
                      <div className="text-[11px] font-semibold text-[#70685F] uppercase tracking-wider">
                        Password Requirements
                      </div>
                      <ul className="space-y-1.5 text-xs">
                        {forgotPasswordState.rules.map((rule) => (
                          <li
                            key={rule.id}
                            id={`forgot-rule-${rule.id}`}
                            className={`flex items-center gap-2 transition-colors ${
                              rule.satisfied ? 'text-[#16A34A] font-medium' : 'text-[#70685F]'
                            }`}
                          >
                            {rule.satisfied ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-[#C2B7A5] shrink-0 flex items-center justify-center">
                                <div className="w-1 h-1 rounded-full bg-[#A49C90]" />
                              </div>
                            )}
                            <span>{rule.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="forgot-confirm-password-input"
                      className="block text-xs font-semibold text-[#231E1B] mb-1"
                    >
                      Confirm New Password <span className="text-[#C85A32]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F867A]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="forgot-confirm-password-input"
                        name="confirmNewPassword"
                        type={showForgotConfirmPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        placeholder="Re-enter new password"
                        value={forgotConfirmPassword}
                        onChange={(e) => {
                          setForgotConfirmPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#DDD6C8] bg-white text-xs text-[#231E1B] placeholder-[#A49C90] focus:outline-hidden focus:ring-2 focus:ring-[#C85A32]/25 focus:border-[#C85A32] min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                        aria-label={showForgotConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8F867A] hover:text-[#231E1B] cursor-pointer"
                      >
                        {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {forgotConfirmPassword.length > 0 && (
                      <div
                        id="forgot-confirm-feedback"
                        className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${
                          forgotPasswordInput === forgotConfirmPassword ? 'text-[#16A34A]' : 'text-[#DC2626]'
                        }`}
                      >
                        {forgotPasswordInput === forgotConfirmPassword ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                            <span>Passwords match</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                            <span>Passwords do not match</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    id="forgot-complete-btn"
                    type="submit"
                    disabled={
                      loading ||
                      !forgotPasswordState.allSatisfied ||
                      !forgotConfirmPassword ||
                      forgotPasswordInput !== forgotConfirmPassword
                    }
                    className="w-full py-2.5 px-4 rounded-xl bg-[#C85A32] hover:bg-[#A63C1E] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer min-h-[44px] disabled:opacity-50 mt-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Resetting Password...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Update Password &amp; Proceed</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Secure System Footer Notice */}
          <div className="pt-2 text-center text-[10px] text-[#A49C90] flex items-center justify-center gap-1.5">
            <Shield className="w-3 h-3 text-[#A49C90]" />
            <span>End-to-End Enterprise Access Control &bull; PugArch Cloud</span>
          </div>
        </div>
      </div>
    </div>
  );
};
