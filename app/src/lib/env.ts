import 'server-only';

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  basecamp: {
    clientId: required('BASECAMP_CLIENT_ID'),
    clientSecret: required('BASECAMP_CLIENT_SECRET'),
    redirectUri: required('BASECAMP_REDIRECT_URI'),
    userAgent:
      process.env.BASECAMP_USER_AGENT ||
      'Thmanyah Basecamp Agent (contact@thmanyah.com)',
  },
  supabase: {
    url: required('SUPABASE_URL'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  },
  anthropic: {
    apiKey: required('ANTHROPIC_API_KEY'),
  },
  session: {
    secret: required('SESSION_SECRET'),
  },
  tokenEncryptionKey: required('TOKEN_ENCRYPTION_KEY'),
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
};
