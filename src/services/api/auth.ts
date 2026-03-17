import { supabaseAuthRequest } from './apiClient';
import type { LoginRequestDto, LoginResponseDto, SignUpRequestDto, SignUpResponseDto, UserDto } from './types';
import { storage } from '../storage';

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type SupabaseAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  user?: SupabaseAuthUser | null;
};

function mapSupabaseUser(user?: SupabaseAuthUser | null): UserDto | undefined {
  if (!user?.id) return undefined;
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

async function persistSession(session: { accessToken?: string; refreshToken?: string }): Promise<void> {
  if (!session.accessToken || !session.refreshToken) {
    throw new Error('Supabase session is missing access or refresh token.');
  }

  await Promise.all([
    storage.setAccessToken(session.accessToken),
    storage.setRefreshToken(session.refreshToken),
    storage.setLoggedIn(true),
  ]);
}

export const authService = {
  async login(email: string, password: string): Promise<void> {
    const payload: LoginRequestDto = { email: email.trim(), password };
    const res = await supabaseAuthRequest<SupabaseAuthResponse>('/token?grant_type=password', {
      method: 'POST',
      body: payload,
    });

    const mapped: LoginResponseDto = {
      accessToken: res.access_token || '',
      refreshToken: res.refresh_token || '',
      user: mapSupabaseUser(res.user),
    };

    if (!mapped.accessToken || !mapped.refreshToken) {
      throw new Error('Login response missing access token.');
    }

    await persistSession(mapped);
  },

  async signUp(input: SignUpRequestDto): Promise<SignUpResponseDto> {
    const res = await supabaseAuthRequest<SupabaseAuthResponse>('/signup', {
      method: 'POST',
      body: {
        email: input.email.trim(),
        password: input.password,
        data: {
          displayName: input.displayName,
          username: input.username,
          favoriteDances: [],
          otherInterests: '',
          bio: '',
          avatarUrl: null,
        },
      },
    });

    const accessToken = res.access_token;
    const refreshToken = res.refresh_token;
    const needsEmailConfirmation = !accessToken || !refreshToken;

    if (!needsEmailConfirmation) {
      await persistSession({ accessToken, refreshToken });
    } else {
      await Promise.all([
        storage.setLoggedIn(false),
        storage.clearAccessToken(),
        storage.clearRefreshToken(),
      ]);
    }

    return {
      accessToken,
      refreshToken,
      needsEmailConfirmation,
      user: mapSupabaseUser(res.user),
    };
  },

  async logout(): Promise<void> {
    const token = await storage.getAccessToken();
    if (token) {
      try {
        await supabaseAuthRequest('/logout', {
          method: 'POST',
          accessToken: token,
        });
      } catch {}
    }

    await storage.logout();
  },
};
