/**
 * RSCP - Road Safety Certification Protocol
 * Core Type Definitions
 *
 * @module @rscp/core/types
 */

// =============================================================================
// CERTIFICATION LEVELS
// =============================================================================

/**
 * Road safety certification levels.
 *
 * - `bronze`: Basic safety training (2 hours, ≥70% score, 1 year validity)
 * - `silver`: Intermediate with hazard perception (4 hours, ≥80% score, 1 year validity)
 * - `gold`: Advanced with practical assessment (8 hours, ≥85% score, 2 years validity)
 */
export type CertificationLevel = 'bronze' | 'silver' | 'gold';

/**
 * Credential status in the registry.
 */
export type CredentialStatus = 'active' | 'revoked' | 'suspended' | 'expired';

/**
 * Type of issuing organization.
 */
export type IssuerType = 'company' | 'platform' | 'government' | 'partner';

/**
 * Issuer account status.
 */
export type IssuerStatus = 'active' | 'suspended' | 'revoked' | 'pending';

// =============================================================================
// CERTIFICATION CHANNELS
// =============================================================================

/**
 * How the certification was acquired (B2B vs B2C tracking).
 */
export type CertificationChannel =
  | 'b2b_company' // Company enrolled and paid
  | 'b2b_company_rider' // Company enrolled, rider paid
  | 'b2c_self' // Rider self-enrolled and paid
  | 'b2c_insurance' // Insurance partner referral
  | 'b2c_government' // Government program (free/subsidized)
  | 'b2c_scholarship'; // Sponsored/scholarship

/**
 * Who paid for the certification.
 */
export type PaidBy = 'company' | 'rider' | 'partner' | 'government' | 'free';

// =============================================================================
// PROTOCOL CONSTANTS - CRITICAL FOR ZERO-TRUST ARCHITECTURE
// =============================================================================

/**
 * Fields that ARE allowed in the public registry.
 * These are the ONLY fields that can be stored by the registry operator.
 *
 * @remarks
 * This is the foundation of RSCP's zero-trust architecture.
 * The registry literally cannot store private data because
 * the schema only has these 5 columns.
 */
export const ALLOWED_PUBLIC_FIELDS = [
  'givenName',
  'familyName',
  'level',
  'validFrom',
  'validUntil',
] as const;

export type AllowedPublicField = (typeof ALLOWED_PUBLIC_FIELDS)[number];

/**
 * Fields that are FORBIDDEN in the public registry.
 * Any attempt to store these will throw a ProtocolViolationError.
 *
 * @remarks
 * This list is intentionally extensive to prevent accidental PII leakage.
 * Adding a field here is a breaking change and requires RFC approval.
 */
export const FORBIDDEN_FIELDS = [
  // Personal identifiers
  'email',
  'phone',
  'mobile',
  'address',
  'dateOfBirth',
  'dob',
  'birthDate',
  'gender',
  'sex',
  'age',

  // Government IDs
  'aadhaarNumber',
  'aadhaar',
  'panNumber',
  'pan',
  'passport',
  'passportNumber',
  'drivingLicense',
  'licenseNumber',
  'socialSecurityNumber',
  'ssn',
  'nationalId',
  'voterId',

  // Assessment data
  'testScore',
  'score',
  'hazardScore',
  'practicalScore',
  'theoryScore',
  'grade',
  'marks',

  // Financial data
  'bankAccount',
  'accountNumber',
  'ifsc',
  'upi',
  'creditCard',
  'salary',
  'income',

  // Internal identifiers
  'internalRiderId',
  'riderId',
  'internalId',
  'externalId',
  'employeeId',
  'staffId',

  // Location data
  'location',
  'gps',
  'coordinates',
  'homeAddress',
  'workAddress',

  // Biometric data
  'photo',
  'photograph',
  'fingerprint',
  'biometric',
  'faceId',
] as const;

export type ForbiddenField = (typeof FORBIDDEN_FIELDS)[number];

// =============================================================================
// PUBLIC ATTRIBUTES (Stored in Registry)
// =============================================================================

/**
 * Public attributes that ARE stored in the RSCP registry.
 * These are the ONLY fields visible to the registry operator.
 *
 * @remarks
 * Companies keep full data in their own systems.
 * The registry only sees these 5 fields.
 */
export interface RSCPPublicAttributes {
  /** First name / given name */
  givenName: string;

  /** Last name / family name */
  familyName: string;

  /** Certification level achieved */
  level: CertificationLevel;

  /** Start date of validity (ISO 8601: YYYY-MM-DD) */
  validFrom: string;

  /** End date of validity (ISO 8601: YYYY-MM-DD) */
  validUntil: string;
}

// =============================================================================
// PRIVATE ATTRIBUTES (Stored by Issuer Only)
// =============================================================================

/**
 * Private attributes that are NEVER stored in the registry.
 * Only the issuing company has access to these.
 *
 * @remarks
 * This interface is for type safety in issuer applications.
 * None of these fields ever leave the issuer's database.
 */
export interface RSCPPrivateAttributes {
  /** Email address */
  email?: string;

  /** Phone number */
  phone?: string;

  /** Theory/written test score (0-100) */
  testScore?: number;

  /** Hazard perception score (0-100) */
  hazardScore?: number;

  /** Practical driving score (0-100) */
  practicalScore?: number;

  /** Internal rider/driver ID in issuer's system */
  internalRiderId?: string;

  /** Home or registered address */
  address?: string;

  /** Additional custom fields */
  [key: string]: unknown;
}

// =============================================================================
// ISSUER TYPES
// =============================================================================

/**
 * Trusted issuer in the RSCP network.
 */
export interface RSCPIssuer {
  /** Unique identifier */
  id: string;

  /** 3-character issuer code (e.g., 'SWG', 'ZMT', 'UBR') */
  code: string;

  /** DID of the issuer (e.g., 'did:rscp:issuer:swg') */
  did: string;

  /** Type of issuing organization */
  type: IssuerType;

  /** Display name */
  name: string;

  /** ISO 3166-1 alpha-2 country code */
  country: string;

  /** Public key for signature verification (base64) */
  publicKey: string;

  /** Current status */
  status: IssuerStatus;

  /** Registration timestamp */
  registeredAt: string;
}

// =============================================================================
// CREDENTIAL TYPES
// =============================================================================

/**
 * Full credential including both public and private data.
 * Only stored by the issuing company, never by the registry.
 */
export interface RSCPCredential {
  /** Unique credential ID (e.g., 'urn:rscp:credential:swg:2026:000001') */
  credentialId: string;

  /** Human-readable certificate number (e.g., 'RS-2026-G-IN-SWG-000001-7') */
  certificateNumber: string;

  /** Short verification code (e.g., 'ABCD-1234') */
  verificationCode: string;

  /** Public attributes (safe for registry) */
  publicAttributes: RSCPPublicAttributes;

  /** Private attributes (issuer-only) */
  privateAttributes: RSCPPrivateAttributes;

  /** Issuing organization code */
  issuerCode: string;

  /** Issuance timestamp (ISO 8601) */
  issuedAt: string;

  /** Current status */
  status: CredentialStatus;
}

/**
 * Signed credential ready for registration.
 */
export interface RSCPSignedCredential extends RSCPCredential {
  /** Cryptographic signature (base64) */
  signature: string;

  /** Hash of the credential for integrity verification */
  credentialHash: string;

  /** Timestamp when signature was created */
  signedAt: string;
}

/**
 * Registry record (public attributes only).
 * This is what the registry stores and returns.
 */
export interface RSCPRegistryRecord {
  /** Registry-assigned ID */
  id: string;

  /** Credential ID */
  credentialId: string;

  /** Certificate number */
  certificateNumber: string;

  /** Verification code */
  verificationCode: string;

  /** Public attributes ONLY */
  publicAttributes: RSCPPublicAttributes;

  /** Issuer code */
  issuerCode: string;

  /** Issuer's signature */
  signature: string;

  /** Credential hash */
  credentialHash: string;

  /** Current status */
  status: CredentialStatus;

  /** Issuance timestamp */
  issuedAt: string;

  /** Revocation timestamp (if revoked) */
  revokedAt?: string;

  /** Revocation reason (if revoked) */
  revocationReason?: string;
}

// =============================================================================
// VERIFICATION TYPES
// =============================================================================

/**
 * Result of verifying a credential.
 * Returns ONLY public information.
 */
export interface RSCPVerificationResult {
  /** Whether the credential is valid */
  valid: boolean;

  /** Credential details (only if valid) */
  credential?: {
    /** Certificate number */
    certificateNumber: string;

    /** Full name (given + family) */
    name: string;

    /** Certification level */
    level: CertificationLevel;

    /** Expiry date */
    validUntil: string;

    /** Issuing organization */
    issuer: {
      code: string;
      name: string;
    };
  };

  /** Whether the cryptographic signature is valid */
  signatureValid?: boolean;

  /** Error message (if not valid) */
  error?: string;

  /** Error code for programmatic handling */
  errorCode?: RSCPErrorCode;
}

/**
 * Standard error codes for RSCP operations.
 */
export type RSCPErrorCode =
  | 'INVALID_FORMAT'
  | 'NOT_FOUND'
  | 'EXPIRED'
  | 'REVOKED'
  | 'SUSPENDED'
  | 'INVALID_SIGNATURE'
  | 'ISSUER_NOT_FOUND'
  | 'ISSUER_INACTIVE'
  | 'PROTOCOL_VIOLATION'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

// =============================================================================
// API TYPES
// =============================================================================

/**
 * Input for registering a credential.
 */
export interface RegisterCredentialInput {
  /** Public attributes ONLY */
  publicAttributes: RSCPPublicAttributes;

  /** Issuer code */
  issuerCode: string;

  /** Signature from issuer */
  signature: string;

  /** Link to issuer's internal certification ID (optional) */
  internalCertificationId?: string;
}

/**
 * Result of registering a credential.
 */
export interface RegisterCredentialResult {
  /** Whether registration succeeded */
  success: boolean;

  /** Generated identifiers (if successful) */
  credential?: {
    credentialId: string;
    certificateNumber: string;
    verificationCode: string;
    registryId: string;
  };

  /** Error message (if failed) */
  error?: string;

  /** Error code (if failed) */
  errorCode?: RSCPErrorCode;
}

/**
 * Input for revoking a credential.
 */
export interface RevokeCredentialInput {
  /** Credential ID or verification code */
  credentialId?: string;
  verificationCode?: string;

  /** Issuer code (for authorization) */
  issuerCode: string;

  /** Reason for revocation */
  reason: string;

  /** Signature proving issuer authorization */
  signature: string;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Certificate number components.
 */
export interface CertificateNumberParts {
  /** 4-digit year */
  year: number;

  /** Certification level */
  level: CertificationLevel;

  /** Single-character level code (B/S/G) */
  levelCode: string;

  /** ISO 3166-1 alpha-2 country code */
  country: string;

  /** 3-character issuer code */
  issuerCode: string;

  /** Serial number */
  serial: number;

  /** ISO 7064 check digit */
  checkDigit: string;
}

/**
 * Credential ID components.
 */
export interface CredentialIdParts {
  /** Issuer code */
  issuerCode: string;

  /** Year of issuance */
  year: number;

  /** Serial number */
  serial: number;
}
