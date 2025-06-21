import argon2 from 'argon2'

/**
 * Verify a password against a hash.
 *
 * @param digest Argon2 hash of the password
 * @param password Plain text password
 * @returns Whether the password matches the hash
 */
export function verifyPassword(digest: string, password: string) {
  return argon2.verify(digest, password)
}
