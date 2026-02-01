/**
 * RSCP End-to-End Tests
 *
 * These tests validate the complete credential lifecycle:
 * 1. Issuer generates identifiers
 * 2. Issuer creates and signs credential
 * 3. Registry stores only public attributes
 * 4. Verifier validates the credential
 */

import { describe, it, expect } from 'vitest';
import {
  // Identifiers
  generateCertificateNumber,
  generateVerificationCode,
  generateCredentialId,
  generateIssuerDid,
  generateAllIdentifiers,
  parseCertificateNumber,
  validateCertificateNumber,
  validateVerificationCode,
  formatVerificationCode,
  getVerificationUrl,

  // Protocol enforcement
  enforcePublicAttributesOnly,
  extractPublicAttributes,
  ProtocolViolationError,
  MissingAttributeError,
  isForbiddenField,
  isAllowedField,

  // Crypto
  generateSigningKey,
  createSignedCredential,
  verifySignedCredential,
  generateCredentialHash,
  verifyCredentialHash,
  isValidSigningKey,

  // Utilities
  getExpiryDate,
  isExpired,
  daysUntilExpiry,
  formatFullName,
  compareLevels,
  meetsLevelRequirement,
  determineLevelFromScores,

  // Builder
  RSCP,

  // Types
  type RSCPPublicAttributes,
  type CertificationLevel,
} from '../src/index.js';

describe('RSCP End-to-End Tests', () => {
  // Simulated issuer data
  const issuerConfig = {
    code: 'SWG', // Swiggy
    country: 'IN',
    signingKey: '', // Will be generated
  };

  // Simulated rider data (full data - stays with issuer)
  const riderFullData = {
    // Public (goes to registry)
    givenName: 'Rahul',
    familyName: 'Kumar',
    level: 'gold' as CertificationLevel,
    validFrom: '2026-01-15',
    validUntil: '2028-01-15',

    // Private (stays with issuer - NEVER goes to registry)
    email: 'rahul.kumar@example.com',
    phone: '+91-9876543210',
    testScore: 92,
    hazardScore: 88,
    internalRiderId: 'SWG-RDR-12345',
    dateOfBirth: '1995-03-20',
    address: '123 MG Road, Bangalore',
  };

  describe('Complete Credential Issuance Flow', () => {
    it('should complete full issuance workflow', async () => {
      // ========================================
      // STEP 1: Issuer Setup
      // ========================================
      issuerConfig.signingKey = generateSigningKey();
      expect(isValidSigningKey(issuerConfig.signingKey)).toBe(true);
      expect(issuerConfig.signingKey).toHaveLength(64); // 256-bit key in hex

      const issuerDid = generateIssuerDid(issuerConfig.code);
      expect(issuerDid).toBe('did:rscp:issuer:swg');

      // ========================================
      // STEP 2: Generate All Identifiers
      // ========================================
      const serial = 1;
      const year = 2026;

      const identifiers = generateAllIdentifiers({
        year,
        level: riderFullData.level,
        country: issuerConfig.country,
        issuerCode: issuerConfig.code,
        serial,
      });

      // Validate certificate number format
      expect(identifiers.certificateNumber).toMatch(
        /^RS-2026-G-IN-SWG-000001-[0-9X]$/
      );
      expect(validateCertificateNumber(identifiers.certificateNumber)).toBe(true);

      // Parse certificate number
      const parsed = parseCertificateNumber(identifiers.certificateNumber);
      expect(parsed).not.toBeNull();
      expect(parsed?.year).toBe(2026);
      expect(parsed?.level).toBe('gold');
      expect(parsed?.country).toBe('IN');
      expect(parsed?.issuerCode).toBe('SWG');
      expect(parsed?.serial).toBe(1);

      // Validate verification code
      expect(identifiers.verificationCode).toHaveLength(8);
      expect(validateVerificationCode(identifiers.verificationCode)).toBe(true);

      // Validate credential ID
      expect(identifiers.credentialId).toBe('urn:rscp:credential:swg:2026:000001');

      // ========================================
      // STEP 3: Enforce Public Attributes Only
      // ========================================
      // This is the CRITICAL security step - only public data goes to registry

      // Attempt to send forbidden fields should THROW
      expect(() => {
        enforcePublicAttributesOnly({
          givenName: riderFullData.givenName,
          familyName: riderFullData.familyName,
          level: riderFullData.level,
          validFrom: riderFullData.validFrom,
          validUntil: riderFullData.validUntil,
          email: riderFullData.email, // FORBIDDEN!
        });
      }).toThrow(ProtocolViolationError);

      // Correct usage - only public fields
      const publicAttributes = enforcePublicAttributesOnly({
        givenName: riderFullData.givenName,
        familyName: riderFullData.familyName,
        level: riderFullData.level,
        validFrom: riderFullData.validFrom,
        validUntil: riderFullData.validUntil,
      });

      expect(publicAttributes).toEqual({
        givenName: 'Rahul',
        familyName: 'Kumar',
        level: 'gold',
        validFrom: '2026-01-15',
        validUntil: '2028-01-15',
      });

      // Verify no private data leaked
      expect((publicAttributes as Record<string, unknown>)['email']).toBeUndefined();
      expect((publicAttributes as Record<string, unknown>)['phone']).toBeUndefined();
      expect((publicAttributes as Record<string, unknown>)['testScore']).toBeUndefined();

      // ========================================
      // STEP 4: Create and Sign Credential
      // ========================================
      const signedCredential = await createSignedCredential(
        {
          credentialId: identifiers.credentialId,
          certificateNumber: identifiers.certificateNumber,
          verificationCode: identifiers.verificationCode,
          publicAttributes,
          issuerCode: issuerConfig.code,
        },
        issuerConfig.signingKey
      );

      expect(signedCredential.signature).toBeDefined();
      expect(signedCredential.signature.length).toBeGreaterThan(20);
      expect(signedCredential.signedAt).toBeDefined();

      // ========================================
      // STEP 5: Verify Signature
      // ========================================
      const verificationResult = await verifySignedCredential(
        signedCredential,
        issuerConfig.signingKey
      );

      expect(verificationResult.valid).toBe(true);
      expect(verificationResult.error).toBeUndefined();

      // Verify with wrong key should fail
      const wrongKey = generateSigningKey();
      const wrongResult = await verifySignedCredential(signedCredential, wrongKey);
      expect(wrongResult.valid).toBe(false);

      // ========================================
      // STEP 6: Generate Credential Hash
      // ========================================
      const hash = await generateCredentialHash(signedCredential.payload);
      expect(hash).toHaveLength(64); // SHA-256 in hex

      const hashValid = await verifyCredentialHash(signedCredential.payload, hash);
      expect(hashValid).toBe(true);

      // Tampered data should fail hash verification
      const tamperedPayload = {
        ...signedCredential.payload,
        publicAttributes: {
          ...signedCredential.payload.publicAttributes,
          givenName: 'Tampered', // Changed!
        },
      };
      const tamperedHashValid = await verifyCredentialHash(tamperedPayload, hash);
      expect(tamperedHashValid).toBe(false);

      // ========================================
      // STEP 7: Verification URL
      // ========================================
      const verifyUrl = getVerificationUrl(identifiers.verificationCode);
      expect(verifyUrl).toContain('rscp.org');
      expect(verifyUrl).toContain(identifiers.verificationCode);
    });
  });

  describe('Protocol Enforcement', () => {
    it('should reject all forbidden fields', () => {
      // Use exact field names from FORBIDDEN_FIELDS
      const forbiddenFields = [
        'email',
        'phone',
        'testScore',
        'hazardScore',
        'address',
        'dateOfBirth',
        'nationalId',
        'drivingLicense', // Note: not 'driversLicense'
        'internalRiderId',
      ];

      for (const field of forbiddenFields) {
        expect(isForbiddenField(field)).toBe(true);
        expect(isAllowedField(field)).toBe(false);

        expect(() => {
          enforcePublicAttributesOnly({
            givenName: 'Test',
            familyName: 'User',
            level: 'bronze',
            validFrom: '2026-01-01',
            validUntil: '2027-01-01',
            [field]: 'some value',
          });
        }).toThrow(ProtocolViolationError);
      }
    });

    it('should require all public fields', () => {
      const requiredFields = ['givenName', 'familyName', 'level', 'validFrom', 'validUntil'];

      for (const field of requiredFields) {
        const data: Record<string, unknown> = {
          givenName: 'Test',
          familyName: 'User',
          level: 'bronze',
          validFrom: '2026-01-01',
          validUntil: '2027-01-01',
        };
        delete data[field];

        expect(() => {
          enforcePublicAttributesOnly(data);
        }).toThrow(MissingAttributeError);
      }
    });

    it('should validate date formats', () => {
      expect(() => {
        enforcePublicAttributesOnly({
          givenName: 'Test',
          familyName: 'User',
          level: 'bronze',
          validFrom: 'not-a-date',
          validUntil: '2027-01-01',
        });
      }).toThrow();

      expect(() => {
        enforcePublicAttributesOnly({
          givenName: 'Test',
          familyName: 'User',
          level: 'bronze',
          validFrom: '2026-01-01',
          validUntil: '2025-01-01', // Before validFrom!
        });
      }).toThrow();
    });
  });

  describe('Certification Levels', () => {
    it('should determine correct level from scores', () => {
      // Gold: BOTH scores >= 85
      expect(determineLevelFromScores(90, 90)).toBe('gold');
      expect(determineLevelFromScores(85, 85)).toBe('gold');

      // Silver: BOTH scores >= 80 (but not gold)
      expect(determineLevelFromScores(82, 82)).toBe('silver');
      expect(determineLevelFromScores(80, 80)).toBe('silver');

      // Bronze: test >= 70 but doesn't qualify for silver/gold
      expect(determineLevelFromScores(82, 75)).toBe('bronze'); // hazard < 80
      expect(determineLevelFromScores(75, 60)).toBe('bronze');
      expect(determineLevelFromScores(70, 50)).toBe('bronze');

      // Fail: test < 70
      expect(determineLevelFromScores(65, 90)).toBeNull();
      expect(determineLevelFromScores(50, 50)).toBeNull();
    });

    it('should compare levels correctly', () => {
      expect(compareLevels('gold', 'silver')).toBe(1);
      expect(compareLevels('silver', 'gold')).toBe(-1);
      expect(compareLevels('gold', 'gold')).toBe(0);
      expect(compareLevels('bronze', 'gold')).toBe(-1);
    });

    it('should check level requirements', () => {
      expect(meetsLevelRequirement('gold', 'bronze')).toBe(true);
      expect(meetsLevelRequirement('gold', 'silver')).toBe(true);
      expect(meetsLevelRequirement('gold', 'gold')).toBe(true);
      expect(meetsLevelRequirement('silver', 'gold')).toBe(false);
      expect(meetsLevelRequirement('bronze', 'silver')).toBe(false);
    });
  });

  describe('Expiry Handling', () => {
    it('should calculate correct expiry dates', () => {
      const bronzeExpiry = getExpiryDate('bronze', '2026-01-15');
      expect(bronzeExpiry).toBe('2027-01-15'); // 1 year

      const silverExpiry = getExpiryDate('silver', '2026-01-15');
      expect(silverExpiry).toBe('2027-01-15'); // 1 year

      const goldExpiry = getExpiryDate('gold', '2026-01-15');
      expect(goldExpiry).toBe('2028-01-15'); // 2 years
    });

    it('should detect expired credentials', () => {
      expect(isExpired('2020-01-01')).toBe(true);
      expect(isExpired('2099-01-01')).toBe(false);
    });

    it('should calculate days until expiry', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const days = daysUntilExpiry(futureDate.toISOString().split('T')[0]!);
      expect(days).toBeGreaterThanOrEqual(29);
      expect(days).toBeLessThanOrEqual(31);
    });
  });

  describe('Builder API', () => {
    it('should build credentials fluently', () => {
      const result = RSCP.credential()
        .issuer('ZMT', 'IN')
        .holder('Priya', 'Sharma')
        .level('silver')
        .validFor({ years: 1 })
        .serial(42)
        .year(2026)
        .build();

      expect(result.publicAttributes.givenName).toBe('Priya');
      expect(result.publicAttributes.familyName).toBe('Sharma');
      expect(result.publicAttributes.level).toBe('silver');
      expect(result.issuerCode).toBe('ZMT');
      expect(result.identifiers.certificateNumber).toMatch(/^RS-2026-S-IN-ZMT-000042-[0-9X]$/);
    });

    it('should throw for missing required fields', () => {
      expect(() => {
        RSCP.credential().build();
      }).toThrow('Issuer code is required');

      expect(() => {
        RSCP.credential().issuer('SWG', 'IN').build();
      }).toThrow('Given name is required');
    });
  });

  describe('Verification Code Format', () => {
    it('should format verification codes with hyphen', () => {
      const code = generateVerificationCode();
      const formatted = formatVerificationCode(code);

      expect(formatted).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(validateVerificationCode(formatted)).toBe(true);
    });
  });

  describe('Full Integration: Multiple Issuers', () => {
    it('should handle credentials from different issuers', async () => {
      // Issuer 1: Swiggy
      const swiggyKey = generateSigningKey();
      const swiggyCredential = await createSignedCredential(
        {
          credentialId: generateCredentialId('SWG', 2026, 1),
          certificateNumber: generateCertificateNumber({
            year: 2026,
            level: 'gold',
            country: 'IN',
            issuerCode: 'SWG',
            serial: 1,
          }),
          verificationCode: generateVerificationCode(),
          publicAttributes: enforcePublicAttributesOnly({
            givenName: 'Rider',
            familyName: 'One',
            level: 'gold',
            validFrom: '2026-01-01',
            validUntil: '2028-01-01',
          }),
          issuerCode: 'SWG',
        },
        swiggyKey
      );

      // Issuer 2: Zomato
      const zomatoKey = generateSigningKey();
      const zomatoCredential = await createSignedCredential(
        {
          credentialId: generateCredentialId('ZMT', 2026, 1),
          certificateNumber: generateCertificateNumber({
            year: 2026,
            level: 'silver',
            country: 'IN',
            issuerCode: 'ZMT',
            serial: 1,
          }),
          verificationCode: generateVerificationCode(),
          publicAttributes: enforcePublicAttributesOnly({
            givenName: 'Rider',
            familyName: 'Two',
            level: 'silver',
            validFrom: '2026-01-01',
            validUntil: '2027-01-01',
          }),
          issuerCode: 'ZMT',
        },
        zomatoKey
      );

      // Verify each with correct key
      expect((await verifySignedCredential(swiggyCredential, swiggyKey)).valid).toBe(true);
      expect((await verifySignedCredential(zomatoCredential, zomatoKey)).valid).toBe(true);

      // Cross-verification should fail
      expect((await verifySignedCredential(swiggyCredential, zomatoKey)).valid).toBe(false);
      expect((await verifySignedCredential(zomatoCredential, swiggyKey)).valid).toBe(false);

      // Both certificate numbers are valid format
      expect(validateCertificateNumber(swiggyCredential.payload.certificateNumber)).toBe(true);
      expect(validateCertificateNumber(zomatoCredential.payload.certificateNumber)).toBe(true);

      // Parse issuer codes from certificate numbers
      const swiggyParsed = parseCertificateNumber(swiggyCredential.payload.certificateNumber);
      const zomatoParsed = parseCertificateNumber(zomatoCredential.payload.certificateNumber);

      expect(swiggyParsed?.issuerCode).toBe('SWG');
      expect(zomatoParsed?.issuerCode).toBe('ZMT');
    });
  });
});
