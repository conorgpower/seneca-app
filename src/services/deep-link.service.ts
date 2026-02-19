/**
 * Service for handling deep links in the app
 * Primarily used for email verification and password reset flows
 */

interface DeepLinkResult {
  success: boolean;
  type?: 'email-verification' | 'password-reset' | 'unknown';
  params?: Record<string, string>;
}

/**
 * Parse and handle a deep link URL
 */
export async function handleDeepLink(url: string): Promise<DeepLinkResult> {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const searchParams = parsedUrl.searchParams;

    // Extract all query parameters
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // Email verification links
    if (pathname.includes('/verify') || params.type === 'signup') {
      return {
        success: true,
        type: 'email-verification',
        params,
      };
    }

    // Password reset links
    if (pathname.includes('/reset-password') || params.type === 'recovery') {
      return {
        success: true,
        type: 'password-reset',
        params,
      };
    }

    // Unknown link type
    return {
      success: false,
      type: 'unknown',
      params,
    };
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return {
      success: false,
    };
  }
}

/**
 * Extract access token from deep link (used for email verification/password reset)
 */
export function extractAccessToken(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.searchParams.get('access_token');
  } catch (error) {
    console.error('Error extracting access token:', error);
    return null;
  }
}

/**
 * Check if URL is a valid app deep link
 */
export function isValidDeepLink(url: string): boolean {
  return url.startsWith('senecaapp://');
}
