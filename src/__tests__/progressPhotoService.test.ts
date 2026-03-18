/**
 * Unit tests for progressPhotoService — pure/computation functions only.
 * Upload/delete require integration tests (real Firebase Storage + Firestore).
 */

import type { ProgressPhotoEntry, CapturedPhoto } from '../types/bodyTracking';

// Test the CapturedPhoto type structure
describe('CapturedPhoto type', () => {
  it('accepts valid pose values', () => {
    const captures: CapturedPhoto[] = [
      { pose: 'front', uri: 'file:///front.jpg' },
      { pose: 'side', uri: 'file:///side.jpg' },
      { pose: 'back', uri: 'file:///back.jpg' },
    ];
    expect(captures).toHaveLength(3);
    expect(captures[0].pose).toBe('front');
  });
});

// Test ProgressPhotoEntry partial poses
describe('ProgressPhotoEntry poses', () => {
  it('allows partial pose sets', () => {
    const entry: Partial<ProgressPhotoEntry> = {
      date: '2026-03-18',
      poses: {
        front: { fullUrl: 'https://storage.example.com/front.jpg', thumbUrl: 'https://storage.example.com/front_thumb.jpg' },
      },
    };
    expect(entry.poses?.front).toBeDefined();
    expect(entry.poses?.side).toBeUndefined();
    expect(entry.poses?.back).toBeUndefined();
  });

  it('allows all three poses', () => {
    const entry: Partial<ProgressPhotoEntry> = {
      date: '2026-03-18',
      poses: {
        front: { fullUrl: 'https://a.com/f.jpg', thumbUrl: 'https://a.com/ft.jpg' },
        side: { fullUrl: 'https://a.com/s.jpg', thumbUrl: 'https://a.com/st.jpg' },
        back: { fullUrl: 'https://a.com/b.jpg', thumbUrl: 'https://a.com/bt.jpg' },
      },
    };
    expect(Object.keys(entry.poses!)).toHaveLength(3);
  });
});
