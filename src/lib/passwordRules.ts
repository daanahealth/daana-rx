/**
 * Canonical password rules for DaanaRX.
 *
 * Shared by sign-up, reset-password, and Settings → Change Password.
 * Source of truth — do NOT duplicate the regexes elsewhere.
 *
 * Rules (per MASS MVP spec — Authentication / Password Rules):
 *   - Minimum 10 characters
 *   - At least one uppercase letter
 *   - At least one lowercase letter
 *   - At least one number
 *   - At least one special character (!@#$%^&*)
 *
 * `validatePassword` returns failure strings using spec wording verbatim so
 * UI surfaces (Change Password, Reset Password) can render the exact text
 * required by the spec without rewording.
 */

export type PasswordRuleId =
  | 'length'
  | 'uppercase'
  | 'lowercase'
  | 'number'
  | 'special';

export interface PasswordRule {
  id: PasswordRuleId;
  /** Spec wording (verbatim from the MVP spec password-rules bullet). */
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: 'Minimum 10 characters',
    test: (p) => p.length >= 10,
  },
  {
    id: 'uppercase',
    label: 'At least one uppercase letter',
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: 'lowercase',
    label: 'At least one lowercase letter',
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: 'number',
    label: 'At least one number',
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: 'special',
    label: 'At least one special character (!@#$%^&*)',
    test: (p) => /[!@#$%^&*]/.test(p),
  },
];

/** Human-readable summary used for UI display. */
export const PASSWORD_RULES_TEXT =
  'Passwords must meet the following requirements:\n' +
  PASSWORD_RULES.map((r) => `  • ${r.label}`).join('\n');

export interface PasswordValidationResult {
  ok: boolean;
  /** Spec-wording strings for every failed rule. Empty when ok=true. */
  failures: string[];
}

/**
 * Validate a candidate password against the MASS MVP password rules.
 *
 * Failure strings match the bullet wording in the spec verbatim.
 */
export function validatePassword(
  password: string | null | undefined,
): PasswordValidationResult {
  const value = typeof password === 'string' ? password : '';
  const failures: string[] = [];
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(value)) failures.push(rule.label);
  }
  return { ok: failures.length === 0, failures };
}

/**
 * Returns per-rule pass/fail for live checklist UI.
 */
export function evaluatePassword(
  password: string,
): Array<{ id: PasswordRuleId; label: string; passed: boolean }> {
  return PASSWORD_RULES.map((r) => ({
    id: r.id,
    label: r.label,
    passed: r.test(password),
  }));
}
