/**
 * RSCP - Road Safety Certification Protocol
 * Identifier Generation
 *
 * Generates and validates:
 * - Certificate Numbers: RS-{YEAR}-{LEVEL}-{COUNTRY}-{ISSUER}-{SERIAL}-{CHECK}
 * - Verification Codes: 7 random chars + 1 Damm check = 8 chars
 * - Credential IDs: urn:rscp:credential:{issuer}:{year}:{serial}
 * - DIDs: did:rscp:issuer:{code}
 *
 * @module @rscp/core/identifiers
 */

import type { CertificationLevel, CertificateNumberParts, CredentialIdParts } from '../types/index.js';
import {
  calculateISO7064Check,
  verifyISO7064,
  calculateDammCheck,
  validateDammFull,
  cleanCode,
  getVerificationCodeAlphabet,
} from '../check-digits/index.js';
import { getRandomString } from '../crypto/index.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Map certification level to single character code.
 */
const LEVEL_CODES: Record<CertificationLevel, string> = {
  bronze: 'B',
  silver: 'S',
  gold: 'G',
};

/**
 * Reverse map from code to level.
 */
const CODE_TO_LEVEL: Record<string, CertificationLevel> = {
  B: 'bronze',
  S: 'silver',
  G: 'gold',
};

/**
 * Protocol version for URNs.
 * Reserved for future versioned URN formats.
 */
const _PROTOCOL_VERSION = '1';
void _PROTOCOL_VERSION; // Preserve for future use

// =============================================================================
// CERTIFICATE NUMBER
// =============================================================================

/**
 * Options for generating a certificate number.
 */
export interface GenerateCertificateNumberOptions {
  /** 4-digit year (2020-2100) */
  year: number;

  /** Certification level */
  level: CertificationLevel;

  /** ISO 3166-1 alpha-2 country code (e.g., 'IN', 'US', 'DE') */
  country: string;

  /** 3-character issuer code (e.g., 'SWG', 'ZMT', 'UBR') */
  issuerCode: string;

  /** Serial number (1-999999) */
  serial: number;
}

/**
 * Generate an RSCP certificate number.
 *
 * Format: `RS-{YEAR}-{LEVEL}-{COUNTRY}-{ISSUER}-{SERIAL}-{CHECK}`
 *
 * @param options - Generation options
 * @returns Formatted certificate number with check digit
 * @throws Error if any input is invalid
 *
 * @example
 * ```typescript
 * const certNumber = generateCertificateNumber({
 *   year: 2026,
 *   level: 'gold',
 *   country: 'IN',
 *   issuerCode: 'SWG',
 *   serial: 1,
 * });
 * // Returns: 'RS-2026-G-IN-SWG-000001-7'
 * ```
 */
export function generateCertificateNumber(options: GenerateCertificateNumberOptions): string {
  const { year, level, country, issuerCode, serial } = options;

  // Validate year
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new Error(`Invalid year: ${year}. Must be an integer between 2020 and 2100.`);
  }

  // Validate level
  const levelCode = LEVEL_CODES[level];
  if (!levelCode) {
    throw new Error(`Invalid level: ${level}. Must be 'bronze', 'silver', or 'gold'.`);
  }

  // Validate country
  const upperCountry = country.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upperCountry)) {
    throw new Error(`Invalid country code: ${country}. Must be 2 uppercase letters (ISO 3166-1).`);
  }

  // Validate issuer code
  const upperIssuer = issuerCode.toUpperCase();
  if (!/^[A-Z]{3}$/.test(upperIssuer)) {
    throw new Error(`Invalid issuer code: ${issuerCode}. Must be 3 uppercase letters.`);
  }

  // Validate serial
  if (!Number.isInteger(serial) || serial < 1 || serial > 999999) {
    throw new Error(`Invalid serial: ${serial}. Must be an integer between 1 and 999999.`);
  }

  // Build components
  const paddedSerial = serial.toString().padStart(6, '0');

  // Create base string for check digit calculation (no hyphens)
  const base = `RS${year}${levelCode}${upperCountry}${upperIssuer}${paddedSerial}`;
  const checkDigit = calculateISO7064Check(base);

  // Format with hyphens for display
  return `RS-${year}-${levelCode}-${upperCountry}-${upperIssuer}-${paddedSerial}-${checkDigit}`;
}

/**
 * Parse a certificate number into its components.
 *
 * @param certificateNumber - The certificate number to parse
 * @returns Parsed components or null if invalid format
 *
 * @example
 * ```typescript
 * const parts = parseCertificateNumber('RS-2026-G-IN-SWG-000001-7');
 * // Returns: { year: 2026, level: 'gold', country: 'IN', ... }
 * ```
 */
export function parseCertificateNumber(certificateNumber: string): CertificateNumberParts | null {
  // Pattern: RS-YYYY-L-CC-III-SSSSSS-C
  const pattern = /^RS-(\d{4})-([BSG])-([A-Z]{2})-([A-Z]{3})-(\d{6})-([A-Z0-9])$/i;
  const match = certificateNumber.toUpperCase().match(pattern);

  if (!match) {
    return null;
  }

  const [, yearStr, levelCode, country, issuerCode, serialStr, checkDigit] = match;

  if (!yearStr || !levelCode || !country || !issuerCode || !serialStr || !checkDigit) {
    return null;
  }

  const level = CODE_TO_LEVEL[levelCode];
  if (!level) {
    return null;
  }

  return {
    year: parseInt(yearStr, 10),
    level,
    levelCode,
    country,
    issuerCode,
    serial: parseInt(serialStr, 10),
    checkDigit,
  };
}

/**
 * Validate a certificate number including check digit.
 *
 * @param certificateNumber - The certificate number to validate
 * @returns True if valid, false otherwise
 *
 * @example
 * ```typescript
 * validateCertificateNumber('RS-2026-G-IN-SWG-000001-7'); // true
 * validateCertificateNumber('RS-2026-G-IN-SWG-000001-X'); // false
 * ```
 */
export function validateCertificateNumber(certificateNumber: string): boolean {
  const parts = parseCertificateNumber(certificateNumber);
  if (!parts) {
    return false;
  }

  // Reconstruct base string and verify check digit
  const paddedSerial = parts.serial.toString().padStart(6, '0');
  const base = `RS${parts.year}${parts.levelCode}${parts.country}${parts.issuerCode}${paddedSerial}`;

  return verifyISO7064(base, parts.checkDigit);
}

/**
 * Format a certificate number for display.
 * Ensures consistent uppercase and hyphenation.
 *
 * @param certificateNumber - Certificate number in any format
 * @returns Properly formatted certificate number
 */
export function formatCertificateNumber(certificateNumber: string): string {
  const parts = parseCertificateNumber(certificateNumber);
  if (!parts) {
    return certificateNumber.toUpperCase();
  }

  const paddedSerial = parts.serial.toString().padStart(6, '0');
  return `RS-${parts.year}-${parts.levelCode}-${parts.country}-${parts.issuerCode}-${paddedSerial}-${parts.checkDigit}`;
}

// =============================================================================
// VERIFICATION CODE
// =============================================================================

/**
 * Generate a verification code with Damm check digit.
 *
 * Format: 7 random characters + 1 Damm check = 8 characters
 * Display: XXXX-XXXX (with hyphen)
 * Storage: XXXXXXXX (without hyphen)
 *
 * Uses cryptographically secure random generation.
 *
 * @returns 8-character verification code (uppercase)
 *
 * @example
 * ```typescript
 * const code = generateVerificationCode();
 * // Returns: 'A3B7K9M2' (random, with check digit)
 * ```
 */
export function generateVerificationCode(): string {
  const alphabet = getVerificationCodeAlphabet();

  // Generate 7 cryptographically secure random characters
  const base = getRandomString(7, alphabet);

  // Add Damm check digit
  const checkDigit = calculateDammCheck(base);

  return base + checkDigit;
}

/**
 * Format a verification code for display (XXXX-XXXX).
 *
 * @param code - 8-character verification code
 * @returns Formatted code with hyphen
 *
 * @example
 * ```typescript
 * formatVerificationCode('A3B7K9M2');
 * // Returns: 'A3B7-K9M2'
 * ```
 */
export function formatVerificationCode(code: string): string {
  const clean = cleanCode(code);

  if (clean.length !== 8) {
    return code.toUpperCase();
  }

  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}

/**
 * Validate a verification code including Damm check digit.
 *
 * @param code - Verification code (with or without hyphen)
 * @returns True if valid, false otherwise
 *
 * @example
 * ```typescript
 * validateVerificationCode('A3B7-K9M2'); // true or false
 * validateVerificationCode('A3B7K9M2');  // true or false
 * ```
 */
export function validateVerificationCode(code: string): boolean {
  const clean = cleanCode(code);

  if (clean.length !== 8) {
    return false;
  }

  return validateDammFull(clean);
}

/**
 * Extract the base code and check digit from a verification code.
 *
 * @param code - 8-character verification code
 * @returns Object with base and check digit, or null if invalid
 */
export function parseVerificationCode(code: string): { base: string; checkDigit: string } | null {
  const clean = cleanCode(code);

  if (clean.length !== 8) {
    return null;
  }

  return {
    base: clean.slice(0, 7),
    checkDigit: clean.slice(7),
  };
}

// =============================================================================
// CREDENTIAL ID
// =============================================================================

/**
 * Generate a credential ID (URN format).
 *
 * Format: `urn:rscp:credential:{issuer}:{year}:{serial}`
 *
 * @param issuerCode - 3-character issuer code
 * @param year - 4-digit year
 * @param serial - Serial number
 * @returns Credential ID string
 *
 * @example
 * ```typescript
 * generateCredentialId('SWG', 2026, 1);
 * // Returns: 'urn:rscp:credential:swg:2026:000001'
 * ```
 */
export function generateCredentialId(issuerCode: string, year: number, serial: number): string {
  const paddedSerial = serial.toString().padStart(6, '0');
  return `urn:rscp:credential:${issuerCode.toLowerCase()}:${year}:${paddedSerial}`;
}

/**
 * Parse a credential ID into its components.
 *
 * @param credentialId - The credential ID to parse
 * @returns Parsed components or null if invalid
 */
export function parseCredentialId(credentialId: string): CredentialIdParts | null {
  const pattern = /^urn:rscp:credential:([a-z]{3}):(\d{4}):(\d{6})$/;
  const match = credentialId.toLowerCase().match(pattern);

  if (!match) {
    return null;
  }

  const [, issuerCode, yearStr, serialStr] = match;

  if (!issuerCode || !yearStr || !serialStr) {
    return null;
  }

  return {
    issuerCode: issuerCode.toUpperCase(),
    year: parseInt(yearStr, 10),
    serial: parseInt(serialStr, 10),
  };
}

// =============================================================================
// DECENTRALIZED IDENTIFIERS (DIDs)
// =============================================================================

/**
 * Generate an issuer DID.
 *
 * Format: `did:rscp:issuer:{code}`
 *
 * @param issuerCode - 3-character issuer code
 * @returns DID string
 *
 * @example
 * ```typescript
 * generateIssuerDid('SWG');
 * // Returns: 'did:rscp:issuer:swg'
 * ```
 */
export function generateIssuerDid(issuerCode: string): string {
  return `did:rscp:issuer:${issuerCode.toLowerCase()}`;
}

/**
 * Parse an issuer DID to extract the issuer code.
 *
 * @param did - The DID to parse
 * @returns Issuer code (uppercase) or null if invalid
 */
export function parseIssuerDid(did: string): string | null {
  const pattern = /^did:rscp:issuer:([a-z]{3})$/;
  const match = did.toLowerCase().match(pattern);

  return match?.[1]?.toUpperCase() ?? null;
}

/**
 * Generate a holder DID (for credential holders).
 *
 * Format: `did:rscp:holder:{uuid}`
 *
 * @param userId - User's UUID
 * @returns DID string
 *
 * @example
 * ```typescript
 * generateHolderDid('123e4567-e89b-12d3-a456-426614174000');
 * // Returns: 'did:rscp:holder:123e4567-e89b-12d3-a456-426614174000'
 * ```
 */
export function generateHolderDid(userId: string): string {
  return `did:rscp:holder:${userId.toLowerCase()}`;
}

/**
 * Parse a holder DID to extract the user ID.
 *
 * @param did - The DID to parse
 * @returns User ID or null if invalid
 */
export function parseHolderDid(did: string): string | null {
  const pattern =
    /^did:rscp:holder:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
  const match = did.match(pattern);

  return match?.[1] ?? null;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Generate all identifiers for a new credential.
 *
 * @param options - Generation options
 * @returns All identifiers for a credential
 *
 * @example
 * ```typescript
 * const ids = generateAllIdentifiers({
 *   year: 2026,
 *   level: 'gold',
 *   country: 'IN',
 *   issuerCode: 'SWG',
 *   serial: 1,
 * });
 * // Returns:
 * // {
 * //   certificateNumber: 'RS-2026-G-IN-SWG-000001-7',
 * //   verificationCode: 'A3B7K9M2',
 * //   credentialId: 'urn:rscp:credential:swg:2026:000001',
 * //   issuerDid: 'did:rscp:issuer:swg',
 * // }
 * ```
 */
export function generateAllIdentifiers(options: GenerateCertificateNumberOptions): {
  certificateNumber: string;
  verificationCode: string;
  credentialId: string;
  issuerDid: string;
} {
  return {
    certificateNumber: generateCertificateNumber(options),
    verificationCode: generateVerificationCode(),
    credentialId: generateCredentialId(options.issuerCode, options.year, options.serial),
    issuerDid: generateIssuerDid(options.issuerCode),
  };
}

/**
 * Determine verification URL for a credential.
 *
 * @param verificationCode - The verification code
 * @param baseUrl - Base URL for verification (default: https://rscp.org)
 * @returns Full verification URL
 *
 * @example
 * ```typescript
 * getVerificationUrl('A3B7K9M2');
 * // Returns: 'https://rscp.org/v/A3B7K9M2'
 * ```
 */
export function getVerificationUrl(
  verificationCode: string,
  baseUrl: string = 'https://rscp.org'
): string {
  const clean = cleanCode(verificationCode);
  return `${baseUrl}/v/${clean}`;
}
