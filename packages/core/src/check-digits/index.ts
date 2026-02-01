/**
 * RSCP - Road Safety Certification Protocol
 * Check Digit Algorithms
 *
 * Implements ISO 7064 MOD 11,10 and Damm algorithm for
 * error detection in certificate numbers and verification codes.
 *
 * @module @rscp/core/check-digits
 */

// =============================================================================
// ISO 7064 MOD 11,10 (Certificate Numbers)
// =============================================================================

/**
 * Character set for ISO 7064 calculations.
 * Includes all alphanumeric characters since certificate numbers contain
 * ISO 3166-1 country codes which may include I and O.
 */
const ISO7064_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Calculate ISO 7064 MOD 11,10 check character.
 *
 * This algorithm provides strong error detection:
 * - Detects all single-character errors
 * - Detects all adjacent transposition errors
 * - Detects most other common errors
 *
 * @param input - The string to calculate check digit for (alphanumeric)
 * @returns Single check character (0-9 or X)
 *
 * @example
 * ```typescript
 * calculateISO7064Check('RS2026GINSWG000001');
 * // Returns: '7'
 * ```
 */
export function calculateISO7064Check(input: string): string {
  const upperInput = input.toUpperCase();
  let remainder = 10;

  for (const char of upperInput) {
    const index = ISO7064_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid character '${char}' in input. Only alphanumeric allowed.`);
    }

    // Map to value: 0-9 stay as is, A-Z map to 10-35 (excluding I, O)
    const value = index;

    // ISO 7064 MOD 11,10 calculation
    remainder = ((remainder + value) % 10 || 10) * 2 % 11;
  }

  // Calculate check digit
  const checkValue = (11 - remainder) % 10;

  // Return as character (0-9, or X for 10)
  return checkValue === 10 ? 'X' : checkValue.toString();
}

/**
 * Verify an ISO 7064 check digit.
 *
 * @param input - The string without check digit
 * @param checkDigit - The check digit to verify
 * @returns True if valid
 *
 * @example
 * ```typescript
 * verifyISO7064('RS2026GINSWG000001', '7');
 * // Returns: true
 * ```
 */
export function verifyISO7064(input: string, checkDigit: string): boolean {
  try {
    const calculated = calculateISO7064Check(input);
    return calculated === checkDigit.toUpperCase();
  } catch {
    return false;
  }
}

/**
 * Validate a complete string with embedded check digit.
 *
 * @param fullString - Complete string with check digit at end
 * @returns True if valid
 *
 * @example
 * ```typescript
 * validateISO7064Full('RS2026GINSWG0000017');
 * // Returns: true
 * ```
 */
export function validateISO7064Full(fullString: string): boolean {
  if (fullString.length < 2) {
    return false;
  }

  const input = fullString.slice(0, -1);
  const checkDigit = fullString.slice(-1);

  return verifyISO7064(input, checkDigit);
}

// =============================================================================
// DAMM ALGORITHM (Verification Codes)
// =============================================================================

/**
 * Damm algorithm quasigroup table.
 * This is a weak totally anti-symmetric quasigroup of order 10.
 *
 * Properties:
 * - Detects all single-digit errors
 * - Detects all adjacent transposition errors
 * - Detects most twin errors (aa → bb)
 * - Self-checking: valid input + check digit gives 0
 */
const DAMM_TABLE: readonly (readonly number[])[] = [
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
] as const;

/**
 * Character set for verification codes.
 * Excludes ambiguous characters: I, O, 0, 1, L
 */
const VERIFICATION_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Convert alphanumeric character to digit for Damm calculation.
 *
 * @param char - Character to convert
 * @returns Digit 0-9
 */
function charToDigit(char: string): number {
  const upperChar = char.toUpperCase();
  const index = VERIFICATION_CODE_ALPHABET.indexOf(upperChar);

  if (index === -1) {
    throw new Error(`Invalid character '${char}' for verification code.`);
  }

  // Map to 0-9 using modulo
  return index % 10;
}

/**
 * Calculate Damm check digit for a string.
 *
 * @param input - The string to calculate check digit for
 * @returns Single check character from VERIFICATION_CODE_ALPHABET
 *
 * @example
 * ```typescript
 * calculateDammCheck('ABCDEFG');
 * // Returns: '4' (or similar from alphabet)
 * ```
 */
export function calculateDammCheck(input: string): string {
  const upperInput = input.toUpperCase();
  let interim = 0;

  for (const char of upperInput) {
    const digit = charToDigit(char);
    const row = DAMM_TABLE[interim];
    if (!row) {
      throw new Error('Invalid interim value in Damm calculation');
    }
    const nextValue = row[digit];
    if (nextValue === undefined) {
      throw new Error('Invalid digit in Damm calculation');
    }
    interim = nextValue;
  }

  // Find character that gives 0 when applied to current interim
  for (let d = 0; d < 10; d++) {
    const row = DAMM_TABLE[interim];
    if (row && row[d] === 0) {
      // Return corresponding character from alphabet
      return VERIFICATION_CODE_ALPHABET[d] ?? '2';
    }
  }

  // Fallback (should never reach here with valid DAMM_TABLE)
  return VERIFICATION_CODE_ALPHABET[0] ?? 'A';
}

/**
 * Verify a Damm check digit.
 *
 * @param input - The string without check digit
 * @param checkDigit - The check digit to verify
 * @returns True if valid
 *
 * @example
 * ```typescript
 * verifyDamm('ABCDEFG', '4');
 * // Returns: true or false
 * ```
 */
export function verifyDamm(input: string, checkDigit: string): boolean {
  try {
    const calculated = calculateDammCheck(input);
    return calculated === checkDigit.toUpperCase();
  } catch {
    return false;
  }
}

/**
 * Validate a complete string with embedded Damm check digit.
 * The Damm algorithm has the property that valid input + check = 0.
 *
 * @param fullString - Complete string with check digit at end
 * @returns True if valid
 *
 * @example
 * ```typescript
 * validateDammFull('ABCDEFG4');
 * // Returns: true or false
 * ```
 */
export function validateDammFull(fullString: string): boolean {
  if (fullString.length < 2) {
    return false;
  }

  try {
    const upperInput = fullString.toUpperCase();
    let interim = 0;

    // Process all characters including check digit
    for (const char of upperInput) {
      const digit = charToDigit(char);
      const row = DAMM_TABLE[interim];
      if (!row) {
        return false;
      }
      const nextValue = row[digit];
      if (nextValue === undefined) {
        return false;
      }
      interim = nextValue;
    }

    // Valid if interim is 0
    return interim === 0;
  } catch {
    return false;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Clean a code by removing common separators.
 *
 * @param code - Code that may contain hyphens or spaces
 * @returns Cleaned uppercase code
 *
 * @example
 * ```typescript
 * cleanCode('ABCD-1234');
 * // Returns: 'ABCD1234'
 * ```
 */
export function cleanCode(code: string): string {
  return code.replace(/[-\s]/g, '').toUpperCase();
}

/**
 * Check if a character is in the verification code alphabet.
 *
 * @param char - Character to check
 * @returns True if valid
 */
export function isValidAlphabetChar(char: string): boolean {
  return VERIFICATION_CODE_ALPHABET.includes(char.toUpperCase());
}

/**
 * Get the verification code alphabet.
 * Useful for generating random codes.
 */
export function getVerificationCodeAlphabet(): string {
  return VERIFICATION_CODE_ALPHABET;
}

/**
 * Get the ISO 7064 alphabet.
 */
export function getISO7064Alphabet(): string {
  return ISO7064_ALPHABET;
}
