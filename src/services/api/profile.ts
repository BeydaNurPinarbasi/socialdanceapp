import { ApiError, supabaseAuthRequest } from './apiClient';
import type { MeResponseDto, UpdateMeRequestDto, UpdateMeResponseDto, UserDto } from './types';
import { storage } from '../storage';

export type ProfileModel = {
  displayName: string;
  username: string;
  avatarUri: string | null;
  bio: string;
  email: string;
  favoriteDances: string[];
  otherInterests: string;
};

type SupabaseUserResponse = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type SupabaseSessionResponse = {
  access_token: string;
  refresh_token: string;
  user?: SupabaseUserResponse | null;
};

function mapSupabaseUser(user: SupabaseUserResponse): UserDto {
  const metadata = user.user_metadata ?? {};

  return {
    id: user.id,
    email: typeof user.email === 'string' ? user.email : null,
    displayName: typeof metadata.displayName === 'string' ? metadata.displayName : null,
    username: typeof metadata.username === 'string' ? metadata.username : null,
    avatarUrl: typeof metadata.avatarUrl === 'string' ? metadata.avatarUrl : null,
    bio: typeof metadata.bio === 'string' ? metadata.bio : null,
    favoriteDances: Array.isArray(metadata.favoriteDances)
      ? metadata.favoriteDances.filter((item): item is string => typeof item === 'string')
      : null,
    otherInterests: typeof metadata.otherInterests === 'string' ? metadata.otherInterests : null,
  };
}

function mapUserDtoToProfile(user: UserDto): ProfileModel {
  return {
    displayName: (user.displayName ?? '').trim(),
    username: (user.username ?? '').trim(),
    avatarUri: user.avatarUrl ?? null,
    bio: (user.bio ?? '').trim(),
    email: (user.email ?? '').trim(),
    favoriteDances: user.favoriteDances ?? [],
    otherInterests: (user.otherInterests ?? '').trim(),
  };
}

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
  if (!accessToken) {
    accessToken = await refreshAccessToken();
  }
  if (!accessToken) throw new Error('No access token.');

  try {
    return await run(accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) throw error;
    return run(refreshedToken);
  }
}

export const profileService = {
  async getMe(): Promise<ProfileModel> {
    const res = await withAuthorizedUserRequest(async (accessToken) => {
      const user = await supabaseAuthRequest<SupabaseUserResponse>('/user', {
        accessToken,
      });

      return {
        user: mapSupabaseUser(user),
      } satisfies MeResponseDto;
    });

    return mapUserDtoToProfile(res.user);
  },

  async updateMe(updates: Partial<ProfileModel>): Promise<ProfileModel> {
    const res = await withAuthorizedUserRequest(async (accessToken) => {
      const currentUser = await supabaseAuthRequest<SupabaseUserResponse>('/user', {
        accessToken,
      });

      const currentMetadata = currentUser.user_metadata ?? {};
      const body: UpdateMeRequestDto = {
        displayName: updates.displayName,
        username: updates.username,
        email: updates.email,
        avatarUrl: updates.avatarUri ?? undefined,
        bio: updates.bio,
        favoriteDances: updates.favoriteDances,
        otherInterests: updates.otherInterests,
      };

      const updatedUser = await supabaseAuthRequest<SupabaseUserResponse>('/user', {
        method: 'PUT',
        accessToken,
        body: {
          email: body.email,
          data: {
            ...currentMetadata,
            ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
            ...(body.username !== undefined ? { username: body.username } : {}),
            ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
            ...(body.bio !== undefined ? { bio: body.bio } : {}),
            ...(body.favoriteDances !== undefined ? { favoriteDances: body.favoriteDances } : {}),
            ...(body.otherInterests !== undefined ? { otherInterests: body.otherInterests } : {}),
          },
        },
      });

      return {
        user: mapSupabaseUser(updatedUser),
      } satisfies UpdateMeResponseDto;
    });

    return mapUserDtoToProfile(res.user);
  },
};
