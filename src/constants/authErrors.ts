/**
 * Human-readable messages for Firebase Auth error codes.
 * Keeps auth screens clean — no inline switch/case.
 */
export const AUTH_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 8 characters.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/user-disabled': 'This account has been disabled.',
};

export function getAuthErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  return AUTH_ERRORS[code] ?? 'Something went wrong. Please try again.';
}
