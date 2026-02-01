/**
 * RSCP - Road Safety Certification Protocol
 * Protocol Enforcement
 *
 * This module enforces the zero-trust architecture.
 * The registry CANNOT store private data - this is enforced at the code level.
 *
 * Key principle: If the schema doesn't have a column for it, you can't breach it.
 *
 * @module @rscp/core/protocol
 */

import {
  ALLOWED_PUBLIC_FIELDS,
  FORBIDDEN_FIELDS,
  type AllowedPublicField,
  type ForbiddenField,
  type RSCPPublicAttributes,
  type CertificationLevel,
} from '../types/index.js';

// =============================================================================
// CUSTOM ERROR TYPES
// =============================================================================

/**
 * Error thrown when attempting to violate the RSCP protocol.
 * This is a CRITICAL security error - any attempt to store private
 * data in the registry is a protocol violation.
 */
export class ProtocolViolationError extends Error {
  public readonly field: string;
  public readonly code: string = 'PROTOCOL_VIOLATION';

  constructor(field: string, message?: string) {
    const defaultMessage =
      `PROTOCOL VIOLATION: Cannot store "${field}" in the public registry. ` +
      `This field contains private data and must remain with the issuer. ` +
      `Only allowed fields: ${ALLOWED_PUBLIC_FIELDS.join(', ')}.`;

    super(message ?? defaultMessage);
    this.name = 'ProtocolViolationError';
    this.field = field;

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProtocolViolationError);
    }
  }
}

/**
 * Error thrown when required public attributes are missing.
 */
export class MissingAttributeError extends Error {
  public readonly field: string;
  public readonly code: string = 'MISSING_ATTRIBUTE';

  constructor(field: string) {
    super(`Missing required public attribute: "${field}".`);
    this.name = 'MissingAttributeError';
    this.field = field;
  }
}

/**
 * Error thrown when attribute validation fails.
 */
export class AttributeValidationError extends Error {
  public readonly field: string;
  public readonly code: string = 'INVALID_ATTRIBUTE';

  constructor(field: string, message: string) {
    super(`Invalid attribute "${field}": ${message}`);
    this.name = 'AttributeValidationError';
    this.field = field;
  }
}

// =============================================================================
// FIELD CHECKING FUNCTIONS
// =============================================================================

/**
 * Check if a field is forbidden from the registry.
 *
 * @param field - Field name to check
 * @returns True if the field is forbidden
 */
export function isForbiddenField(field: string): field is ForbiddenField {
  const lowerField = field.toLowerCase();
  return FORBIDDEN_FIELDS.some((f) => f.toLowerCase() === lowerField);
}

/**
 * Check if a field is allowed in the registry.
 *
 * @param field - Field name to check
 * @returns True if the field is allowed
 */
export function isAllowedField(field: string): field is AllowedPublicField {
  return ALLOWED_PUBLIC_FIELDS.includes(field as AllowedPublicField);
}

/**
 * Detect any forbidden fields in an object.
 * This is the CORE security check.
 *
 * @param data - Object to scan for forbidden fields
 * @returns Array of forbidden field names found
 */
export function detectForbiddenFields(data: Record<string, unknown>): string[] {
  const forbidden: string[] = [];

  // Check top-level keys
  for (const key of Object.keys(data)) {
    if (isForbiddenField(key)) {
      forbidden.push(key);
    }
  }

  // Also check nested 'publicAttributes' if present
  if (data['publicAttributes'] && typeof data['publicAttributes'] === 'object') {
    for (const key of Object.keys(data['publicAttributes'] as object)) {
      if (isForbiddenField(key)) {
        forbidden.push(`publicAttributes.${key}`);
      }
    }
  }

  // Check nested 'attributes' if present
  if (data['attributes'] && typeof data['attributes'] === 'object') {
    for (const key of Object.keys(data['attributes'] as object)) {
      if (isForbiddenField(key)) {
        forbidden.push(`attributes.${key}`);
      }
    }
  }

  return forbidden;
}

/**
 * Detect any unknown fields that are not in the allowed list.
 *
 * @param data - Object to scan
 * @returns Array of unknown field names
 */
export function detectUnknownFields(data: Record<string, unknown>): string[] {
  const unknown: string[] = [];

  for (const key of Object.keys(data)) {
    if (!isAllowedField(key) && !isForbiddenField(key)) {
      unknown.push(key);
    }
  }

  return unknown;
}

// =============================================================================
// ATTRIBUTE VALIDATION
// =============================================================================

/**
 * Validate certification level.
 */
function validateLevel(level: unknown): level is CertificationLevel {
  return level === 'bronze' || level === 'silver' || level === 'gold';
}

/**
 * Validate ISO 8601 date string.
 */
function validateISODate(date: unknown): date is string {
  if (typeof date !== 'string') {
    return false;
  }

  // Check ISO 8601 format (YYYY-MM-DD or full ISO datetime)
  const isoDatePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  if (!isoDatePattern.test(date)) {
    return false;
  }

  // Check if it's a valid date
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

/**
 * Validate a name (given or family).
 * Supports international Unicode names.
 */
function validateName(name: unknown): name is string {
  if (typeof name !== 'string') {
    return false;
  }

  // Length check (in Unicode code points)
  const codePoints = [...name].length;
  if (codePoints < 1 || codePoints > 100) {
    return false;
  }

  // Block control characters
  const controlPattern = /[\u0000-\u001F\u007F-\u009F]/;
  if (controlPattern.test(name)) {
    return false;
  }

  // Block HTML tags (basic XSS prevention)
  if (/<[^>]*>/.test(name)) {
    return false;
  }

  // Block pure whitespace
  if (name.trim().length === 0) {
    return false;
  }

  return true;
}

// =============================================================================
// MAIN ENFORCEMENT FUNCTIONS
// =============================================================================

/**
 * Enforce public attributes only - the CORE protocol enforcement function.
 *
 * This function:
 * 1. Rejects ANY forbidden fields (throws ProtocolViolationError)
 * 2. Validates all required public fields are present
 * 3. Validates field formats
 * 4. Returns a clean RSCPPublicAttributes object
 *
 * @param data - Raw data that may contain forbidden fields
 * @returns Clean RSCPPublicAttributes with only allowed fields
 * @throws ProtocolViolationError if forbidden fields are present
 * @throws MissingAttributeError if required fields are missing
 * @throws AttributeValidationError if field validation fails
 *
 * @example
 * ```typescript
 * // This will THROW because email is forbidden
 * enforcePublicAttributesOnly({
 *   givenName: 'Ravi',
 *   familyName: 'Kumar',
 *   email: 'ravi@example.com', // FORBIDDEN!
 * });
 *
 * // This will succeed
 * enforcePublicAttributesOnly({
 *   givenName: 'Ravi',
 *   familyName: 'Kumar',
 *   level: 'gold',
 *   validFrom: '2026-01-01',
 *   validUntil: '2027-01-01',
 * });
 * ```
 */
export function enforcePublicAttributesOnly(
  data: Record<string, unknown>
): RSCPPublicAttributes {
  // STEP 1: Check for forbidden fields (CRITICAL SECURITY CHECK)
  const forbidden = detectForbiddenFields(data);
  if (forbidden.length > 0) {
    throw new ProtocolViolationError(
      forbidden[0]!,
      `PROTOCOL VIOLATION: Cannot store the following fields in the registry: ${forbidden.join(', ')}. ` +
        `These fields contain private data and must remain with the issuer.`
    );
  }

  // STEP 2: Check for required fields
  const { givenName, familyName, level, validFrom, validUntil } = data;

  if (givenName === undefined || givenName === null) {
    throw new MissingAttributeError('givenName');
  }
  if (familyName === undefined || familyName === null) {
    throw new MissingAttributeError('familyName');
  }
  if (level === undefined || level === null) {
    throw new MissingAttributeError('level');
  }
  if (validFrom === undefined || validFrom === null) {
    throw new MissingAttributeError('validFrom');
  }
  if (validUntil === undefined || validUntil === null) {
    throw new MissingAttributeError('validUntil');
  }

  // STEP 3: Validate field formats
  if (!validateName(givenName)) {
    throw new AttributeValidationError(
      'givenName',
      'Must be a string between 1-100 characters without control characters or HTML'
    );
  }
  if (!validateName(familyName)) {
    throw new AttributeValidationError(
      'familyName',
      'Must be a string between 1-100 characters without control characters or HTML'
    );
  }
  if (!validateLevel(level)) {
    throw new AttributeValidationError('level', 'Must be "bronze", "silver", or "gold"');
  }
  if (!validateISODate(validFrom)) {
    throw new AttributeValidationError('validFrom', 'Must be a valid ISO 8601 date (YYYY-MM-DD)');
  }
  if (!validateISODate(validUntil)) {
    throw new AttributeValidationError('validUntil', 'Must be a valid ISO 8601 date (YYYY-MM-DD)');
  }

  // STEP 4: Validate date range
  const fromDate = new Date(validFrom as string);
  const untilDate = new Date(validUntil as string);
  if (untilDate <= fromDate) {
    throw new AttributeValidationError('validUntil', 'Must be after validFrom date');
  }

  // STEP 5: Return clean object with ONLY allowed fields
  return {
    givenName: givenName as string,
    familyName: familyName as string,
    level: level as CertificationLevel,
    validFrom: validFrom as string,
    validUntil: validUntil as string,
  };
}

/**
 * Extract only public attributes from a full credential.
 * This is safe to send to the registry.
 *
 * @param credential - Full credential with private attributes
 * @returns Only public attributes
 */
export function extractPublicAttributes(credential: {
  publicAttributes?: RSCPPublicAttributes;
  givenName?: string;
  familyName?: string;
  level?: CertificationLevel;
  validFrom?: string;
  validUntil?: string;
}): RSCPPublicAttributes {
  // If publicAttributes is already separated, use it
  if (credential.publicAttributes) {
    return enforcePublicAttributesOnly(credential.publicAttributes as unknown as Record<string, unknown>);
  }

  // Otherwise extract from flat structure
  return enforcePublicAttributesOnly({
    givenName: credential.givenName,
    familyName: credential.familyName,
    level: credential.level,
    validFrom: credential.validFrom,
    validUntil: credential.validUntil,
  });
}

/**
 * Validate a registry record input.
 * Ensures only public attributes are included.
 *
 * @param input - The full input object
 * @returns Validated input with clean public attributes
 */
export function validateRegistryInput(input: {
  publicAttributes: Record<string, unknown>;
  issuerCode: string;
  signature?: string;
  internalCertificationId?: string;
}): {
  publicAttributes: RSCPPublicAttributes;
  issuerCode: string;
  signature?: string;
  internalCertificationId?: string;
} {
  // Validate issuer code
  if (!input.issuerCode || !/^[A-Z]{3}$/i.test(input.issuerCode)) {
    throw new AttributeValidationError('issuerCode', 'Must be a 3-character code');
  }

  // Enforce public attributes
  const publicAttributes = enforcePublicAttributesOnly(input.publicAttributes);

  const result: {
    publicAttributes: RSCPPublicAttributes;
    issuerCode: string;
    signature?: string;
    internalCertificationId?: string;
  } = {
    publicAttributes,
    issuerCode: input.issuerCode.toUpperCase(),
  };

  if (input.signature !== undefined) {
    result.signature = input.signature;
  }
  if (input.internalCertificationId !== undefined) {
    result.internalCertificationId = input.internalCertificationId;
  }

  return result;
}

// =============================================================================
// LOGGING AND AUDIT
// =============================================================================

/**
 * Log a protocol violation attempt for security audit.
 * Override this function to send to your security monitoring system.
 *
 * @param violation - Details of the violation attempt
 */
export function logProtocolViolation(violation: {
  field: string;
  issuerCode?: string;
  timestamp: Date;
  sourceIp?: string;
  details?: string;
}): void {
  // Default implementation logs to console
  // In production, override this to send to SIEM
  console.error('[RSCP SECURITY] Protocol violation attempt:', {
    ...violation,
    timestamp: violation.timestamp.toISOString(),
    severity: 'CRITICAL',
  });
}

/**
 * Create a sanitized version of data for logging.
 * Removes any potentially sensitive values.
 *
 * @param data - Data to sanitize
 * @returns Sanitized data safe for logging
 */
export function sanitizeForLogging(data: Record<string, unknown>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    if (isForbiddenField(key)) {
      sanitized[key] = '[REDACTED - FORBIDDEN FIELD]';
    } else if (typeof value === 'string' && value.length > 50) {
      sanitized[key] = value.substring(0, 50) + '...';
    } else {
      sanitized[key] = String(value);
    }
  }

  return sanitized;
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

export { ALLOWED_PUBLIC_FIELDS, FORBIDDEN_FIELDS } from '../types/index.js';
