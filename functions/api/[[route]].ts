import * as CryptoJS from "crypto-js";
import { block, tools, wallet } from "nanocurrency-web";

export interface Env {
  DB: any;
  JWT_SECRET: string;
  CORS_ORIGIN?: string;
  RPC_URL?: string;
}

interface Session {
  userId: string;
  email: string;
  exp: number;
}

interface ApiKeySession {
  userId: string;
  email: string;
  keyId: string;
}

interface DerivedAccount {
  account: string;
  privateKey: string;
  publicKey: string;
}

const encoder = new TextEncoder();
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const ZERO_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
const DEFAULT_REPRESENTATIVE = "nano_3msc38fyn67pgio16dj586pdrceahtn75qgnx7fy19wscixrc8dbb3abhbw6";
const TOTP_STEP_SECONDS = 30;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-api-key",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function allowedOrigin(request: Request, env: Env): string {
  const requestOrigin = request.headers.get("origin") || "";
  const configuredOrigin = env.CORS_ORIGIN || "http://localhost:4200";

  if (requestOrigin && requestOrigin === configuredOrigin) {
    return requestOrigin;
  }

  return configuredOrigin;
}

function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function randomHex(bytes = 16): string {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return [...values].map((n) => n.toString(16).padStart(2, "0")).join("");
}

function randomBytes(bytes = 20): Uint8Array {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return values;
}

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input: string): Uint8Array {
  const sanitized = input.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of sanitized) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) {
      continue;
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

async function generateTotp(secretBase32: string, unixTimeSeconds = Math.floor(Date.now() / 1000)): Promise<string> {
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(unixTimeSeconds / TOTP_STEP_SECONDS);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Math.floor(counter / 0x100000000), false);
  view.setUint32(4, counter >>> 0, false);

  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, buffer));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 1000000).padStart(6, "0");
}

async function verifyTotp(secretBase32: string, code: string): Promise<boolean> {
  const normalized = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  for (const stepOffset of [-1, 0, 1]) {
    const expected = await generateTotp(secretBase32, now + stepOffset * TOTP_STEP_SECONDS);
    if (expected === normalized) {
      return true;
    }
  }

  return false;
}

function toBase64Url(input: ArrayBuffer | string): string {
  const source = typeof input === "string" ? encoder.encode(input) : new Uint8Array(input);
  let output = "";

  for (const charCode of source) {
    output += String.fromCharCode(charCode);
  }

  return btoa(output).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "===".slice((b64.length + 3) % 4);
  const decoded = atob(padded);
  const out = new Uint8Array(decoded.length);

  for (let i = 0; i < decoded.length; i++) {
    out[i] = decoded.charCodeAt(i);
  }

  return out;
}

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: 120000,
      salt: encoder.encode(saltHex),
    },
    keyMaterial,
    256
  );

  return [...new Uint8Array(bits)].map((n) => n.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((n) => n.toString(16).padStart(2, "0")).join("");
}

async function signToken(payload: Session, secret: string): Promise<string> {
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = toBase64Url(JSON.stringify(payload));
  const input = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(input));
  return `${input}.${toBase64Url(signature)}`;
}

async function verifyToken(token: string, secret: string): Promise<Session | null> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [header, payload, signature] = parts;
  const signed = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const isValid = await crypto.subtle.verify("HMAC", key, fromBase64Url(signature), encoder.encode(signed));
  if (!isValid) {
    return null;
  }

  const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as Session;
  if (!parsed?.userId || !parsed?.email || !parsed?.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return parsed;
}

async function parseJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function requireAuth(request: Request, env: Env): Promise<Session | null> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    return null;
  }

  return verifyToken(token, env.JWT_SECRET);
}

async function requireApiKeyAuth(request: Request, env: Env): Promise<ApiKeySession | null> {
  const apiKey = request.headers.get("x-api-key") || "";
  if (!apiKey) {
    return null;
  }

  const keyHash = await sha256Hex(apiKey);
  const found = await env.DB.prepare(
    `SELECT api_keys.id AS key_id, users.id AS user_id, users.email AS email
       FROM api_keys
       INNER JOIN users ON users.id = api_keys.user_id
      WHERE api_keys.key_hash = ?
        AND api_keys.revoked_at IS NULL`
  )
    .bind(keyHash)
    .first() as { key_id: string; user_id: string; email: string } | null;

  if (!found) {
    return null;
  }

  await env.DB.prepare("UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(found.key_id)
    .run();

  return {
    keyId: found.key_id,
    userId: found.user_id,
    email: found.email,
  };
}

async function getTwoFactorState(env: Env, userId: string): Promise<{ secret: string | null; temp_secret: string | null; enabled: number } | null> {
  return (await env.DB.prepare("SELECT secret, temp_secret, enabled FROM user_2fa WHERE user_id = ?")
    .bind(userId)
    .first()) as { secret: string | null; temp_secret: string | null; enabled: number } | null;
}

async function rpcCall(env: Env, body: Record<string, unknown>): Promise<any> {
  const rpcUrl = env.RPC_URL || "https://rpc.nano.to";
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  return await response.json();
}

function decryptSeedFromExport(encryptedWallet: string, walletPassword: string): string {
  const exportData = JSON.parse(encryptedWallet) as {
    type?: string;
    seed?: string;
    privateKey?: string;
    expandedKey?: string;
  };

  if (!walletPassword || walletPassword.length < 1) {
    throw new Error("walletPassword is required");
  }

  if (exportData.type !== "seed" || !exportData.seed) {
    throw new Error("Only seed wallet type is currently supported by programmatic send/receive");
  }

  const decrypted = CryptoJS.AES.decrypt(exportData.seed, walletPassword).toString(CryptoJS.enc.Utf8);
  if (!/^[0-9A-Fa-f]{64}$/.test(decrypted)) {
    throw new Error("Invalid wallet password");
  }

  return decrypted;
}

function isValidAccountIndex(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 1000000;
}

function deriveAccountFromSeed(seed: string, accountIndex: number): DerivedAccount {
  if (!isValidAccountIndex(accountIndex)) {
    throw new Error("accountIndex must be a non-negative integer");
  }

  const derived = (wallet as any).fromLegacySeed(seed, accountIndex, accountIndex).accounts[0];

  return {
    account: derived.address,
    privateKey: derived.privateKey,
    publicKey: derived.publicKey,
  };
}

async function decryptProgrammaticSeed(env: Env, userId: string, walletPassword: string): Promise<string> {
  const walletRecord = await env.DB.prepare(
    "SELECT encrypted_wallet FROM cloud_wallets WHERE user_id = ?"
  )
    .bind(userId)
    .first() as { encrypted_wallet: string } | null;

  if (!walletRecord) {
    throw new Error("No cloud wallet backup found");
  }

  return decryptSeedFromExport(walletRecord.encrypted_wallet, walletPassword);
}

async function getProgrammaticWallet(env: Env, userId: string, walletPassword: string, accountIndex = 0): Promise<DerivedAccount> {
  const seed = await decryptProgrammaticSeed(env, userId, walletPassword);
  return deriveAccountFromSeed(seed, accountIndex);
}

async function getNextProgrammaticAccountIndex(env: Env, userId: string): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT MAX(account_index) AS max_index FROM programmatic_accounts WHERE user_id = ?"
  )
    .bind(userId)
    .first() as { max_index: number | null } | null;

  if (!row || row.max_index == null) {
    return 0;
  }

  return Number(row.max_index) + 1;
}

async function storeProgrammaticAccount(env: Env, userId: string, accountIndex: number, account: string): Promise<void> {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO programmatic_accounts (id, user_id, account_index, account)
     VALUES (?, ?, ?, ?)`
  )
    .bind(randomHex(16), userId, accountIndex, account)
    .run();
}

async function resolveNanoAddress(env: Env, value: string, fieldLabel = "address"): Promise<string> {
  const trimmed = value.trim();
  if (tools.validateAddress(trimmed)) {
    return trimmed;
  }

  if (!trimmed.startsWith("@")) {
    throw new Error(`${fieldLabel} must be a valid nano address or @username`);
  }

  const username = trimmed.slice(1).toLowerCase();
  const known = await rpcCall(env, { action: "known" });
  const knownList = Array.isArray(known) ? known : [];
  const match = knownList.find((item: any) => String(item.name || "").toLowerCase() === username);

  if (!match?.address || !tools.validateAddress(match.address)) {
    throw new Error(`Unknown username: ${trimmed}`);
  }

  return match.address;
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
    const origin = allowedOrigin(request, env);
    const headers = corsHeaders(origin);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (!env.JWT_SECRET) {
      return json({ error: "JWT_SECRET is not configured" }, { status: 500, headers });
    }

    if (url.pathname === "/api/auth/register" && request.method === "POST") {
      const body = await parseJson(request);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");

      if (!isEmailValid(email)) {
        return json({ error: "Invalid email" }, { status: 400, headers });
      }

      if (password.length < 8) {
        return json({ error: "Password must be at least 8 characters" }, { status: 400, headers });
      }

      const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
      if (existing) {
        return json({ error: "Email is already registered" }, { status: 409, headers });
      }

      const userId = randomHex(16);
      const salt = randomHex(16);
      const passwordHash = await hashPassword(password, salt);

      await env.DB.prepare(
        "INSERT INTO users (id, email, password_hash, password_salt) VALUES (?, ?, ?, ?)"
      )
        .bind(userId, email, passwordHash, salt)
        .run();

      const payload: Session = {
        userId,
        email,
        exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
      };

      const token = await signToken(payload, env.JWT_SECRET);

      return json({ token, email }, { headers });
    }

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      const body = await parseJson(request);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const totpCode = String(body.totpCode || "").trim();

      const user = await env.DB.prepare(
        "SELECT id, email, password_hash, password_salt FROM users WHERE email = ?"
      )
        .bind(email)
        .first() as {
          id: string;
          email: string;
          password_hash: string;
          password_salt: string;
        } | null;

      if (!user) {
        return json({ error: "Invalid email or password" }, { status: 401, headers });
      }

      const passwordHash = await hashPassword(password, user.password_salt);
      if (passwordHash !== user.password_hash) {
        return json({ error: "Invalid email or password" }, { status: 401, headers });
      }

      const twoFactor = await getTwoFactorState(env, user.id);
      const twoFactorEnabled = !!(twoFactor && Number(twoFactor.enabled) === 1 && twoFactor.secret);
      if (twoFactorEnabled) {
        if (!totpCode) {
          return json({ error: "Two-factor code required", requires2fa: true }, { status: 401, headers });
        }

        const valid = await verifyTotp(String(twoFactor?.secret || ""), totpCode);
        if (!valid) {
          return json({ error: "Invalid two-factor code", requires2fa: true }, { status: 401, headers });
        }
      }

      const payload: Session = {
        userId: user.id,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
      };
      const token = await signToken(payload, env.JWT_SECRET);

      return json({ token, email: user.email, twoFactorEnabled }, { headers });
    }

    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      const session = await requireAuth(request, env);
      if (!session) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      const twoFactor = await getTwoFactorState(env, session.userId);

      return json({ email: session.email, twoFactorEnabled: Number(twoFactor?.enabled || 0) === 1 }, { headers });
    }

    if (url.pathname === "/api/auth/2fa/status" && request.method === "GET") {
      const session = await requireAuth(request, env);
      if (!session) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      const twoFactor = await getTwoFactorState(env, session.userId);
      return json(
        {
          enabled: Number(twoFactor?.enabled || 0) === 1,
          setupPending: !!twoFactor?.temp_secret,
        },
        { headers }
      );
    }

    if (url.pathname === "/api/auth/2fa/setup" && request.method === "POST") {
      const session = await requireAuth(request, env);
      if (!session) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      const twoFactor = await getTwoFactorState(env, session.userId);
      if (Number(twoFactor?.enabled || 0) === 1) {
        return json({ error: "Two-factor authentication is already enabled" }, { status: 409, headers });
      }

      const tempSecret = base32Encode(randomBytes(20));
      const issuer = "Nault Pro";
      const accountName = session.email;
      const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
        accountName
      )}?secret=${encodeURIComponent(tempSecret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

      await env.DB.prepare(
        `INSERT INTO user_2fa (user_id, temp_secret, enabled, updated_at)
         VALUES (?, ?, 0, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           temp_secret = excluded.temp_secret,
           updated_at = CURRENT_TIMESTAMP`
      )
        .bind(session.userId, tempSecret)
        .run();

      return json({ secret: tempSecret, otpauthUrl }, { headers });
    }

    if (url.pathname === "/api/auth/2fa/enable" && request.method === "POST") {
      const session = await requireAuth(request, env);
      if (!session) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      const body = await parseJson(request);
      const code = String(body.code || "").trim();
      const twoFactor = await getTwoFactorState(env, session.userId);
      const tempSecret = String(twoFactor?.temp_secret || "");

      if (!tempSecret) {
        return json({ error: "No pending 2FA setup. Start setup first." }, { status: 400, headers });
      }

      const valid = await verifyTotp(tempSecret, code);
      if (!valid) {
        return json({ error: "Invalid verification code" }, { status: 400, headers });
      }

      await env.DB.prepare(
        `UPDATE user_2fa
            SET secret = ?,
                temp_secret = NULL,
                enabled = 1,
                updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?`
      )
        .bind(tempSecret, session.userId)
        .run();

      return json({ ok: true, enabled: true }, { headers });
    }

    if (url.pathname === "/api/auth/2fa/disable" && request.method === "POST") {
      const session = await requireAuth(request, env);
      if (!session) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      const body = await parseJson(request);
      const code = String(body.code || "").trim();
      const twoFactor = await getTwoFactorState(env, session.userId);

      if (!twoFactor || Number(twoFactor.enabled) !== 1 || !twoFactor.secret) {
        return json({ error: "Two-factor authentication is not enabled" }, { status: 400, headers });
      }

      const valid = await verifyTotp(String(twoFactor.secret), code);
      if (!valid) {
        return json({ error: "Invalid verification code" }, { status: 400, headers });
      }

      await env.DB.prepare(
        `UPDATE user_2fa
            SET enabled = 0,
                secret = NULL,
                temp_secret = NULL,
                updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?`
      )
        .bind(session.userId)
        .run();

      return json({ ok: true, enabled: false }, { headers });
    }

    if (url.pathname === "/api/wallet" && request.method === "PUT") {
      const session = await requireAuth(request, env);
      if (!session) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      const body = await parseJson(request);
      const encryptedWallet = String(body.encryptedWallet || "");
      const walletType = String(body.walletType || "seed");

      if (!encryptedWallet || encryptedWallet.length < 20) {
        return json({ error: "Encrypted wallet payload is required" }, { status: 400, headers });
      }

      await env.DB.prepare(
        `INSERT INTO cloud_wallets (user_id, encrypted_wallet, wallet_type, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           encrypted_wallet = excluded.encrypted_wallet,
           wallet_type = excluded.wallet_type,
           updated_at = CURRENT_TIMESTAMP`
      )
        .bind(session.userId, encryptedWallet, walletType)
        .run();

      return json({ ok: true }, { headers });
    }

    if (url.pathname === "/api/wallet" && request.method === "GET") {
      const session = await requireAuth(request, env);
      if (!session) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      const wallet = await env.DB.prepare(
        "SELECT encrypted_wallet, wallet_type, updated_at FROM cloud_wallets WHERE user_id = ?"
      )
        .bind(session.userId)
        .first() as { encrypted_wallet: string; wallet_type: string; updated_at: string } | null;

      if (!wallet) {
        return json({ hasWallet: false }, { headers });
      }

      return json(
        {
          hasWallet: true,
          encryptedWallet: wallet.encrypted_wallet,
          walletType: wallet.wallet_type,
          updatedAt: wallet.updated_at,
        },
        { headers }
      );
    }

    if (url.pathname === "/api/profile/settings" && request.method === "GET") {
      const session = await requireAuth(request, env);
      if (!session) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      const profile = await env.DB.prepare("SELECT settings_json, updated_at FROM cloud_profiles WHERE user_id = ?")
        .bind(session.userId)
        .first() as { settings_json: string | null; updated_at: string } | null;

      if (!profile || !profile.settings_json) {
        return json({ hasSettings: false }, { headers });
      }

      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(profile.settings_json);
      } catch {
        parsed = {};
      }

      return json({ hasSettings: true, settings: parsed, updatedAt: profile.updated_at }, { headers });
    }

    if (url.pathname === "/api/profile/settings" && request.method === "PUT") {
      const session = await requireAuth(request, env);
      if (!session) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      const body = await parseJson(request);
      const settings = (body.settings && typeof body.settings === "object")
        ? (body.settings as Record<string, unknown>)
        : {};

      const existingProfile = await env.DB.prepare("SELECT settings_json FROM cloud_profiles WHERE user_id = ?")
        .bind(session.userId)
        .first() as { settings_json: string | null } | null;

      let merged: Record<string, unknown> = {};
      if (existingProfile?.settings_json) {
        try {
          merged = JSON.parse(existingProfile.settings_json);
        } catch {
          merged = {};
        }
      }

      if (Object.prototype.hasOwnProperty.call(settings, "serverName")) {
        merged.serverName = String(settings.serverName || "");
      }
      if (Object.prototype.hasOwnProperty.call(settings, "serverAPI")) {
        merged.serverAPI = settings.serverAPI == null ? null : String(settings.serverAPI);
      }
      if (Object.prototype.hasOwnProperty.call(settings, "serverWS")) {
        merged.serverWS = settings.serverWS == null ? null : String(settings.serverWS);
      }
      if (Object.prototype.hasOwnProperty.call(settings, "serverAuth")) {
        merged.serverAuth = settings.serverAuth == null ? null : String(settings.serverAuth);
      }
      if (Object.prototype.hasOwnProperty.call(settings, "navCardBackground")) {
        if (settings.navCardBackground == null || String(settings.navCardBackground).trim() === "") {
          merged.navCardBackground = null;
        } else {
          const navCardBackground = String(settings.navCardBackground);
          if (!navCardBackground.startsWith("data:image/")) {
            return json({ error: "Invalid image format" }, { status: 400, headers });
          }
          if (navCardBackground.length > 700000) {
            return json({ error: "Image is too large" }, { status: 400, headers });
          }
          merged.navCardBackground = navCardBackground;
        }
      }

      await env.DB.prepare(
        `INSERT INTO cloud_profiles (user_id, settings_json, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           settings_json = excluded.settings_json,
           updated_at = CURRENT_TIMESTAMP`
      )
        .bind(session.userId, JSON.stringify(merged))
        .run();

      return json({ ok: true }, { headers });
    }

    if (url.pathname === "/api/api-keys" && request.method === "POST") {
      const session = await requireAuth(request, env);
      if (!session) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      const body = await parseJson(request);
      const name = String(body.name || "").trim() || "Default Key";
      const rawApiKey = `npk_${randomHex(24)}`;
      const keyHash = await sha256Hex(rawApiKey);
      const keyPrefix = rawApiKey.slice(0, 12);
      const keyId = randomHex(16);

      await env.DB.prepare(
        `INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(keyId, session.userId, name, keyPrefix, keyHash)
        .run();

      return json(
        {
          id: keyId,
          name,
          keyPrefix,
          apiKey: rawApiKey,
        },
        { headers }
      );
    }

    if (url.pathname === "/api/api-keys" && request.method === "GET") {
      const session = await requireAuth(request, env);
      if (!session) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      const keys = await env.DB.prepare(
        `SELECT id, name, key_prefix, created_at, last_used_at, revoked_at
           FROM api_keys
          WHERE user_id = ?
          ORDER BY created_at DESC`
      )
        .bind(session.userId)
        .all() as {
          results: Array<{
            id: string;
            name: string;
            key_prefix: string;
            created_at: string;
            last_used_at: string | null;
            revoked_at: string | null;
          }>;
        };

      return json(
        {
          keys: (keys.results || []).map((key) => ({
            id: key.id,
            name: key.name,
            keyPrefix: key.key_prefix,
            createdAt: key.created_at,
            lastUsedAt: key.last_used_at,
            revokedAt: key.revoked_at,
          })),
        },
        { headers }
      );
    }

    if (url.pathname.startsWith("/api/api-keys/") && request.method === "DELETE") {
      const session = await requireAuth(request, env);
      if (!session) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      const keyId = url.pathname.replace("/api/api-keys/", "").trim();
      if (!keyId) {
        return json({ error: "Invalid key id" }, { status: 400, headers });
      }

      await env.DB.prepare(
        `UPDATE api_keys
            SET revoked_at = CURRENT_TIMESTAMP
          WHERE id = ?
            AND user_id = ?
            AND revoked_at IS NULL`
      )
        .bind(keyId, session.userId)
        .run();

      return json({ ok: true }, { headers });
    }

    if (url.pathname === "/api/programmatic/profile" && request.method === "GET") {
      const apiSession = await requireApiKeyAuth(request, env);
      if (!apiSession) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      const wallet = await env.DB.prepare("SELECT user_id FROM cloud_wallets WHERE user_id = ?")
        .bind(apiSession.userId)
        .first();

      return json(
        {
          email: apiSession.email,
          hasWallet: !!wallet,
        },
        { headers }
      );
    }

    if (url.pathname === "/api/programmatic/wallet" && request.method === "GET") {
      const apiSession = await requireApiKeyAuth(request, env);
      if (!apiSession) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      const wallet = await env.DB.prepare(
        "SELECT encrypted_wallet, wallet_type, updated_at FROM cloud_wallets WHERE user_id = ?"
      )
        .bind(apiSession.userId)
        .first() as { encrypted_wallet: string; wallet_type: string; updated_at: string } | null;

      if (!wallet) {
        return json({ hasWallet: false }, { headers });
      }

      return json(
        {
          hasWallet: true,
          encryptedWallet: wallet.encrypted_wallet,
          walletType: wallet.wallet_type,
          updatedAt: wallet.updated_at,
        },
        { headers }
      );
    }

    if (url.pathname === "/api/programmatic/accounts/create" && request.method === "POST") {
      const apiSession = await requireApiKeyAuth(request, env);
      if (!apiSession) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      try {
        const body = await parseJson(request);
        const walletPassword = String(body.walletPassword || "");
        const requestedIndexRaw = body.accountIndex;
        const requestedIndex = requestedIndexRaw == null ? null : Number(requestedIndexRaw);
        const accountIndex = requestedIndex == null
          ? await getNextProgrammaticAccountIndex(env, apiSession.userId)
          : requestedIndex;

        if (!isValidAccountIndex(accountIndex)) {
          return json({ error: "accountIndex must be a non-negative integer" }, { status: 400, headers });
        }

        const seed = await decryptProgrammaticSeed(env, apiSession.userId, walletPassword);
        const accountData = deriveAccountFromSeed(seed, accountIndex);

        await storeProgrammaticAccount(env, apiSession.userId, accountIndex, accountData.account);

        const accountInfo = await rpcCall(env, {
          action: "account_info",
          account: accountData.account,
          representative: true,
          pending: true,
        });

        return json(
          {
            accountIndex,
            account: accountData.account,
            publicKey: accountData.publicKey,
            opened: !!accountInfo?.frontier,
            balanceRaw: String(accountInfo?.balance || "0"),
          },
          { headers }
        );
      } catch (err: any) {
        return json({ error: err?.message || "Failed to create account" }, { status: 400, headers });
      }
    }

    if (url.pathname === "/api/programmatic/receive" && request.method === "POST") {
      const apiSession = await requireApiKeyAuth(request, env);
      if (!apiSession) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      try {
        const body = await parseJson(request);
        const walletPassword = String(body.walletPassword || "");
        const accountIndex = Number(body.accountIndex || 0);
        const maxReceives = Number(body.maxReceives || 20);

        const accountData = await getProgrammaticWallet(env, apiSession.userId, walletPassword, accountIndex);
        const accountInfo = await rpcCall(env, {
          action: "account_info",
          account: accountData.account,
          representative: true,
          pending: true,
        });

        const pendingResponse = await rpcCall(env, {
          action: "accounts_pending",
          accounts: [accountData.account],
          count: String(maxReceives),
          source: "true",
          sorting: "true",
        });

        const pendingMap = pendingResponse?.blocks?.[accountData.account] || {};
        const pendingEntries = Object.entries(pendingMap) as Array<[string, { amount: string }]>;

        if (!pendingEntries.length) {
          return json({ received: 0, account: accountData.account, hashes: [] }, { headers });
        }

        let currentFrontier = accountInfo?.frontier || ZERO_HASH;
        let currentBalanceRaw = String(accountInfo?.balance || "0");
        const representative = accountInfo?.representative || DEFAULT_REPRESENTATIVE;
        const processed: string[] = [];

        for (const [pendingHash, pendingInfo] of pendingEntries) {
          const workHash = currentFrontier === ZERO_HASH ? accountData.publicKey : currentFrontier;
          const workResponse = await rpcCall(env, { action: "work_generate", hash: workHash });
          if (!workResponse?.work) {
            throw new Error("Failed to generate work for receive block");
          }

          const signedBlock = block.receive(
            {
              walletBalanceRaw: currentBalanceRaw,
              amountRaw: String(pendingInfo.amount),
              toAddress: accountData.account,
              representativeAddress: representative,
              transactionHash: pendingHash,
              frontier: currentFrontier,
              work: workResponse.work,
            },
            accountData.privateKey
          );

          const subtype = currentFrontier === ZERO_HASH ? "open" : "receive";
          const processResponse = await rpcCall(env, {
            action: "process",
            json_block: "true",
            subtype,
            block: signedBlock,
          });

          if (!processResponse?.hash) {
            throw new Error(processResponse?.error || "Failed to process receive block");
          }

          currentFrontier = processResponse.hash;
          currentBalanceRaw = (BigInt(currentBalanceRaw) + BigInt(String(pendingInfo.amount))).toString();
          processed.push(processResponse.hash);
        }

        return json(
          {
            received: processed.length,
            account: accountData.account,
            hashes: processed,
            balanceRaw: currentBalanceRaw,
          },
          { headers }
        );
      } catch (err: any) {
        return json({ error: err?.message || "Failed to receive transactions" }, { status: 400, headers });
      }
    }

    if (url.pathname === "/api/programmatic/send" && request.method === "POST") {
      const apiSession = await requireApiKeyAuth(request, env);
      if (!apiSession) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      try {
        const body = await parseJson(request);
        const walletPassword = String(body.walletPassword || "");
        const accountIndex = Number(body.accountIndex || 0);
        const to = String(body.to || "").trim();
        const amountNano = String(body.amountNano || "").trim();

        if (!to || !amountNano) {
          return json({ error: "to and amountNano are required" }, { status: 400, headers });
        }

        const destination = await resolveNanoAddress(env, to, "to");
        const accountData = await getProgrammaticWallet(env, apiSession.userId, walletPassword, accountIndex);
        const fromInfo = await rpcCall(env, {
          action: "account_info",
          account: accountData.account,
          representative: true,
        });

        if (!fromInfo?.frontier) {
          throw new Error("Account must be opened first (receive funds before sending)");
        }

        const amountRaw = tools.convert(amountNano, "NANO", "RAW");
        if (BigInt(String(fromInfo.balance)) < BigInt(String(amountRaw))) {
          throw new Error("Insufficient balance");
        }

        const workResponse = await rpcCall(env, { action: "work_generate", hash: fromInfo.frontier });
        if (!workResponse?.work) {
          throw new Error("Failed to generate work for send block");
        }

        const signedBlock = block.send(
          {
            walletBalanceRaw: String(fromInfo.balance),
            amountRaw: String(amountRaw),
            fromAddress: accountData.account,
            toAddress: destination,
            representativeAddress: fromInfo.representative || DEFAULT_REPRESENTATIVE,
            frontier: fromInfo.frontier,
            work: workResponse.work,
          },
          accountData.privateKey
        );

        const processResponse = await rpcCall(env, {
          action: "process",
          json_block: "true",
          subtype: "send",
          block: signedBlock,
        });

        if (!processResponse?.hash) {
          throw new Error(processResponse?.error || "Failed to process send block");
        }

        return json(
          {
            hash: processResponse.hash,
            from: accountData.account,
            to: destination,
            amountRaw: String(amountRaw),
            amountNano,
          },
          { headers }
        );
      } catch (err: any) {
        return json({ error: err?.message || "Failed to send transaction" }, { status: 400, headers });
      }
    }

    if (url.pathname === "/api/programmatic/change-representative" && request.method === "POST") {
      const apiSession = await requireApiKeyAuth(request, env);
      if (!apiSession) {
        return json({ error: "Unauthorized" }, { status: 401, headers });
      }

      try {
        const body = await parseJson(request);
        const walletPassword = String(body.walletPassword || "");
        const accountIndex = Number(body.accountIndex || 0);
        const representativeInput = String(body.representative || "").trim();

        if (!representativeInput) {
          return json({ error: "representative is required" }, { status: 400, headers });
        }

        const representativeAddress = await resolveNanoAddress(env, representativeInput, "representative");
        const accountData = await getProgrammaticWallet(env, apiSession.userId, walletPassword, accountIndex);
        const fromInfo = await rpcCall(env, {
          action: "account_info",
          account: accountData.account,
          representative: true,
        });

        if (!fromInfo?.frontier) {
          throw new Error("Account must be opened first before changing representative");
        }

        if (String(fromInfo.representative || "") === representativeAddress) {
          return json(
            {
              hash: null,
              account: accountData.account,
              representative: representativeAddress,
              alreadySet: true,
            },
            { headers }
          );
        }

        const workResponse = await rpcCall(env, { action: "work_generate", hash: fromInfo.frontier });
        if (!workResponse?.work) {
          throw new Error("Failed to generate work for representative change block");
        }

        const signedBlock = block.representative(
          {
            address: accountData.account,
            walletBalanceRaw: String(fromInfo.balance),
            representativeAddress,
            frontier: fromInfo.frontier,
            work: workResponse.work,
          },
          accountData.privateKey
        );

        const processResponse = await rpcCall(env, {
          action: "process",
          json_block: "true",
          subtype: "change",
          block: signedBlock,
        });

        if (!processResponse?.hash) {
          throw new Error(processResponse?.error || "Failed to process representative change block");
        }

        return json(
          {
            hash: processResponse.hash,
            account: accountData.account,
            representative: representativeAddress,
            alreadySet: false,
          },
          { headers }
        );
      } catch (err: any) {
        return json({ error: err?.message || "Failed to change representative" }, { status: 400, headers });
      }
    }

  return json({ error: "Not found" }, { status: 404, headers });
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  return handleRequest(context.request, context.env);
}
