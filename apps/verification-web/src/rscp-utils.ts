/**
 * RSCP Verification Utilities
 *
 * Client-side validation for RSCP certificates.
 * These are inlined from @rscp/core for web bundle simplicity.
 */

// =============================================================================
// TYPES
// =============================================================================

export type CertificationLevel = 'bronze' | 'silver' | 'gold';

export interface CertificateNumberParts {
  full: string;
  year: number;
  levelCode: string;
  level: CertificationLevel;
  country: string;
  issuerCode: string;
  serial: number;
  checkDigit: string;
}

export interface VerificationResult {
  valid: boolean;
  certificateValid: boolean;
  codeValid: boolean;
  expired: boolean;
  parsed: CertificateNumberParts | null;
  qrData: QRCodeData | null;
  errors: string[];
}

export interface QRCodeData {
  url?: string;
  cert: string;
  code: string;
  name?: string;
  level?: CertificationLevel;
  validUntil?: string;
}

// =============================================================================
// ISO 7064 CHECK DIGIT (Certificate Numbers)
// =============================================================================

const ISO7064_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function calculateISO7064Check(input: string): string {
  const upperInput = input.toUpperCase();
  let remainder = 10;

  for (const char of upperInput) {
    const index = ISO7064_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid character '${char}'`);
    }
    remainder = ((remainder + index) % 10 || 10) * 2 % 11;
  }

  const checkValue = (11 - remainder) % 10;
  return checkValue === 10 ? 'X' : checkValue.toString();
}

function verifyISO7064(input: string, checkDigit: string): boolean {
  try {
    return calculateISO7064Check(input) === checkDigit.toUpperCase();
  } catch {
    return false;
  }
}

// =============================================================================
// DAMM CHECK DIGIT (Verification Codes)
// =============================================================================

const DAMM_TABLE: number[][] = [
  [0, 3, 1, 7, 5, 9, 8, 6, 4, 2],
  [7, 0, 9, 2, 1, 5, 4, 8, 6, 3],
  [4, 2, 0, 6, 8, 7, 1, 3, 5, 9],
  [1, 7, 5, 0, 9, 8, 3, 4, 2, 6],
  [6, 1, 2, 3, 0, 4, 5, 9, 7, 8],
  [3, 6, 7, 4, 2, 0, 9, 5, 8, 1],
  [5, 8, 6, 9, 7, 2, 0, 1, 3, 4],
  [8, 9, 4, 5, 3, 6, 2, 0, 1, 7],
  [9, 4, 3, 8, 6, 1, 7, 2, 0, 5],
  [2, 5, 8, 1, 4, 3, 6, 7, 9, 0],
];

const VERIFICATION_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function charToDigit(char: string): number {
  const upperChar = char.toUpperCase();
  const index = VERIFICATION_CODE_ALPHABET.indexOf(upperChar);
  if (index === -1) {
    throw new Error(`Invalid character '${char}'`);
  }
  return index % 10;
}

function validateDammFull(fullString: string): boolean {
  if (fullString.length < 2) return false;

  try {
    const upperInput = fullString.toUpperCase();
    let interim = 0;

    for (const char of upperInput) {
      const digit = charToDigit(char);
      interim = DAMM_TABLE[interim]![digit]!;
    }

    return interim === 0;
  } catch {
    return false;
  }
}

// =============================================================================
// CERTIFICATE NUMBER PARSING
// =============================================================================

const CODE_TO_LEVEL: Record<string, CertificationLevel> = {
  B: 'bronze',
  S: 'silver',
  G: 'gold',
};

export function parseCertificateNumber(certNumber: string): CertificateNumberParts | null {
  const pattern = /^RS-(\d{4})-([BSG])-([A-Z]{2})-([A-Z]{3})-(\d{6})-([0-9X])$/i;
  const match = certNumber.toUpperCase().match(pattern);

  if (!match) return null;

  const [, yearStr, levelCode, country, issuerCode, serialStr, checkDigit] = match;

  const level = CODE_TO_LEVEL[levelCode!];
  if (!level) return null;

  return {
    full: certNumber.toUpperCase(),
    year: parseInt(yearStr!, 10),
    levelCode: levelCode!,
    level,
    country: country!,
    issuerCode: issuerCode!,
    serial: parseInt(serialStr!, 10),
    checkDigit: checkDigit!,
  };
}

export function validateCertificateNumber(certNumber: string): boolean {
  const parsed = parseCertificateNumber(certNumber);
  if (!parsed) return false;

  // Extract input without check digit for verification
  const withoutCheck = certNumber.toUpperCase().replace(/-/g, '').slice(0, -1);
  return verifyISO7064(withoutCheck, parsed.checkDigit);
}

// =============================================================================
// VERIFICATION CODE VALIDATION
// =============================================================================

export function validateVerificationCode(code: string): boolean {
  const clean = code.replace(/[-\s]/g, '').toUpperCase();
  if (clean.length !== 8) return false;
  return validateDammFull(clean);
}

export function formatVerificationCode(code: string): string {
  const clean = code.replace(/[-\s]/g, '').toUpperCase();
  if (clean.length !== 8) return code.toUpperCase();
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}

// =============================================================================
// EXPIRY CHECK
// =============================================================================

export function isExpired(validUntil: string): boolean {
  const expiryDate = new Date(validUntil);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiryDate < today;
}

export function daysUntilExpiry(validUntil: string): number {
  const expiryDate = new Date(validUntil);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// =============================================================================
// QR CODE DATA PARSING
// =============================================================================

export function parseQRData(data: string): QRCodeData | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed.cert && parsed.code) {
      return parsed as QRCodeData;
    }
    return null;
  } catch {
    return null;
  }
}

// =============================================================================
// MAIN VERIFICATION FUNCTION
// =============================================================================

export function verifyCertificate(
  certificateNumber: string,
  verificationCode: string,
  qrDataString?: string
): VerificationResult {
  const errors: string[] = [];

  // Parse QR data if provided
  const qrData = qrDataString ? parseQRData(qrDataString) : null;

  // Validate certificate number format
  const certificateValid = validateCertificateNumber(certificateNumber);
  if (!certificateValid) {
    errors.push('Invalid certificate number format or check digit');
  }

  // Parse certificate number
  const parsed = parseCertificateNumber(certificateNumber);
  if (!parsed && certificateValid) {
    errors.push('Could not parse certificate number');
  }

  // Validate verification code
  const codeValid = validateVerificationCode(verificationCode);
  if (!codeValid) {
    errors.push('Invalid verification code format or check digit');
  }

  // Check expiry (if we have validity date from QR)
  let expired = false;
  if (qrData?.validUntil) {
    expired = isExpired(qrData.validUntil);
    if (expired) {
      errors.push('Certificate has expired');
    }
  }

  const valid = certificateValid && codeValid && !expired;

  return {
    valid,
    certificateValid,
    codeValid,
    expired,
    parsed,
    qrData,
    errors,
  };
}

// =============================================================================
// LEVEL DISPLAY HELPERS
// =============================================================================

export function getLevelDisplayName(level: CertificationLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function getLevelColor(level: CertificationLevel): {
  bg: string;
  text: string;
  gradient: string;
} {
  switch (level) {
    case 'gold':
      return {
        bg: 'bg-yellow-500',
        text: 'text-yellow-900',
        gradient: 'from-yellow-400 to-yellow-600',
      };
    case 'silver':
      return {
        bg: 'bg-gray-400',
        text: 'text-gray-900',
        gradient: 'from-gray-300 to-gray-500',
      };
    case 'bronze':
      return {
        bg: 'bg-orange-500',
        text: 'text-orange-900',
        gradient: 'from-orange-400 to-orange-700',
      };
  }
}
