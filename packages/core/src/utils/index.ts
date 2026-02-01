/**
 * RSCP - Road Safety Certification Protocol
 * Utility Functions
 *
 * @module @rscp/core/utils
 */

import type { CertificationLevel, RSCPPublicAttributes } from '../types/index.js';

// =============================================================================
// DATE UTILITIES
// =============================================================================

/**
 * Get the expiry date for a certification level.
 *
 * - Bronze: 1 year
 * - Silver: 1 year
 * - Gold: 2 years
 *
 * @param level - Certification level
 * @param fromDate - Start date (default: now)
 * @returns ISO 8601 date string (YYYY-MM-DD)
 */
export function getExpiryDate(level: CertificationLevel, fromDate: Date = new Date()): string {
  const date = new Date(fromDate);

  switch (level) {
    case 'bronze':
    case 'silver':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case 'gold':
      date.setFullYear(date.getFullYear() + 2);
      break;
  }

  return date.toISOString().split('T')[0]!;
}

/**
 * Check if a credential is expired.
 *
 * @param validUntil - Expiry date (ISO 8601)
 * @param now - Current date (default: now)
 * @returns True if expired
 */
export function isExpired(validUntil: string, now: Date = new Date()): boolean {
  const expiryDate = new Date(validUntil);
  return expiryDate < now;
}

/**
 * Calculate days until expiry.
 *
 * @param validUntil - Expiry date (ISO 8601)
 * @param now - Current date (default: now)
 * @returns Days remaining (negative if expired)
 */
export function daysUntilExpiry(validUntil: string, now: Date = new Date()): number {
  const expiryDate = new Date(validUntil);
  const diffMs = expiryDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get today's date in ISO format.
 *
 * @returns YYYY-MM-DD
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0]!;
}

// =============================================================================
// NAME UTILITIES
// =============================================================================

/**
 * Format a full name from public attributes.
 *
 * @param attributes - Public attributes with givenName and familyName
 * @returns Full name string
 */
export function formatFullName(attributes: RSCPPublicAttributes): string {
  return `${attributes.givenName} ${attributes.familyName}`.trim();
}

/**
 * Normalize a name for comparison.
 *
 * - Lowercases
 * - Removes extra whitespace
 * - Removes diacritics
 *
 * @param name - Name to normalize
 * @returns Normalized name
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/\s+/g, ' ')
    .trim();
}

// =============================================================================
// LEVEL UTILITIES
// =============================================================================

/**
 * Level hierarchy for comparison.
 */
const LEVEL_ORDER: Record<CertificationLevel, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

/**
 * Compare two certification levels.
 *
 * @param a - First level
 * @param b - Second level
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareLevels(a: CertificationLevel, b: CertificationLevel): number {
  const orderA = LEVEL_ORDER[a];
  const orderB = LEVEL_ORDER[b];

  if (orderA < orderB) return -1;
  if (orderA > orderB) return 1;
  return 0;
}

/**
 * Check if a level meets a minimum requirement.
 *
 * @param actual - Actual level held
 * @param minimum - Minimum required level
 * @returns True if actual >= minimum
 */
export function meetsLevelRequirement(
  actual: CertificationLevel,
  minimum: CertificationLevel
): boolean {
  return compareLevels(actual, minimum) >= 0;
}

/**
 * Get display name for a level.
 *
 * @param level - Certification level
 * @returns Human-readable display name
 */
export function getLevelDisplayName(level: CertificationLevel): string {
  const names: Record<CertificationLevel, string> = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
  };
  return names[level];
}

/**
 * Get the training hours required for a level.
 *
 * @param level - Certification level
 * @returns Required training hours
 */
export function getLevelTrainingHours(level: CertificationLevel): number {
  const hours: Record<CertificationLevel, number> = {
    bronze: 2,
    silver: 4,
    gold: 8,
  };
  return hours[level];
}

/**
 * Get the minimum passing score for a level.
 *
 * @param level - Certification level
 * @returns Minimum score (0-100)
 */
export function getLevelMinScore(level: CertificationLevel): number {
  const scores: Record<CertificationLevel, number> = {
    bronze: 70,
    silver: 80,
    gold: 85,
  };
  return scores[level];
}

/**
 * Get the validity period for a level.
 *
 * @param level - Certification level
 * @returns Validity in years
 */
export function getLevelValidityYears(level: CertificationLevel): number {
  const years: Record<CertificationLevel, number> = {
    bronze: 1,
    silver: 1,
    gold: 2,
  };
  return years[level];
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Check if a string is a valid ISO 3166-1 alpha-2 country code format.
 *
 * @param code - Code to check
 * @returns True if valid format
 */
export function isValidCountryCode(code: string): boolean {
  return /^[A-Z]{2}$/i.test(code);
}

/**
 * Check if a string is a valid issuer code format.
 *
 * @param code - Code to check
 * @returns True if valid format (3 uppercase letters)
 */
export function isValidIssuerCode(code: string): boolean {
  return /^[A-Z]{3}$/i.test(code);
}

/**
 * Check if a string is a valid email format (basic check).
 *
 * @param email - Email to check
 * @returns True if valid format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Check if a string is a valid phone number format (basic check).
 * Accepts international format with +.
 *
 * @param phone - Phone to check
 * @returns True if valid format
 */
export function isValidPhone(phone: string): boolean {
  // Remove spaces and dashes for checking
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^\+?[0-9]{10,15}$/.test(cleaned);
}

// =============================================================================
// SCORING UTILITIES
// =============================================================================

/**
 * Determine certification level from test scores.
 *
 * @param testScore - Theory test score (0-100)
 * @param hazardScore - Hazard perception score (0-100, optional for bronze)
 * @returns Appropriate certification level or null if not passing
 */
export function determineLevelFromScores(
  testScore: number,
  hazardScore?: number
): CertificationLevel | null {
  // Gold: Both scores >= 85
  if (testScore >= 85 && hazardScore !== undefined && hazardScore >= 85) {
    return 'gold';
  }

  // Silver: Both scores >= 80
  if (testScore >= 80 && hazardScore !== undefined && hazardScore >= 80) {
    return 'silver';
  }

  // Bronze: Test score >= 70
  if (testScore >= 70) {
    return 'bronze';
  }

  // Not passing
  return null;
}
