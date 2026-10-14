import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types.ts';
import { apiFetch } from '../lib/api.ts';
import { getSocket } from '../lib/socket.ts';

interface AuthContextType {
  currentUser: User | null;
  directory: User[];
  isLoading: boolean;
  isInitialLoading: boolean;
  login: (credentials: {
    identifier?: string;
    email?: string;
    phone?: string;
    userId?: string;
    password?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  sendVerificationCode: (data: { email: string; phone: string }) => Promise<{ success: boolean; error?: string; devCode?: string; message?: string }>;
  verifyEmailOtp: (data: { email: string; phone?: string; code: string }) => Promise<{ success: boolean; error?: string; message?: string; isEmailVerified?: boolean; remainingAttempts?: number }>;
  resendVerificationCode: (data: { email: string; phone?: string }) => Promise<{ success: boolean; error?: string; devCode?: string; message?: string; remainingSeconds?: number }>;
  signup: (data: { email: string; phone: string; password: string; confirmPassword?: string; code?: string; name?: string }) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (data: { identifier: string }) => Promise<{ success: boolean; error?: string; devCode?: string; message?: string }>;
  resetPassword: (data: { identifier: string; code: string; newPassword: string; confirmPassword?: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
  preRegisterUser: (data: { name: string; email: string; phone: string; department?: string; role?: string }) => Promise<{ success: boolean; error?: string; user?: User }>;
  updateProfile: (data: { name: string; email?: string; phone?: string; department?: string }) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  isCEO: boolean;
  isCTO: boolean;
  isProjectOwner: boolean;
  isEmployee: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [directory, setDirectory] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.currentUser);
        setDirectory(data.directory || []);
        if (data.currentUser?.id) {
          getSocket(data.currentUser.id);
        }
      }
    } catch (err) {
      console.error('Failed to load auth session:', err);
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (credentials: {
    identifier?: string;
    email?: string;
    phone?: string;
    userId?: string;
    password?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Authentication failed' };
      }
      setCurrentUser(data.user);
      if (data.user?.id) {
        getSocket(data.user.id);
      }
      await fetchSession();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const sendVerificationCode = async (data: {
    email: string;
    phone: string;
  }): Promise<{ success: boolean; error?: string; devCode?: string; message?: string }> => {
    try {
      const res = await apiFetch('/api/auth/register/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Failed to send verification code' };
      }
      return { success: true, devCode: resData.devCode, message: resData.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while sending verification code' };
    }
  };

  const verifyEmailOtp = async (data: {
    email: string;
    phone?: string;
    code: string;
  }): Promise<{
    success: boolean;
    error?: string;
    message?: string;
    isEmailVerified?: boolean;
    remainingAttempts?: number;
  }> => {
    try {
      const res = await apiFetch('/api/auth/register/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: resData.error || 'Failed to verify verification code',
          remainingAttempts: resData.remainingAttempts,
        };
      }
      return {
        success: true,
        message: resData.message,
        isEmailVerified: resData.isEmailVerified,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while verifying code' };
    }
  };

  const resendVerificationCode = async (data: {
    email: string;
    phone?: string;
  }): Promise<{
    success: boolean;
    error?: string;
    devCode?: string;
    message?: string;
    remainingSeconds?: number;
  }> => {
    try {
      const res = await apiFetch('/api/auth/register/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: resData.error || 'Failed to resend verification code',
          remainingSeconds: resData.remainingSeconds,
        };
      }
      return {
        success: true,
        devCode: resData.devCode,
        message: resData.message,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while resending code' };
    }
  };

  const signup = async (data: {
    email: string;
    phone: string;
    password: string;
    confirmPassword?: string;
    code?: string;
    name?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Account creation failed' };
      }
      setCurrentUser(resData.user);
      await fetchSession();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Signup failed' };
    }
  };

  const forgotPassword = async (data: {
    identifier: string;
  }): Promise<{ success: boolean; error?: string; devCode?: string; message?: string }> => {
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Password recovery request failed' };
      }
      return { success: true, devCode: resData.devCode, message: resData.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const resetPassword = async (data: {
    identifier: string;
    code: string;
    newPassword: string;
    confirmPassword?: string;
  }): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Password reset failed' };
      }
      return { success: true, message: resData.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const preRegisterUser = async (data: {
    name: string;
    email: string;
    phone: string;
    department?: string;
    role?: string;
  }): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      const res = await apiFetch('/api/users/pre-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Failed to pre-register user' };
      }
      return { success: true, user: resData.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Pre-registration failed' };
    }
  };

  const updateProfile = async (data: {
    name: string;
    email?: string;
    phone?: string;
    department?: string;
  }): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      setIsLoading(true);
      const res = await apiFetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Failed to update profile' };
      }
      if (resData.user) {
        setCurrentUser(resData.user);
      }
      // Re-fetch session so directory, top navigation and socket are kept in sync
      await fetchSession();
      return { success: true, user: resData.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error updating profile' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await apiFetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      await fetchSession();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const switchUser = async (userId: string) => {
    await login({ userId });
  };

  const refreshUser = async () => {
    await fetchSession();
  };

  const isCEO = currentUser?.role === 'CEO';
  const isCTO = currentUser?.role === 'CTO' || isCEO;
  const isProjectOwner = isCTO;
  const isEmployee = currentUser?.role === 'Employee';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        directory,
        isLoading,
        isInitialLoading,
        login,
        sendVerificationCode,
        verifyEmailOtp,
        resendVerificationCode,
        signup,
        forgotPassword,
        resetPassword,
        preRegisterUser,
        updateProfile,
        logout,
        switchUser,
        refreshUser,
        isCEO,
        isCTO,
        isProjectOwner,
        isEmployee,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
