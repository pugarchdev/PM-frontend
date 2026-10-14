export interface PasswordRule {
  id: 'length' | 'uppercase' | 'lowercase' | 'number' | 'special';
  label: string;
  satisfied: boolean;
}

export type PasswordStrength = 'empty' | 'weak' | 'fair' | 'strong';

export interface PasswordValidationState {
  rules: PasswordRule[];
  allSatisfied: boolean;
  satisfiedCount: number;
  strength: PasswordStrength;
  strengthLabel: string;
  strengthColor: string;
  strengthBars: number; // 0, 1, 2, or 3
}

/**
 * Evaluates password against the 5 security requirements:
 * 1. Minimum 12 characters
 * 2. At least one uppercase letter (A-Z)
 * 3. At least one lowercase letter (a-z)
 * 4. At least one number (0-9)
 * 5. At least one special character (!@#$%^&*()_+-= etc.)
 */
export function evaluatePassword(password: string): PasswordValidationState {
  const p = typeof password === 'string' ? password : '';

  const hasMinLength = p.length >= 12 && p.toLowerCase() !== 'password123!';
  const hasUppercase = /[A-Z]/.test(p);
  const hasLowercase = /[a-z]/.test(p);
  const hasNumber = /\d/.test(p);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(p);

  const rules: PasswordRule[] = [
    { id: 'length', label: 'At least 12 characters', satisfied: hasMinLength },
    { id: 'uppercase', label: 'One uppercase letter (A-Z)', satisfied: hasUppercase },
    { id: 'lowercase', label: 'One lowercase letter (a-z)', satisfied: hasLowercase },
    { id: 'number', label: 'One number (0-9)', satisfied: hasNumber },
    { id: 'special', label: 'One special character (!@#$%^&*...)', satisfied: hasSpecialChar },
  ];

  const satisfiedCount = rules.filter((r) => r.satisfied).length;
  const allSatisfied = satisfiedCount === 5;

  let strength: PasswordStrength = 'empty';
  let strengthLabel = '';
  let strengthColor = 'bg-[#DDD6C8]';
  let strengthBars = 0;

  if (p.length === 0) {
    strength = 'empty';
    strengthLabel = '';
    strengthColor = 'bg-[#DDD6C8]';
    strengthBars = 0;
  } else if (allSatisfied) {
    // Only marked strong if EVERY required condition is satisfied
    strength = 'strong';
    strengthLabel = 'Strong';
    strengthColor = 'bg-[#16A34A]';
    strengthBars = 3;
  } else if (satisfiedCount >= 3) {
    strength = 'fair';
    strengthLabel = 'Fair';
    strengthColor = 'bg-[#D97706]';
    strengthBars = 2;
  } else {
    strength = 'weak';
    strengthLabel = 'Weak';
    strengthColor = 'bg-[#DC2626]';
    strengthBars = 1;
  }

  return {
    rules,
    allSatisfied,
    satisfiedCount,
    strength,
    strengthLabel,
    strengthColor,
    strengthBars,
  };
}
