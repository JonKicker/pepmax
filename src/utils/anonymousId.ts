/**
 * Anonymous ID utility.
 *
 * Produces a consistent, non-reversible identifier per user by hashing
 * their Firebase uid with a static app salt.
 *
 * Why: Community templates and reviews must be linkable to the same author
 * without exposing their real identity. SHA-256 is one-way for casual
 * lookups; the salt prevents trivial rainbow-table attacks.
 *
 * Limitation: The salt lives in the app bundle. A determined attacker with
 * APK access could extract it and brute-force small uid sets. This is
 * acceptable for an MVP community library — not for authentication.
 */
import * as Crypto from 'expo-crypto';
import { auth } from '../services/firebase/index';

const APP_SALT = 'pepmax_community_v1';

/**
 * Returns a SHA-256 hex digest of the current user's uid + the app salt.
 * Consistent for the same uid across sessions and devices.
 * Throws if no user is authenticated.
 */
export async function getAnonymousId(): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('getAnonymousId called without authenticated user');
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    uid + APP_SALT
  );
}
