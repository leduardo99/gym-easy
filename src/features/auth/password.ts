import { hash, verify } from "@node-rs/argon2";

/**
 * OWASP minimum: argon2id (algorithm 2), 19 MiB, 2 iterations, parallelism 1.
 * The numeric value avoids the ambient const enum, which isolatedModules rejects.
 */
export const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
} as const;

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(passwordHash: string, password: string): Promise<boolean>;
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return verify(passwordHash, password);
}

export const argon2Hasher: PasswordHasher = {
  hash: hashPassword,
  verify: verifyPassword,
};

let dummyHash: Promise<string> | undefined;

/** Precomputed-on-demand hash so unknown emails still pay one argon2 verify. */
export function getDummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword("dummy-timing-pad");
  return dummyHash;
}
