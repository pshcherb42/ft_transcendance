const API_ERROR_KEYS: Record<string, string> = {
  INVALID_CREDENTIALS: 'auth.invalidCredentials',
  EMAIL_IN_USE: 'auth.emailInUse',
  USERNAME_IN_USE: 'auth.usernameInUse',
  CURRENT_PASSWORD_REQUIRED: 'profile.currentPasswordRequired',
  OAUTH_PASSWORD_CHANGE_FORBIDDEN: 'profile.oauthPasswordChangeForbidden',
  CURRENT_PASSWORD_INCORRECT: 'profile.currentPasswordIncorrect',
};

export function apiErrorKey(data: unknown): string | null {
  const code = (data as { code?: string } | null)?.code;
  return code ? (API_ERROR_KEYS[code] ?? null) : null;
}
