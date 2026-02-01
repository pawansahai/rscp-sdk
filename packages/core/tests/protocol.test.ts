import { describe, it, expect } from 'vitest';
import {
  enforcePublicAttributesOnly,
  extractPublicAttributes,
  isForbiddenField,
  isAllowedField,
  detectForbiddenFields,
  ProtocolViolationError,
  MissingAttributeError,
  AttributeValidationError,
  ALLOWED_PUBLIC_FIELDS,
  FORBIDDEN_FIELDS,
} from '../src/protocol/index.js';

describe('Protocol Enforcement', () => {
  const validPublicAttributes = {
    givenName: 'Rahul',
    familyName: 'Kumar',
    level: 'gold' as const,
    validFrom: '2026-01-15',
    validUntil: '2028-01-15',
  };

  describe('enforcePublicAttributesOnly', () => {
    it('accepts valid public attributes', () => {
      const result = enforcePublicAttributesOnly(validPublicAttributes);

      expect(result).toEqual(validPublicAttributes);
    });

    it('throws ProtocolViolationError for forbidden fields', () => {
      expect(() =>
        enforcePublicAttributesOnly({
          ...validPublicAttributes,
          email: 'rahul@example.com',
        })
      ).toThrow(ProtocolViolationError);
    });

    it('throws for all forbidden fields', () => {
      const forbiddenFieldsToTest = [
        'email',
        'phone',
        'testScore',
        'hazardScore',
        'address',
        'bankAccount',
        'aadhaarNumber',
        'drivingLicense',
        'dateOfBirth',
      ];

      for (const field of forbiddenFieldsToTest) {
        expect(() =>
          enforcePublicAttributesOnly({
            ...validPublicAttributes,
            [field]: 'test value',
          })
        ).toThrow(ProtocolViolationError);
      }
    });

    it('throws MissingAttributeError for missing fields', () => {
      const { givenName, ...withoutGivenName } = validPublicAttributes;
      expect(() => enforcePublicAttributesOnly(withoutGivenName)).toThrow(MissingAttributeError);

      const { familyName, ...withoutFamilyName } = validPublicAttributes;
      expect(() => enforcePublicAttributesOnly(withoutFamilyName)).toThrow(MissingAttributeError);

      const { level, ...withoutLevel } = validPublicAttributes;
      expect(() => enforcePublicAttributesOnly(withoutLevel)).toThrow(MissingAttributeError);
    });

    it('throws AttributeValidationError for invalid level', () => {
      expect(() =>
        enforcePublicAttributesOnly({
          ...validPublicAttributes,
          level: 'platinum',
        })
      ).toThrow(AttributeValidationError);
    });

    it('throws AttributeValidationError for invalid date format', () => {
      expect(() =>
        enforcePublicAttributesOnly({
          ...validPublicAttributes,
          validFrom: '15-01-2026', // Wrong format
        })
      ).toThrow(AttributeValidationError);
    });

    it('throws AttributeValidationError when validUntil <= validFrom', () => {
      expect(() =>
        enforcePublicAttributesOnly({
          ...validPublicAttributes,
          validFrom: '2028-01-15',
          validUntil: '2026-01-15', // Before validFrom
        })
      ).toThrow(AttributeValidationError);
    });

    it('validates name length', () => {
      expect(() =>
        enforcePublicAttributesOnly({
          ...validPublicAttributes,
          givenName: '', // Too short
        })
      ).toThrow(AttributeValidationError);

      expect(() =>
        enforcePublicAttributesOnly({
          ...validPublicAttributes,
          givenName: 'a'.repeat(101), // Too long
        })
      ).toThrow(AttributeValidationError);
    });

    it('rejects names with HTML', () => {
      expect(() =>
        enforcePublicAttributesOnly({
          ...validPublicAttributes,
          givenName: '<script>alert("xss")</script>',
        })
      ).toThrow(AttributeValidationError);
    });

    it('accepts Unicode names', () => {
      const result = enforcePublicAttributesOnly({
        ...validPublicAttributes,
        givenName: 'राहुल', // Hindi
        familyName: 'कुमार',
      });

      expect(result.givenName).toBe('राहुल');
      expect(result.familyName).toBe('कुमार');
    });

    it('accepts names with accents', () => {
      const result = enforcePublicAttributesOnly({
        ...validPublicAttributes,
        givenName: 'José',
        familyName: 'García',
      });

      expect(result.givenName).toBe('José');
    });
  });

  describe('extractPublicAttributes', () => {
    it('extracts from publicAttributes field', () => {
      const result = extractPublicAttributes({
        publicAttributes: validPublicAttributes,
      });

      expect(result).toEqual(validPublicAttributes);
    });

    it('extracts from flat structure', () => {
      const result = extractPublicAttributes(validPublicAttributes);

      expect(result).toEqual(validPublicAttributes);
    });

    it('rejects forbidden fields in nested structure', () => {
      expect(() =>
        extractPublicAttributes({
          publicAttributes: {
            ...validPublicAttributes,
            email: 'test@example.com',
          },
        })
      ).toThrow(ProtocolViolationError);
    });
  });

  describe('isForbiddenField', () => {
    it('returns true for forbidden fields', () => {
      expect(isForbiddenField('email')).toBe(true);
      expect(isForbiddenField('phone')).toBe(true);
      expect(isForbiddenField('testScore')).toBe(true);
    });

    it('returns false for allowed fields', () => {
      expect(isForbiddenField('givenName')).toBe(false);
      expect(isForbiddenField('familyName')).toBe(false);
      expect(isForbiddenField('level')).toBe(false);
    });

    it('is case insensitive', () => {
      expect(isForbiddenField('EMAIL')).toBe(true);
      expect(isForbiddenField('Email')).toBe(true);
    });
  });

  describe('isAllowedField', () => {
    it('returns true for allowed fields', () => {
      for (const field of ALLOWED_PUBLIC_FIELDS) {
        expect(isAllowedField(field)).toBe(true);
      }
    });

    it('returns false for forbidden fields', () => {
      expect(isAllowedField('email')).toBe(false);
      expect(isAllowedField('phone')).toBe(false);
    });
  });

  describe('detectForbiddenFields', () => {
    it('returns empty array for clean data', () => {
      const result = detectForbiddenFields(validPublicAttributes);
      expect(result).toEqual([]);
    });

    it('detects top-level forbidden fields', () => {
      const result = detectForbiddenFields({
        ...validPublicAttributes,
        email: 'test@example.com',
        phone: '+1234567890',
      });

      expect(result).toContain('email');
      expect(result).toContain('phone');
    });

    it('detects nested forbidden fields', () => {
      const result = detectForbiddenFields({
        publicAttributes: {
          ...validPublicAttributes,
          email: 'test@example.com',
        },
      });

      expect(result).toContain('publicAttributes.email');
    });
  });

  describe('Constants', () => {
    it('ALLOWED_PUBLIC_FIELDS has 5 fields', () => {
      expect(ALLOWED_PUBLIC_FIELDS).toHaveLength(5);
      expect(ALLOWED_PUBLIC_FIELDS).toContain('givenName');
      expect(ALLOWED_PUBLIC_FIELDS).toContain('familyName');
      expect(ALLOWED_PUBLIC_FIELDS).toContain('level');
      expect(ALLOWED_PUBLIC_FIELDS).toContain('validFrom');
      expect(ALLOWED_PUBLIC_FIELDS).toContain('validUntil');
    });

    it('FORBIDDEN_FIELDS includes critical PII', () => {
      expect(FORBIDDEN_FIELDS).toContain('email');
      expect(FORBIDDEN_FIELDS).toContain('phone');
      expect(FORBIDDEN_FIELDS).toContain('testScore');
      expect(FORBIDDEN_FIELDS).toContain('hazardScore');
      expect(FORBIDDEN_FIELDS).toContain('aadhaarNumber');
      expect(FORBIDDEN_FIELDS).toContain('drivingLicense');
    });
  });
});
