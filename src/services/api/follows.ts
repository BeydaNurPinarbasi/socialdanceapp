import { supabaseAuthRequest, supabaseRestRequest } from './apiClient';
import { storage } from '../storage';
import { ApiError } from './apiClient';

type SupabaseUserResponse = { id: string };
type SupabaseSessionResponse = { access_token: string; refresh_token: string };

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await storage.getRefreshToken();
  if (!refreshToken) return null;

  const session = await supabaseAuthRequest<SupabaseSessionResponse>('/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });

  await Promise.all([
    storage.setAccessToken(session.access_token),
    storage.setRefreshToken(session.refresh_token),
    storage.setLoggedIn(true),
  ]);

  return session.access_token;
}

async function withAuthorizedUserRequest<T>(run: (accessToken: string) => Promise<T>): Promise<T> {
  let accessToken = await storage.getAccessToken();
  if (!accessToken) accessToken = await refreshAccessToken();
  if (!accessToken) throw new Error('No access token.');

  try {
    return await run(accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const refreshed = await refreshAccessToken();
    if (!refreshed) throw error;
    return run(refreshed);
  }
}

async function getMyUserId(accessToken: string): Promise<string> {
  const user = await supabaseAuthRequest<SupabaseUserResponse>('/user', { accessToken });
  return user.id;
}

export type FollowCounts = { followers: number; following: number };

async function rpcFollowCounts(accessToken: string, userId: string): Promise<FollowCounts> {
  const rows = await supabaseRestRequest<Array<{ followers_count: number; following_count: number }>>(
    '/rpc/get_follow_counts',
    {
      method: 'POST',
      accessToken,
      body: { p_user_id: userId },
    },
  );
  const row = rows?.[0];
  return {
    followers: Number(row?.followers_count ?? 0),
    following: Number(row?.following_count ?? 0),
  };
}

export const followService = {
  async getMyFollowCounts(): Promise<FollowCounts> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const userId = await getMyUserId(accessToken);
      return rpcFollowCounts(accessToken, userId);
    });
  },

  async getFollowCountsForUser(userId: string): Promise<FollowCounts> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      return rpcFollowCounts(accessToken, userId);
    });
  },

  async isFollowing(targetUserId: string): Promise<boolean> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      if (me === targetUserId) return false;
      const rows = await supabaseRestRequest<Array<{ following_id: string }>>(
        `/follows?follower_id=eq.${encodeURIComponent(me)}&following_id=eq.${encodeURIComponent(targetUserId)}&select=following_id&limit=1`,
        { method: 'GET', accessToken },
      );
      return (rows?.length ?? 0) > 0;
    });
  },

  async followUser(targetUserId: string): Promise<void> {
    await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      if (me === targetUserId) return;
      await supabaseRestRequest('/follows', {
        method: 'POST',
        accessToken,
        headers: { Prefer: 'return=minimal' },
        body: { follower_id: me, following_id: targetUserId },
      });
    });
  },

  async unfollowUser(targetUserId: string): Promise<void> {
    await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      await supabaseRestRequest(
        `/follows?follower_id=eq.${encodeURIComponent(me)}&following_id=eq.${encodeURIComponent(targetUserId)}`,
        { method: 'DELETE', accessToken, headers: { Prefer: 'return=minimal' } },
      );
    });
  },
};

