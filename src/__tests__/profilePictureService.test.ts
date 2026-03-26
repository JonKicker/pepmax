/**
 * Tests for profilePictureService.ts
 *
 * All Firebase/Storage modules are mocked. Tests verify:
 *   - uploadProfilePicture: compression call, upload call, profile update, public profile mirror, analytics
 *   - uploadProfilePicture: propagates upload errors
 *   - removeProfilePicture: deletes file, clears both docs, tracks analytics
 *   - removeProfilePicture: gracefully handles missing auth
 */

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('../services/firebase/storage', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
}));

jest.mock('../services/firebase/firestore', () => ({
  updateDocument: jest.fn(),
  COLLECTIONS: { PROFILE: 'profile' },
}));

jest.mock('../services/errorReporting', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('../services/analytics', () => ({
  analytics: { track: jest.fn() },
  AnalyticsEvent: {
    PROFILE_PICTURE_UPLOADED: 'profile_picture_uploaded',
    PROFILE_PICTURE_REMOVED: 'profile_picture_removed',
  },
}));

jest.mock('../services/firebase/index', () => ({
  db: { _fake: true },
  auth: { currentUser: { uid: 'user-123' } },
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ _fakeRef: true })),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  deleteField: jest.fn(() => '__DELETE__'),
  serverTimestamp: jest.fn(() => '__SERVER_TS__'),
}));

import * as ImageManipulator from 'expo-image-manipulator';
import { uploadFile, deleteFile } from '../services/firebase/storage';
import { updateDocument } from '../services/firebase/firestore';
import { analytics } from '../services/analytics';
import * as firestoreModule from 'firebase/firestore';
import { uploadProfilePicture, removeProfilePicture } from '../services/profilePictureService';

const mockManipulate = ImageManipulator.manipulateAsync as jest.Mock;
const mockUploadFile = uploadFile as jest.Mock;
const mockDeleteFile = deleteFile as jest.Mock;
const mockUpdateDocument = updateDocument as jest.Mock;
const mockTrack = analytics.track as jest.Mock;
const mockDoc = firestoreModule.doc as jest.Mock;
const mockUpdateDoc = firestoreModule.updateDoc as jest.Mock;
const mockDeleteField = firestoreModule.deleteField as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateDoc.mockResolvedValue(undefined);
  mockDeleteField.mockReturnValue('__DELETE__');
});

// ─── uploadProfilePicture ─────────────────────────────────────────────────────

describe('uploadProfilePicture', () => {
  it('compresses image and uploads to storage', async () => {
    mockManipulate.mockResolvedValue({ uri: 'file://compressed.jpg' });
    mockUploadFile.mockResolvedValue({ data: 'https://cdn.example.com/avatar.jpg', error: null });
    mockUpdateDocument.mockResolvedValue({ data: undefined, error: null });

    const result = await uploadProfilePicture('file://original.jpg');

    expect(mockManipulate).toHaveBeenCalledWith(
      'file://original.jpg',
      [{ resize: { width: 400 } }],
      { compress: 0.85, format: 'jpeg' },
    );
    expect(mockUploadFile).toHaveBeenCalledWith('profilePicture/avatar.jpg', 'file://compressed.jpg');
    expect(result.data).toBe('https://cdn.example.com/avatar.jpg');
    expect(result.error).toBeNull();
  });

  it('updates profile doc with download URL', async () => {
    mockManipulate.mockResolvedValue({ uri: 'file://compressed.jpg' });
    mockUploadFile.mockResolvedValue({ data: 'https://cdn.example.com/avatar.jpg', error: null });
    mockUpdateDocument.mockResolvedValue({ data: undefined, error: null });

    await uploadProfilePicture('file://original.jpg');

    expect(mockUpdateDocument).toHaveBeenCalledWith(
      'profile',
      'data',
      { profilePictureUrl: 'https://cdn.example.com/avatar.jpg' },
    );
  });

  it('mirrors URL to publicProfiles via direct Firestore updateDoc', async () => {
    mockManipulate.mockResolvedValue({ uri: 'file://compressed.jpg' });
    mockUploadFile.mockResolvedValue({ data: 'https://cdn.example.com/avatar.jpg', error: null });
    mockUpdateDocument.mockResolvedValue({ data: undefined, error: null });

    await uploadProfilePicture('file://original.jpg');

    expect(mockDoc).toHaveBeenCalledWith(
      expect.anything(),
      'publicProfiles',
      'user-123',
    );
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ profilePictureUrl: 'https://cdn.example.com/avatar.jpg' }),
    );
  });

  it('tracks analytics event on success', async () => {
    mockManipulate.mockResolvedValue({ uri: 'file://compressed.jpg' });
    mockUploadFile.mockResolvedValue({ data: 'https://cdn.example.com/avatar.jpg', error: null });
    mockUpdateDocument.mockResolvedValue({ data: undefined, error: null });

    await uploadProfilePicture('file://original.jpg');

    expect(mockTrack).toHaveBeenCalledWith('profile_picture_uploaded');
  });

  it('returns error when upload fails', async () => {
    mockManipulate.mockResolvedValue({ uri: 'file://compressed.jpg' });
    const uploadError = new Error('Storage quota exceeded');
    mockUploadFile.mockResolvedValue({ data: null, error: uploadError });

    const result = await uploadProfilePicture('file://original.jpg');

    expect(result.data).toBeNull();
    expect(result.error).toBe(uploadError);
    // Should NOT track analytics on failure
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('returns error when not authenticated', async () => {
    const authModule = require('../services/firebase/index');
    const originalUser = authModule.auth.currentUser;
    authModule.auth.currentUser = null;

    const result = await uploadProfilePicture('file://photo.jpg');

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toMatch(/not authenticated/i);

    authModule.auth.currentUser = originalUser;
  });
});

// ─── removeProfilePicture ─────────────────────────────────────────────────────

describe('removeProfilePicture', () => {
  it('deletes file from storage', async () => {
    mockDeleteFile.mockResolvedValue({ data: undefined, error: null });
    mockUpdateDocument.mockResolvedValue({ data: undefined, error: null });

    await removeProfilePicture();

    expect(mockDeleteFile).toHaveBeenCalledWith('profilePicture/avatar.jpg');
  });

  it('clears profilePictureUrl from public profile', async () => {
    mockDeleteFile.mockResolvedValue({ data: undefined, error: null });
    mockUpdateDocument.mockResolvedValue({ data: undefined, error: null });

    await removeProfilePicture();

    expect(mockDoc).toHaveBeenCalledWith(
      expect.anything(),
      'publicProfiles',
      'user-123',
    );
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ profilePictureUrl: '__DELETE__' }),
    );
  });

  it('tracks analytics event on success', async () => {
    mockDeleteFile.mockResolvedValue({ data: undefined, error: null });
    mockUpdateDocument.mockResolvedValue({ data: undefined, error: null });

    await removeProfilePicture();

    expect(mockTrack).toHaveBeenCalledWith('profile_picture_removed');
  });

  it('returns error when not authenticated', async () => {
    const authModule = require('../services/firebase/index');
    const originalUser = authModule.auth.currentUser;
    authModule.auth.currentUser = null;

    const result = await removeProfilePicture();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);

    authModule.auth.currentUser = originalUser;
  });

  it('does not propagate storage delete failures — gracefully continues', async () => {
    // deleteFile rejects entirely (e.g. network error)
    mockDeleteFile.mockRejectedValue(new Error('Network error'));
    mockUpdateDocument.mockResolvedValue({ data: undefined, error: null });

    // removeProfilePicture wraps deleteFile in .catch(() => {}), so it should not throw
    await expect(removeProfilePicture()).resolves.not.toThrow();
  });
});
