import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, StoredProfile } from '../services/storage';
import { hasSupabaseConfig } from '../services/api/apiClient';
import { profileService } from '../services/api/profile';

const DEFAULT_AVATAR_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAozkav3nW4pjxxBTZ9r4bnylgPIqCTaCZfeooT-iWfynJKZXgRv-HsTDa3vAtFwVs-S0q_5DxzyefpzHzF9dxop2EIWngyydzbp00sS9RD_GW7EAYzlT5uL0xw7zjOZu4BhH4QjAGHvnjHbl6blJTPQPYsnNb08fT2JwDrOlRZhBHfCqRwlN3GOJq-wj48GfdD3ZyLxdmrkroY0i1ic51l_ssDbmO_cM2bldocE_cHmHuSYfM4JE3Up_oWcyj3HNikmvQ4rUzFrWE';

export interface Profile {
  displayName: string;
  username: string;
  avatarUri: string | null;
  bio: string;
  email: string;
  favoriteDances: string[];
  otherInterests: string;
}

export function getAvatarSource(avatarUri: string | null): string {
  return avatarUri ?? DEFAULT_AVATAR_URL;
}

interface ProfileContextValue {
  profile: Profile;
  avatarSource: string;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<Profile>) => void;
  setProfileFromStored: (stored: StoredProfile) => void;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<Profile>({
    displayName: '',
    username: '',
    avatarUri: null,
    bio: '',
    email: '',
    favoriteDances: [],
    otherInterests: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyProfile = useCallback((p: Profile) => {
    setProfileState(p);
  }, []);

  const refreshProfile = useCallback(async () => {
    setError(null);
    const hasApi = hasSupabaseConfig();
    const [token, refreshToken] = await Promise.all([
      storage.getAccessToken(),
      storage.getRefreshToken(),
    ]);

    // Backend-driven profile: if there is no session hint (or API), never show stale cached profile.
    if (!hasApi || (!token && !refreshToken)) {
      await storage.clearProfile();
      applyProfile({
        displayName: '',
        username: '',
        avatarUri: null,
        bio: '',
        email: '',
        favoriteDances: [],
        otherInterests: '',
      });
      return;
    }

    const remote = await profileService.getMe();
    applyProfile(remote);
  }, [applyProfile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshProfile();
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Profile load failed.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshProfile]);

  const setProfileFromStored = useCallback((stored: StoredProfile) => {
    setProfileState({
      displayName: stored.displayName,
      username: stored.username,
      avatarUri: stored.avatarUri,
      bio: stored.bio,
      email: stored.email ?? '',
      favoriteDances: stored.favoriteDances ?? [],
      otherInterests: stored.otherInterests ?? '',
    });
  }, []);

  const updateProfile = useCallback((updates: Partial<Profile>) => {
    setProfileState((prev) => {
      const next = { ...prev, ...updates };
      const hasApi = hasSupabaseConfig();
      if (hasApi) {
        profileService.updateMe(next).catch(() => {});
      }
      return next;
    });
  }, []);

  const avatarSource = getAvatarSource(profile.avatarUri);

  const value: ProfileContextValue = {
    profile,
    avatarSource,
    loading,
    error,
    updateProfile,
    setProfileFromStored,
    refreshProfile,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
