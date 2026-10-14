import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { emailSchema } from "./schemas";
import { CONFIRM_EMAIL_MAX_AGE_SECONDS } from "./session-cookie";

const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function encryptionKey(secret: string): Buffer {
  return createHash("sha256").update(`enc:${secret}`).digest();
}

function mac(secret: string, payload: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

function macMatches(expected: Buffer, provided: string): boolean {
  const actual = Buffer.from(provided, "base64url");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** Encrypts the address and signs the ciphertext with HMAC-SHA256. */
export function sealConfirmEmail(
  email: string,
  secret: string,
  now = Date.now(),
): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const plaintext = JSON.stringify({
    email,
    exp: now + CONFIRM_EMAIL_MAX_AGE_SECONDS * 1000,
  });
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const packed = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
    "base64url",
  );
  const signature = mac(secret, `${VERSION}.${packed}`).toString("base64url");
  return `${VERSION}.${packed}.${signature}`;
}

/** Returns the address, or null when the cookie is missing, expired, or altered. */
export function openConfirmEmail(
  value: string,
  secret: string,
  now = Date.now(),
): string | null {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const version = parts[0];
  const packed = parts[1];
  const signature = parts[2];
  if (version !== VERSION || !packed || !signature) return null;
  if (!macMatches(mac(secret, `${version}.${packed}`), signature)) return null;

  try {
    const raw = Buffer.from(packed, "base64url");
    if (raw.length <= IV_BYTES + TAG_BYTES) return null;
    const iv = raw.subarray(0, IV_BYTES);
    const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as { email?: unknown; exp?: unknown };
    if (typeof record.exp !== "number" || !Number.isFinite(record.exp)) {
      return null;
    }
    if (record.exp <= now) return null;
    if (typeof record.email !== "string") return null;
    const email = emailSchema.safeParse(record.email);
    return email.success ? email.data : null;
  } catch {
    return null;
  }
}
