/**
 * Human-readable messages for Firebase Auth error codes.
 * Keeps auth screens clean — no inline switch/case.
 */
export const AUTH_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'This email is already registered. Try logging in.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your internet connection.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/operation-not-allowed': 'Email/password signup is not enabled in Firebase.',
};

export function getAuthErrorMessage(error: unknown): string {
  const err = error as { code?: string; message?: string };
  const code = err?.code ?? '';
  const mapped = AUTH_ERRORS[code];
  if (mapped) return mapped;
  // Debug fallback — shows raw code + message so unmapped errors are visible
  const rawMessage = err?.message ?? 'Unknown error';
  console.error('[getAuthErrorMessage] Unmapped Firebase error:', code, rawMessage);
  return 'Something went wrong. Please try again.';
}
