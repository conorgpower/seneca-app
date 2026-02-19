import { supabase } from './supabase';
import { Session, User, AuthError } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';

export interface AuthResponse {
  error: AuthError | null;
  session?: Session | null;
  user?: User | null;
}

WebBrowser.maybeCompleteAuthSession();

function toAuthError(message: string): AuthError {
  return { message } as AuthError;
}

function parseAuthParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};

  const queryStart = url.indexOf('?');
  const hashStart = url.indexOf('#');

  if (queryStart >= 0) {
    const queryEnd = hashStart >= 0 ? hashStart : url.length;
    const query = url.slice(queryStart + 1, queryEnd);
    for (const [key, value] of new URLSearchParams(query).entries()) {
      params[key] = value;
    }
  }

  if (hashStart >= 0) {
    const hash = url.slice(hashStart + 1);
    for (const [key, value] of new URLSearchParams(hash).entries()) {
      params[key] = value;
    }
  }

  return params;
}

/**
 * Sign in with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      error,
      session: data.session,
      user: data.user,
    };
  } catch (error: any) {
    return {
      error: error as AuthError,
      session: null,
      user: null,
    };
  }
}

/**
 * Sign up with email, password, and metadata
 */
export async function signUp(
  email: string,
  password: string,
  metadata?: { name?: string }
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    return {
      error,
      session: data.session,
      user: data.user,
    };
  } catch (error: any) {
    return {
      error: error as AuthError,
      session: null,
      user: null,
    };
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Reset password - sends reset email
 */
export async function resetPassword(
  email: string
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'senecaapp://reset-password',
  });
  return { error };
}

/**
 * Update password
 */
export async function updatePassword(
  newPassword: string
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { error };
}

/**
 * Refresh the current session
 */
export async function refreshSession(): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.refreshSession();
  return {
    error,
    session: data.session,
    user: data.user,
  };
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(
  callback: (session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}

/**
 * Sign in with Google via mobile OAuth + deep link callback
 */
export async function signInWithGoogle(): Promise<AuthResponse> {
  try {
    const redirectTo = makeRedirectUri({
      scheme: 'senecaapp',
      path: 'auth/callback',
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) return { error, session: null, user: null };
    if (!data?.url) {
      return { error: toAuthError('Google OAuth URL was not returned.'), session: null, user: null };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) {
      return { error: toAuthError('Google sign-in was cancelled.'), session: null, user: null };
    }

    const parsed = Linking.parse(result.url);
    const parsedParams = parseAuthParams(result.url);
    const code = parsedParams.code || null;
    const errorDescription = parsedParams.error_description || parsedParams.error || null;

    if (errorDescription) {
      return { error: toAuthError(errorDescription), session: null, user: null };
    }

    if (code) {
      const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        return { error: exchangeError, session: null, user: null };
      }

      return {
        error: null,
        session: sessionData.session,
        user: sessionData.user,
      };
    }

    const accessToken = parsedParams.access_token || null;
    const refreshToken = parsedParams.refresh_token || null;
    if (accessToken && refreshToken) {
      const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (setSessionError) {
        return { error: setSessionError, session: null, user: null };
      }

      return {
        error: null,
        session: sessionData.session,
        user: sessionData.user,
      };
    }

    return {
      error: toAuthError(
        `Google sign-in did not return an auth code or session tokens. Callback: ${result.url}`
      ),
      session: null,
      user: null,
    };
  } catch (error: any) {
    return {
      error: toAuthError(error?.message || 'Google sign-in failed.'),
      session: null,
      user: null,
    };
  }
}

/**
 * Sign in with Apple natively and exchange ID token with Supabase
 */
export async function signInWithApple(): Promise<AuthResponse> {
  try {
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      return {
        error: toAuthError('Apple sign-in is not available on this device.'),
        session: null,
        user: null,
      };
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return {
        error: toAuthError('Apple sign-in did not return an identity token.'),
        session: null,
        user: null,
      };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    return {
      error,
      session: data.session,
      user: data.user,
    };
  } catch (error: any) {
    if (error?.code === 'ERR_REQUEST_CANCELED') {
      return {
        error: toAuthError('Apple sign-in was cancelled.'),
        session: null,
        user: null,
      };
    }

    return {
      error: toAuthError(error?.message || 'Apple sign-in failed.'),
      session: null,
      user: null,
    };
  }
}
