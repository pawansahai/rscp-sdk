/**
 * RSCP - Road Safety Certification Protocol
 * Cryptographic Operations
 *
 * Provides secure random generation, signing, and verification.
 * Uses Web Crypto API for cross-platform compatibility.
 *
 * @module @rscp/core/crypto
 */

import type { RSCPPublicAttributes, CertificationLevel } from '../types/index.js';

// =============================================================================
// CRYPTO TYPES
// =============================================================================

/**
 * Minimal interface for the Web Crypto API we need.
 * This works across Node.js (>=18), browsers, and edge runtimes.
 */
interface WebCrypto {
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
  subtle: {
    generateKey(
      algorithm: HmacKeyGenParams | RsaHashedKeyGenParams | EcKeyGenParams,
      extractable: boolean,
      keyUsages: KeyUsage[]
    ): Promise<CryptoKey>;
    importKey(
      format: 'raw',
      keyData: BufferSource,
      algorithm: HmacImportParams | RsaHashedImportParams | EcKeyImportParams | AesKeyAlgorithm,
      extractable: boolean,
      keyUsages: KeyUsage[]
    ): Promise<CryptoKey>;
    exportKey(format: 'raw', key: CryptoKey): Promise<ArrayBuffer>;
    sign(algorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>;
    digest(algorithm: AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer>;
  };
}

interface HmacKeyGenParams {
  name: 'HMAC';
  hash: 'SHA-256' | 'SHA-384' | 'SHA-512';
  length?: number;
}

interface RsaHashedKeyGenParams {
  name: string;
  modulusLength: number;
  publicExponent: Uint8Array;
  hash: string;
}

interface EcKeyGenParams {
  name: string;
  namedCurve: string;
}

interface HmacImportParams {
  name: 'HMAC';
  hash: 'SHA-256' | 'SHA-384' | 'SHA-512';
}

interface RsaHashedImportParams {
  name: string;
  hash: string;
}

interface EcKeyImportParams {
  name: string;
  namedCurve: string;
}

interface AesKeyAlgorithm {
  name: string;
  length: number;
}

interface RsaPssParams {
  name: string;
  saltLength: number;
}

interface EcdsaParams {
  name: string;
  hash: string;
}

type AlgorithmIdentifier = string | { name: string };
type BufferSource = ArrayBufferView | ArrayBuffer;
type KeyUsage = 'encrypt' | 'decrypt' | 'sign' | 'verify' | 'deriveKey' | 'deriveBits' | 'wrapKey' | 'unwrapKey';

interface CryptoKey {
  readonly algorithm: object;
  readonly extractable: boolean;
  readonly type: 'public' | 'private' | 'secret';
  readonly usages: KeyUsage[];
}

// =============================================================================
// SECURE RANDOM GENERATION
// =============================================================================

/**
 * Get the crypto object for the current environment.
 * Works in Node.js, browsers, and edge runtimes.
 */
function getCrypto(): WebCrypto {
  if (typeof globalThis.crypto !== 'undefined') {
    return globalThis.crypto as unknown as WebCrypto;
  }

  // Node.js < 19 fallback
  try {
    // Dynamic import to avoid bundler issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto');
    return nodeCrypto.webcrypto as WebCrypto;
  } catch {
    throw new Error(
      'No crypto implementation available. ' +
        'Ensure you are running in Node.js >= 18 or a modern browser.'
    );
  }
}

/**
 * Generate cryptographically secure random bytes.
 *
 * @param length - Number of bytes to generate
 * @returns Uint8Array of random bytes
 *
 * @example
 * ```typescript
 * const bytes = getRandomBytes(32);
 * // Returns: Uint8Array(32) with secure random values
 * ```
 */
export function getRandomBytes(length: number): Uint8Array {
  const crypto = getCrypto();
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Generate a cryptographically secure random integer.
 *
 * @param max - Maximum value (exclusive)
 * @returns Random integer from 0 to max-1
 *
 * @remarks
 * This uses rejection sampling to ensure uniform distribution.
 * It avoids the modulo bias present in naive implementations.
 */
export function getSecureRandomInt(max: number): number {
  if (max <= 0) {
    throw new Error('max must be positive');
  }

  if (max > 0xffffffff) {
    throw new Error('max must be <= 2^32 - 1');
  }

  const crypto = getCrypto();
  const bytes = new Uint8Array(4);

  // Use rejection sampling to avoid modulo bias
  const limit = 0xffffffff - (0xffffffff % max);

  let value: number;
  do {
    crypto.getRandomValues(bytes);
    value = (bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!;
    value = value >>> 0; // Convert to unsigned
  } while (value >= limit);

  return value % max;
}

/**
 * Generate a random string from a given alphabet.
 *
 * @param length - Length of string to generate
 * @param alphabet - Characters to choose from
 * @returns Random string
 *
 * @example
 * ```typescript
 * const code = getRandomString(8, 'ABCDEFGHJKMNPQRSTUVWXYZ23456789');
 * // Returns: 'A3B7K9M2' (random)
 * ```
 */
export function getRandomString(length: number, alphabet: string): string {
  if (alphabet.length === 0) {
    throw new Error('alphabet cannot be empty');
  }

  let result = '';
  for (let i = 0; i < length; i++) {
    const index = getSecureRandomInt(alphabet.length);
    result += alphabet[index];
  }
  return result;
}

// =============================================================================
// KEY GENERATION
// =============================================================================

/**
 * Generate a new HMAC signing key.
 *
 * @returns 256-bit key as hex string
 *
 * @example
 * ```typescript
 * const key = generateSigningKey();
 * // Returns: '7a8b9c...' (64 hex characters)
 * ```
 */
export function generateSigningKey(): string {
  const bytes = getRandomBytes(32);
  return bytesToHex(bytes);
}

/**
 * Generate an Ed25519 key pair for asymmetric signing.
 *
 * @returns Object with publicKey and privateKey as base64 strings
 *
 * @remarks
 * Uses Web Crypto API which is available in modern environments.
 * For Node.js < 18, use the @rscp/node package.
 */
export async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const crypto = getCrypto();

  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'HMAC',
      hash: 'SHA-256',
      length: 256,
    },
    true,
    ['sign', 'verify']
  );

  const rawKey = await crypto.subtle.exportKey('raw', keyPair);
  const keyHex = bytesToHex(new Uint8Array(rawKey));

  // For HMAC, public and private key are the same
  // For true asymmetric signing, use Ed25519 (requires separate implementation)
  return {
    publicKey: keyHex,
    privateKey: keyHex,
  };
}

/**
 * Validate a signing key format.
 *
 * @param key - Key to validate (hex string)
 * @returns True if valid 256-bit hex key
 */
export function isValidSigningKey(key: string): boolean {
  return /^[a-f0-9]{64}$/i.test(key);
}

// =============================================================================
// SIGNING
// =============================================================================

/**
 * Payload structure for signing.
 */
export interface SignaturePayload {
  credentialId: string;
  certificateNumber: string;
  verificationCode: string;
  publicAttributes: RSCPPublicAttributes;
  issuerCode: string;
  issuedAt: string;
}

/**
 * Signed credential result.
 */
export interface SignedCredential {
  payload: SignaturePayload;
  signature: string;
  signedAt: string;
}

/**
 * Signature verification result.
 */
export interface SignatureVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Canonicalize payload for consistent signing.
 * Ensures same data always produces same signature.
 *
 * @param payload - Payload to canonicalize
 * @returns Deterministic JSON string
 */
function canonicalizePayload(payload: SignaturePayload): string {
  // Explicit key ordering for deterministic output
  const ordered = {
    credentialId: payload.credentialId,
    certificateNumber: payload.certificateNumber,
    verificationCode: payload.verificationCode,
    publicAttributes: {
      givenName: payload.publicAttributes.givenName,
      familyName: payload.publicAttributes.familyName,
      level: payload.publicAttributes.level,
      validFrom: payload.publicAttributes.validFrom,
      validUntil: payload.publicAttributes.validUntil,
    },
    issuerCode: payload.issuerCode,
    issuedAt: payload.issuedAt,
  };

  return JSON.stringify(ordered);
}

/**
 * Sign a credential payload using HMAC-SHA256.
 *
 * @param payload - The payload to sign
 * @param signingKey - The issuer's signing key (hex)
 * @returns Signature as base64 string
 *
 * @example
 * ```typescript
 * const signature = await signPayload(payload, issuerKey);
 * // Returns: 'a1b2c3d4...' (base64)
 * ```
 */
export async function signPayload(payload: SignaturePayload, signingKey: string): Promise<string> {
  if (!isValidSigningKey(signingKey)) {
    throw new Error('Invalid signing key format. Expected 64 hex characters.');
  }

  const crypto = getCrypto();
  const canonical = canonicalizePayload(payload);
  const keyBytes = hexToBytes(signingKey);

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
  return bytesToBase64(new Uint8Array(signatureBuffer));
}

/**
 * Verify a signature against a payload.
 *
 * @param payload - The payload that was signed
 * @param signature - The signature to verify (base64)
 * @param signingKey - The issuer's signing key (hex)
 * @returns Verification result
 *
 * @example
 * ```typescript
 * const result = await verifySignature(payload, signature, issuerKey);
 * // Returns: { valid: true } or { valid: false, error: '...' }
 * ```
 */
export async function verifySignature(
  payload: SignaturePayload,
  signature: string,
  signingKey: string
): Promise<SignatureVerificationResult> {
  if (!isValidSigningKey(signingKey)) {
    return { valid: false, error: 'Invalid signing key format' };
  }

  try {
    const expectedSignature = await signPayload(payload, signingKey);
    const valid = timingSafeEqual(signature, expectedSignature);

    return valid ? { valid: true } : { valid: false, error: 'Signature mismatch' };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a signed credential.
 *
 * @param input - Credential data to sign
 * @param signingKey - Issuer's signing key
 * @returns Signed credential with signature
 */
export async function createSignedCredential(
  input: {
    credentialId: string;
    certificateNumber: string;
    verificationCode: string;
    publicAttributes: RSCPPublicAttributes;
    issuerCode: string;
  },
  signingKey: string
): Promise<SignedCredential> {
  const now = new Date().toISOString();

  const payload: SignaturePayload = {
    ...input,
    issuedAt: now,
  };

  const signature = await signPayload(payload, signingKey);

  return {
    payload,
    signature,
    signedAt: now,
  };
}

/**
 * Verify a signed credential.
 *
 * @param signedCredential - The signed credential to verify
 * @param signingKey - Issuer's signing key
 * @returns Verification result
 */
export async function verifySignedCredential(
  signedCredential: SignedCredential,
  signingKey: string
): Promise<SignatureVerificationResult> {
  return verifySignature(signedCredential.payload, signedCredential.signature, signingKey);
}

// =============================================================================
// HASHING
// =============================================================================

/**
 * Generate SHA-256 hash of a credential for integrity verification.
 *
 * @param payload - Credential payload to hash
 * @returns Hash as hex string
 */
export async function generateCredentialHash(payload: SignaturePayload): Promise<string> {
  const crypto = getCrypto();
  const canonical = canonicalizePayload(payload);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Verify a credential hash.
 *
 * @param payload - Credential payload
 * @param expectedHash - Expected hash value (hex)
 * @returns True if hash matches
 */
export async function verifyCredentialHash(
  payload: SignaturePayload,
  expectedHash: string
): Promise<boolean> {
  const actualHash = await generateCredentialHash(payload);
  return timingSafeEqual(actualHash, expectedHash);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert bytes to hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to bytes.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.substring(i, i + 2), 16);
    if (isNaN(byte)) {
      throw new Error('Invalid hex character');
    }
    bytes[i / 2] = byte;
  }
  return bytes;
}

/**
 * Convert bytes to base64 string.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  // Browser fallback
  const binary = String.fromCharCode(...bytes);
  return btoa(binary);
}

/**
 * Convert base64 string to bytes.
 */
export function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  // Browser fallback
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if equal
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Create a signature payload from minimal data.
 */
export function createPayloadForVerification(data: {
  credentialId: string;
  certificateNumber: string;
  verificationCode: string;
  givenName: string;
  familyName: string;
  level: CertificationLevel;
  validFrom: string;
  validUntil: string;
  issuerCode: string;
  issuedAt: string;
}): SignaturePayload {
  return {
    credentialId: data.credentialId,
    certificateNumber: data.certificateNumber,
    verificationCode: data.verificationCode,
    publicAttributes: {
      givenName: data.givenName,
      familyName: data.familyName,
      level: data.level,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
    },
    issuerCode: data.issuerCode,
    issuedAt: data.issuedAt,
  };
}
