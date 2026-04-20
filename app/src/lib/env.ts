import 'server-only';

/**
 * Fail-fast env loader.
 *
 * Any misconfiguration here is a security bug, so every env var is validated
 * at module load. The server refuses to boot with weak or mismatched values.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function assertMinBytes(name: string, value: string, minBytes: number): void {
  const bytes = Buffer.byteLength(value, 'utf8');
  if (bytes < minBytes) {
    throw new Error(
      `Env ${name} is too short (${bytes} bytes). Minimum ${minBytes}. ` +
        `Generate with: openssl rand -base64 ${minBytes}`,
    );
  }
}

function assertHttpsUrl(name: string, value: string, { allowHttpLocalhost = false } = {}): URL {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new Error(`Env ${name} is not a valid URL: ${value}`);
  }
  if (u.protocol !== 'https:') {
    const localhost = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (!(allowHttpLocalhost && localhost && u.protocol === 'http:')) {
      throw new Error(`Env ${name} must be https:// in production (got ${u.protocol}//)`);
    }
  }
  return u;
}

const isProd = process.env.NODE_ENV === 'production';

// ───────── App base ─────────

const appBaseRaw = process.env.APP_BASE_URL || 'http://localhost:3000';
const appBase = assertHttpsUrl('APP_BASE_URL', appBaseRaw, { allowHttpLocalhost: !isProd });

// ───────── Basecamp ─────────

const bcClientId = required('BASECAMP_CLIENT_ID');
const bcClientSecret = required('BASECAMP_CLIENT_SECRET');
const bcRedirectUriRaw = required('BASECAMP_REDIRECT_URI');
const bcRedirect = (() => {
  let u: URL;
  try {
    u = new URL(bcRedirectUriRaw);
  } catch {
    throw new Error('BASECAMP_REDIRECT_URI is not a valid URL');
  }
  // Must live on the same origin as APP_BASE_URL — otherwise the OAuth code can
  // be redirected to an attacker-controlled host.
  if (u.origin !== appBase.origin) {
    throw new Error(
      `BASECAMP_REDIRECT_URI origin (${u.origin}) must match APP_BASE_URL origin (${appBase.origin}).`,
    );
  }
  if (u.pathname !== '/api/auth/callback') {
    throw new Error('BASECAMP_REDIRECT_URI path must be /api/auth/callback');
  }
  return u;
})();
const bcUserAgent =
  process.env.BASECAMP_USER_AGENT ||
  'Thmanyah Basecamp Agent (contact@thmanyah.com)';
if (!/\(.+@.+\..+\)/.test(bcUserAgent)) {
  // Basecamp requires an identifying User-Agent including a contact.
  throw new Error(
    'BASECAMP_USER_AGENT must include a contact address, e.g. "App Name (contact@org.com)"',
  );
}

// ───────── Supabase ─────────

const supabaseUrlRaw = required('SUPABASE_URL');
const supabaseUrl = assertHttpsUrl('SUPABASE_URL', supabaseUrlRaw);
const supabaseServiceRole = required('SUPABASE_SERVICE_ROLE_KEY');
if (!/^eyJ|^sbp_/.test(supabaseServiceRole)) {
  // Heuristic: JWT starts with eyJ; new Supabase secret keys start with sbp_.
  throw new Error('SUPABASE_SERVICE_ROLE_KEY does not look like a service-role secret.');
}

// ───────── Anthropic ─────────

const anthropicKey = required('ANTHROPIC_API_KEY');
if (!/^sk-ant-/.test(anthropicKey)) {
  throw new Error('ANTHROPIC_API_KEY does not look like an Anthropic secret (expected sk-ant-…).');
}

// ───────── Session + token encryption ─────────
// Both must be at least 32 random bytes. base64/base64url/hex encodings all
// pass the byte-length check since we count utf-8 bytes, and an empty value is
// rejected upstream by `required`.

const sessionSecret = required('SESSION_SECRET');
assertMinBytes('SESSION_SECRET', sessionSecret, 32);

const tokenEncryptionKey = required('TOKEN_ENCRYPTION_KEY');
assertMinBytes('TOKEN_ENCRYPTION_KEY', tokenEncryptionKey, 32);
if (sessionSecret === tokenEncryptionKey) {
  throw new Error('SESSION_SECRET and TOKEN_ENCRYPTION_KEY must be different values.');
}

// ───────── Export ─────────

export const env = {
  isProd,
  basecamp: {
    clientId: bcClientId,
    clientSecret: bcClientSecret,
    redirectUri: bcRedirect.toString(),
    userAgent: bcUserAgent,
  },
  supabase: {
    url: supabaseUrl.toString().replace(/\/$/, ''),
    serviceRoleKey: supabaseServiceRole,
  },
  anthropic: {
    apiKey: anthropicKey,
  },
  session: {
    secret: sessionSecret,
  },
  tokenEncryptionKey,
  appBaseUrl: appBase.toString().replace(/\/$/, ''),
  appOrigin: appBase.origin,
} as const;
