/**
 * RSCP - Road Safety Certification Protocol
 * Core Library
 *
 * A privacy-preserving, zero-trust protocol for road safety certifications.
 *
 * @remarks
 * Key Features:
 * - Registry stores ONLY public attributes (name, level, validity dates)
 * - Private data (email, phone, scores) stays with the issuer
 * - Protocol-enforced privacy - impossible to breach what you don't store
 * - Supports B2B (company issuers) and B2C (platform issuer)
 *
 * @example
 * ```typescript
 * import {
 *   generateCertificateNumber,
 *   generateVerificationCode,
 *   enforcePublicAttributesOnly,
 *   createSignedCredential,
 * } from '@rscp/core';
 *
 * // Generate certificate number
 * const certNumber = generateCertificateNumber({
 *   year: 2026,
 *   level: 'gold',
 *   country: 'IN',
 *   issuerCode: 'SWG',
 *   serial: 1,
 * });
 * // Returns: 'RS-2026-G-IN-SWG-000001-7'
 *
 * // Generate verification code
 * const verificationCode = generateVerificationCode();
 * // Returns: 'A3B7K9M2'
 *
 * // Enforce public attributes only (zero-trust)
 * const publicAttrs = enforcePublicAttributesOnly({
 *   givenName: 'Ravi',
 *   familyName: 'Kumar',
 *   level: 'gold',
 *   validFrom: '2026-01-01',
 *   validUntil: '2028-01-01',
 *   // email: 'ravi@example.com', // Would throw ProtocolViolationError!
 * });
 * ```
 *
 * @packageDocumentation
 * @module @rscp/core
 */

// =============================================================================
// VERSION
// =============================================================================

/**
 * SDK version.
 */
export const VERSION = '1.0.0-alpha.1';

/**
 * Protocol version.
 */
export const PROTOCOL_VERSION = '1.0';

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  // Core types
  CertificationLevel,
  CredentialStatus,
  IssuerType,
  IssuerStatus,
  CertificationChannel,
  PaidBy,

  // Field types
  AllowedPublicField,
  ForbiddenField,

  // Attribute types
  RSCPPublicAttributes,
  RSCPPrivateAttributes,

  // Issuer types
  RSCPIssuer,

  // Credential types
  RSCPCredential,
  RSCPSignedCredential,
  RSCPRegistryRecord,

  // Verification types
  RSCPVerificationResult,
  RSCPErrorCode,

  // API types
  RegisterCredentialInput,
  RegisterCredentialResult,
  RevokeCredentialInput,

  // Utility types
  CertificateNumberParts,
  CredentialIdParts,
} from './types/index.js';

// Type constants
export { ALLOWED_PUBLIC_FIELDS, FORBIDDEN_FIELDS } from './types/index.js';

// =============================================================================
// CHECK DIGIT EXPORTS
// =============================================================================

export {
  // ISO 7064 (for certificate numbers)
  calculateISO7064Check,
  verifyISO7064,
  validateISO7064Full,

  // Damm (for verification codes)
  calculateDammCheck,
  verifyDamm,
  validateDammFull,

  // Utilities
  cleanCode,
  isValidAlphabetChar,
  getVerificationCodeAlphabet,
  getISO7064Alphabet,
} from './check-digits/index.js';

// =============================================================================
// IDENTIFIER EXPORTS
// =============================================================================

export type { GenerateCertificateNumberOptions } from './identifiers/index.js';

export {
  // Certificate numbers
  generateCertificateNumber,
  parseCertificateNumber,
  validateCertificateNumber,
  formatCertificateNumber,

  // Verification codes
  generateVerificationCode,
  formatVerificationCode,
  validateVerificationCode,
  parseVerificationCode,

  // Credential IDs
  generateCredentialId,
  parseCredentialId,

  // DIDs
  generateIssuerDid,
  parseIssuerDid,
  generateHolderDid,
  parseHolderDid,

  // Convenience
  generateAllIdentifiers,
  getVerificationUrl,
} from './identifiers/index.js';

// =============================================================================
// PROTOCOL ENFORCEMENT EXPORTS
// =============================================================================

export {
  // Error types
  ProtocolViolationError,
  MissingAttributeError,
  AttributeValidationError,

  // Field checking
  isForbiddenField,
  isAllowedField,
  detectForbiddenFields,
  detectUnknownFields,

  // Main enforcement
  enforcePublicAttributesOnly,
  extractPublicAttributes,
  validateRegistryInput,

  // Logging
  logProtocolViolation,
  sanitizeForLogging,
} from './protocol/index.js';

// =============================================================================
// CRYPTO EXPORTS
// =============================================================================

export type {
  SignaturePayload,
  SignedCredential,
  SignatureVerificationResult,
} from './crypto/index.js';

export {
  // Random generation
  getRandomBytes,
  getSecureRandomInt,
  getRandomString,

  // Key management
  generateSigningKey,
  generateKeyPair,
  isValidSigningKey,

  // Signing
  signPayload,
  verifySignature,
  createSignedCredential,
  verifySignedCredential,

  // Hashing
  generateCredentialHash,
  verifyCredentialHash,

  // Utilities
  bytesToHex,
  hexToBytes,
  bytesToBase64,
  base64ToBytes,
  timingSafeEqual,
  createPayloadForVerification,
} from './crypto/index.js';

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export {
  // Date utilities
  getExpiryDate,
  isExpired,
  daysUntilExpiry,
  getTodayISO,

  // Name utilities
  formatFullName,
  normalizeName,

  // Level utilities
  compareLevels,
  meetsLevelRequirement,
  getLevelDisplayName,
  getLevelTrainingHours,
  getLevelMinScore,
  getLevelValidityYears,

  // Validation utilities
  isValidCountryCode,
  isValidIssuerCode,
  isValidEmail,
  isValidPhone,

  // Scoring utilities
  determineLevelFromScores,
} from './utils/index.js';

// =============================================================================
// CONVENIENCE BUILDER
// =============================================================================

import type { RSCPPublicAttributes, CertificationLevel } from './types/index.js';
import { generateAllIdentifiers } from './identifiers/index.js';
import { enforcePublicAttributesOnly } from './protocol/index.js';
import { getExpiryDate, getTodayISO } from './utils/index.js';

/**
 * RSCP credential builder for convenient credential creation.
 *
 * @example
 * ```typescript
 * const credential = RSCP.credential()
 *   .issuer('SWG', 'IN')
 *   .holder('Rahul', 'Kumar')
 *   .level('gold')
 *   .validFor({ years: 2 })
 *   .serial(1)
 *   .build();
 * ```
 */
export const RSCP = {
  /**
   * Create a new credential builder.
   */
  credential(): RSCPCredentialBuilder {
    return new RSCPCredentialBuilder();
  },

  /**
   * Protocol version.
   */
  version: PROTOCOL_VERSION,
};

/**
 * Credential builder for fluent API.
 */
class RSCPCredentialBuilder {
  private _issuerCode?: string;
  private _country?: string;
  private _givenName?: string;
  private _familyName?: string;
  private _level?: CertificationLevel;
  private _validFrom?: string;
  private _validUntil?: string;
  private _serial?: number;
  private _year?: number;

  /**
   * Set the issuer.
   */
  issuer(code: string, country: string): this {
    this._issuerCode = code.toUpperCase();
    this._country = country.toUpperCase();
    return this;
  }

  /**
   * Set the credential holder.
   */
  holder(givenName: string, familyName: string): this {
    this._givenName = givenName;
    this._familyName = familyName;
    return this;
  }

  /**
   * Set the certification level.
   */
  level(level: CertificationLevel): this {
    this._level = level;
    return this;
  }

  /**
   * Set validity period from today.
   */
  validFor(period: { years: number }): this {
    this._validFrom = getTodayISO();
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + period.years);
    this._validUntil = expiry.toISOString().split('T')[0]!;
    return this;
  }

  /**
   * Set explicit validity dates.
   */
  validDates(from: string, until: string): this {
    this._validFrom = from;
    this._validUntil = until;
    return this;
  }

  /**
   * Set the serial number.
   */
  serial(serial: number): this {
    this._serial = serial;
    return this;
  }

  /**
   * Set the year (default: current year).
   */
  year(year: number): this {
    this._year = year;
    return this;
  }

  /**
   * Build the credential with identifiers.
   */
  build(): {
    publicAttributes: RSCPPublicAttributes;
    identifiers: ReturnType<typeof generateAllIdentifiers>;
    issuerCode: string;
  } {
    if (!this._issuerCode) throw new Error('Issuer code is required');
    if (!this._country) throw new Error('Country is required');
    if (!this._givenName) throw new Error('Given name is required');
    if (!this._familyName) throw new Error('Family name is required');
    if (!this._level) throw new Error('Level is required');
    if (!this._serial) throw new Error('Serial number is required');

    const year = this._year ?? new Date().getFullYear();
    const validFrom = this._validFrom ?? getTodayISO();
    const validUntil = this._validUntil ?? getExpiryDate(this._level);

    const publicAttributes = enforcePublicAttributesOnly({
      givenName: this._givenName,
      familyName: this._familyName,
      level: this._level,
      validFrom,
      validUntil,
    });

    const identifiers = generateAllIdentifiers({
      year,
      level: this._level,
      country: this._country,
      issuerCode: this._issuerCode,
      serial: this._serial,
    });

    return {
      publicAttributes,
      identifiers,
      issuerCode: this._issuerCode,
    };
  }
}
