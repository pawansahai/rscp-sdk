import { describe, it, expect } from 'vitest';
import {
  generateCertificateNumber,
  parseCertificateNumber,
  validateCertificateNumber,
  formatCertificateNumber,
  generateVerificationCode,
  formatVerificationCode,
  validateVerificationCode,
  parseVerificationCode,
  generateCredentialId,
  parseCredentialId,
  generateIssuerDid,
  parseIssuerDid,
  generateHolderDid,
  parseHolderDid,
  generateAllIdentifiers,
  getVerificationUrl,
} from '../src/identifiers/index.js';

describe('Certificate Number', () => {
  describe('generateCertificateNumber', () => {
    it('generates valid certificate number', () => {
      const certNumber = generateCertificateNumber({
        year: 2026,
        level: 'gold',
        country: 'IN',
        issuerCode: 'SWG',
        serial: 1,
      });

      expect(certNumber).toMatch(/^RS-2026-G-IN-SWG-000001-[A-Z0-9]$/);
    });

    it('pads serial number to 6 digits', () => {
      const certNumber = generateCertificateNumber({
        year: 2026,
        level: 'bronze',
        country: 'US',
        issuerCode: 'UBR',
        serial: 42,
      });

      expect(certNumber).toContain('-000042-');
    });

    it('uses correct level codes', () => {
      expect(
        generateCertificateNumber({
          year: 2026,
          level: 'bronze',
          country: 'IN',
          issuerCode: 'SWG',
          serial: 1,
        })
      ).toContain('-B-');

      expect(
        generateCertificateNumber({
          year: 2026,
          level: 'silver',
          country: 'IN',
          issuerCode: 'SWG',
          serial: 1,
        })
      ).toContain('-S-');

      expect(
        generateCertificateNumber({
          year: 2026,
          level: 'gold',
          country: 'IN',
          issuerCode: 'SWG',
          serial: 1,
        })
      ).toContain('-G-');
    });

    it('throws on invalid year', () => {
      expect(() =>
        generateCertificateNumber({
          year: 2019,
          level: 'gold',
          country: 'IN',
          issuerCode: 'SWG',
          serial: 1,
        })
      ).toThrow('Invalid year');

      expect(() =>
        generateCertificateNumber({
          year: 2101,
          level: 'gold',
          country: 'IN',
          issuerCode: 'SWG',
          serial: 1,
        })
      ).toThrow('Invalid year');
    });

    it('throws on invalid level', () => {
      expect(() =>
        generateCertificateNumber({
          year: 2026,
          level: 'platinum' as any,
          country: 'IN',
          issuerCode: 'SWG',
          serial: 1,
        })
      ).toThrow('Invalid level');
    });

    it('throws on invalid country code', () => {
      expect(() =>
        generateCertificateNumber({
          year: 2026,
          level: 'gold',
          country: 'IND',
          issuerCode: 'SWG',
          serial: 1,
        })
      ).toThrow('Invalid country code');
    });

    it('throws on invalid issuer code', () => {
      expect(() =>
        generateCertificateNumber({
          year: 2026,
          level: 'gold',
          country: 'IN',
          issuerCode: 'SW',
          serial: 1,
        })
      ).toThrow('Invalid issuer code');
    });

    it('throws on invalid serial', () => {
      expect(() =>
        generateCertificateNumber({
          year: 2026,
          level: 'gold',
          country: 'IN',
          issuerCode: 'SWG',
          serial: 0,
        })
      ).toThrow('Invalid serial');

      expect(() =>
        generateCertificateNumber({
          year: 2026,
          level: 'gold',
          country: 'IN',
          issuerCode: 'SWG',
          serial: 1000000,
        })
      ).toThrow('Invalid serial');
    });
  });

  describe('parseCertificateNumber', () => {
    it('parses valid certificate number', () => {
      const parts = parseCertificateNumber('RS-2026-G-IN-SWG-000001-7');

      expect(parts).toEqual({
        year: 2026,
        level: 'gold',
        levelCode: 'G',
        country: 'IN',
        issuerCode: 'SWG',
        serial: 1,
        checkDigit: '7',
      });
    });

    it('returns null for invalid format', () => {
      expect(parseCertificateNumber('invalid')).toBeNull();
      expect(parseCertificateNumber('RS-2026-X-IN-SWG-000001-7')).toBeNull();
      expect(parseCertificateNumber('RS-2026-G-IND-SWG-000001-7')).toBeNull();
    });

    it('handles case insensitivity', () => {
      const parts = parseCertificateNumber('rs-2026-g-in-swg-000001-7');
      expect(parts?.level).toBe('gold');
      expect(parts?.country).toBe('IN');
    });
  });

  describe('validateCertificateNumber', () => {
    it('validates correct certificate numbers', () => {
      const certNumber = generateCertificateNumber({
        year: 2026,
        level: 'gold',
        country: 'IN',
        issuerCode: 'SWG',
        serial: 1,
      });

      expect(validateCertificateNumber(certNumber)).toBe(true);
    });

    it('rejects incorrect check digit', () => {
      expect(validateCertificateNumber('RS-2026-G-IN-SWG-000001-X')).toBe(false);
    });

    it('rejects invalid format', () => {
      expect(validateCertificateNumber('invalid')).toBe(false);
    });
  });

  describe('formatCertificateNumber', () => {
    it('formats lowercase to uppercase', () => {
      expect(formatCertificateNumber('rs-2026-g-in-swg-000001-7')).toBe(
        'RS-2026-G-IN-SWG-000001-7'
      );
    });
  });
});

describe('Verification Code', () => {
  describe('generateVerificationCode', () => {
    it('generates 8-character code', () => {
      const code = generateVerificationCode();
      expect(code).toHaveLength(8);
    });

    it('generates valid codes', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateVerificationCode();
        expect(validateVerificationCode(code)).toBe(true);
      }
    });

    it('generates unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        codes.add(generateVerificationCode());
      }
      expect(codes.size).toBe(1000);
    });
  });

  describe('formatVerificationCode', () => {
    it('adds hyphen in middle', () => {
      expect(formatVerificationCode('A3B7K9M2')).toBe('A3B7-K9M2');
    });

    it('handles already formatted code', () => {
      expect(formatVerificationCode('A3B7-K9M2')).toBe('A3B7-K9M2');
    });
  });

  describe('validateVerificationCode', () => {
    it('validates with hyphen', () => {
      const code = generateVerificationCode();
      const formatted = formatVerificationCode(code);
      expect(validateVerificationCode(formatted)).toBe(true);
    });

    it('validates without hyphen', () => {
      const code = generateVerificationCode();
      expect(validateVerificationCode(code)).toBe(true);
    });

    it('rejects invalid codes', () => {
      // Generate a valid code, then corrupt it to make it invalid
      const validCode = generateVerificationCode();
      const corruptedCode = validCode.slice(0, 7) + (validCode[7] === 'A' ? 'B' : 'A');
      expect(validateVerificationCode(corruptedCode)).toBe(false);

      // Code with characters not in alphabet (1 and 0 are excluded)
      expect(validateVerificationCode('10101010')).toBe(false);
    });

    it('rejects wrong length', () => {
      expect(validateVerificationCode('ABC')).toBe(false);
      expect(validateVerificationCode('ABCDEFGHIJ')).toBe(false);
    });
  });

  describe('parseVerificationCode', () => {
    it('extracts base and check digit', () => {
      const code = generateVerificationCode();
      const parsed = parseVerificationCode(code);

      expect(parsed).not.toBeNull();
      expect(parsed?.base).toHaveLength(7);
      expect(parsed?.checkDigit).toHaveLength(1);
    });
  });
});

describe('Credential ID', () => {
  describe('generateCredentialId', () => {
    it('generates URN format', () => {
      const id = generateCredentialId('SWG', 2026, 1);
      expect(id).toBe('urn:rscp:credential:swg:2026:000001');
    });

    it('pads serial number', () => {
      const id = generateCredentialId('SWG', 2026, 42);
      expect(id).toBe('urn:rscp:credential:swg:2026:000042');
    });
  });

  describe('parseCredentialId', () => {
    it('parses valid ID', () => {
      const parts = parseCredentialId('urn:rscp:credential:swg:2026:000001');

      expect(parts).toEqual({
        issuerCode: 'SWG',
        year: 2026,
        serial: 1,
      });
    });

    it('returns null for invalid ID', () => {
      expect(parseCredentialId('invalid')).toBeNull();
    });
  });
});

describe('DIDs', () => {
  describe('Issuer DID', () => {
    it('generates correct format', () => {
      expect(generateIssuerDid('SWG')).toBe('did:rscp:issuer:swg');
    });

    it('parses correctly', () => {
      expect(parseIssuerDid('did:rscp:issuer:swg')).toBe('SWG');
    });

    it('returns null for invalid DID', () => {
      expect(parseIssuerDid('invalid')).toBeNull();
    });
  });

  describe('Holder DID', () => {
    it('generates correct format', () => {
      const did = generateHolderDid('123e4567-e89b-12d3-a456-426614174000');
      expect(did).toBe('did:rscp:holder:123e4567-e89b-12d3-a456-426614174000');
    });

    it('parses correctly', () => {
      const userId = parseHolderDid('did:rscp:holder:123e4567-e89b-12d3-a456-426614174000');
      expect(userId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });
});

describe('Convenience Functions', () => {
  describe('generateAllIdentifiers', () => {
    it('generates all identifiers at once', () => {
      const ids = generateAllIdentifiers({
        year: 2026,
        level: 'gold',
        country: 'IN',
        issuerCode: 'SWG',
        serial: 1,
      });

      expect(ids.certificateNumber).toMatch(/^RS-2026-G-IN-SWG-000001-[A-Z0-9]$/);
      expect(ids.verificationCode).toHaveLength(8);
      expect(ids.credentialId).toBe('urn:rscp:credential:swg:2026:000001');
      expect(ids.issuerDid).toBe('did:rscp:issuer:swg');
    });
  });

  describe('getVerificationUrl', () => {
    it('generates correct URL', () => {
      expect(getVerificationUrl('A3B7K9M2')).toBe('https://rscp.org/v/A3B7K9M2');
    });

    it('cleans code', () => {
      expect(getVerificationUrl('a3b7-k9m2')).toBe('https://rscp.org/v/A3B7K9M2');
    });

    it('allows custom base URL', () => {
      expect(getVerificationUrl('A3B7K9M2', 'https://custom.com')).toBe(
        'https://custom.com/v/A3B7K9M2'
      );
    });
  });
});
