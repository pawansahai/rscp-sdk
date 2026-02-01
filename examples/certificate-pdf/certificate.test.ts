/**
 * RSCP Certificate PDF Generation Test
 *
 * This test generates actual PDF certificates that you can download and view.
 * The certificates are saved to the output/ directory.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import {
  generateCertificate,
  generateSigningKey,
} from './generate-certificate.js';
import {
  validateCertificateNumber,
  validateVerificationCode,
  verifySignedCredential,
  parseCertificateNumber,
} from '../../packages/core/src/index.js';

// Output directory for generated certificates
const OUTPUT_DIR = path.join(import.meta.dirname, 'output');

describe('RSCP Certificate PDF Generation', () => {
  let issuerSigningKey: string;

  beforeAll(async () => {
    // Create output directory if it doesn't exist
    if (!existsSync(OUTPUT_DIR)) {
      await mkdir(OUTPUT_DIR, { recursive: true });
    }

    // Generate issuer signing key (in production, this would be securely stored)
    issuerSigningKey = generateSigningKey();
  });

  describe('Generate Student Certificate', () => {
    it('should generate a Gold level certificate for a student', async () => {
      // =====================================================================
      // SCENARIO: Driving school issues Gold certificate to student
      // =====================================================================

      const certificate = await generateCertificate({
        // Student details
        givenName: 'Rahul',
        familyName: 'Kumar',
        level: 'gold',

        // Issuer details (your driving school)
        issuerCode: 'ATV', // Autovia
        issuerName: 'Autovia Driving Academy',
        issuerCountry: 'IN',
        issuerSigningKey,

        // Certificate details
        serial: 1,
        year: 2026,
      });

      // Verify the certificate was generated correctly
      expect(certificate.certificateNumber).toMatch(/^RS-2026-G-IN-ATV-000001-[0-9X]$/);
      expect(certificate.verificationCode).toHaveLength(8);
      expect(certificate.pdfBuffer).toBeInstanceOf(Buffer);
      expect(certificate.pdfBuffer.length).toBeGreaterThan(1000); // PDF should have content

      // Validate identifiers
      expect(validateCertificateNumber(certificate.certificateNumber)).toBe(true);
      expect(validateVerificationCode(certificate.verificationCode)).toBe(true);

      // Verify signature
      const signatureValid = await verifySignedCredential(
        certificate.signedCredential,
        issuerSigningKey
      );
      expect(signatureValid.valid).toBe(true);

      // Parse certificate number
      const parsed = parseCertificateNumber(certificate.certificateNumber);
      expect(parsed?.level).toBe('gold');
      expect(parsed?.issuerCode).toBe('ATV');

      // Save PDF to file
      const pdfPath = path.join(OUTPUT_DIR, 'certificate-gold-rahul-kumar.pdf');
      await writeFile(pdfPath, certificate.pdfBuffer);

      console.log('\n========================================');
      console.log('GOLD CERTIFICATE GENERATED');
      console.log('========================================');
      console.log(`Student: ${certificate.publicAttributes.givenName} ${certificate.publicAttributes.familyName}`);
      console.log(`Level: ${certificate.publicAttributes.level.toUpperCase()}`);
      console.log(`Certificate: ${certificate.certificateNumber}`);
      console.log(`Verification Code: ${certificate.verificationCode}`);
      console.log(`Valid Until: ${certificate.publicAttributes.validUntil}`);
      console.log(`Verification URL: ${certificate.verificationUrl}`);
      console.log(`PDF saved to: ${pdfPath}`);
      console.log('========================================\n');
    });

    it('should generate a Silver level certificate', async () => {
      const certificate = await generateCertificate({
        givenName: 'Priya',
        familyName: 'Sharma',
        level: 'silver',

        issuerCode: 'ATV',
        issuerName: 'Autovia Driving Academy',
        issuerCountry: 'IN',
        issuerSigningKey,

        serial: 2,
        year: 2026,
      });

      expect(certificate.certificateNumber).toMatch(/^RS-2026-S-IN-ATV-000002-[0-9X]$/);
      expect(validateCertificateNumber(certificate.certificateNumber)).toBe(true);

      const parsed = parseCertificateNumber(certificate.certificateNumber);
      expect(parsed?.level).toBe('silver');

      // Save PDF
      const pdfPath = path.join(OUTPUT_DIR, 'certificate-silver-priya-sharma.pdf');
      await writeFile(pdfPath, certificate.pdfBuffer);

      console.log('\n========================================');
      console.log('SILVER CERTIFICATE GENERATED');
      console.log('========================================');
      console.log(`Student: ${certificate.publicAttributes.givenName} ${certificate.publicAttributes.familyName}`);
      console.log(`Certificate: ${certificate.certificateNumber}`);
      console.log(`PDF saved to: ${pdfPath}`);
      console.log('========================================\n');
    });

    it('should generate a Bronze level certificate', async () => {
      const certificate = await generateCertificate({
        givenName: 'Amit',
        familyName: 'Patel',
        level: 'bronze',

        issuerCode: 'ATV',
        issuerName: 'Autovia Driving Academy',
        issuerCountry: 'IN',
        issuerSigningKey,

        serial: 3,
        year: 2026,
      });

      expect(certificate.certificateNumber).toMatch(/^RS-2026-B-IN-ATV-000003-[0-9X]$/);

      const parsed = parseCertificateNumber(certificate.certificateNumber);
      expect(parsed?.level).toBe('bronze');

      // Save PDF
      const pdfPath = path.join(OUTPUT_DIR, 'certificate-bronze-amit-patel.pdf');
      await writeFile(pdfPath, certificate.pdfBuffer);

      console.log('\n========================================');
      console.log('BRONZE CERTIFICATE GENERATED');
      console.log('========================================');
      console.log(`Student: ${certificate.publicAttributes.givenName} ${certificate.publicAttributes.familyName}`);
      console.log(`Certificate: ${certificate.certificateNumber}`);
      console.log(`PDF saved to: ${pdfPath}`);
      console.log('========================================\n');
    });
  });

  describe('Multiple Issuers', () => {
    it('should generate certificates from different issuers', async () => {
      // Swiggy issuing to their delivery rider
      const swiggyKey = generateSigningKey();
      const swiggyRiderCert = await generateCertificate({
        givenName: 'Vikram',
        familyName: 'Singh',
        level: 'gold',

        issuerCode: 'SWG',
        issuerName: 'Swiggy Rider Safety Program',
        issuerCountry: 'IN',
        issuerSigningKey: swiggyKey,

        serial: 1001,
        year: 2026,
      });

      expect(swiggyRiderCert.certificateNumber).toContain('SWG');

      // Zomato issuing to their delivery rider
      const zomatoKey = generateSigningKey();
      const zomatoRiderCert = await generateCertificate({
        givenName: 'Ravi',
        familyName: 'Verma',
        level: 'silver',

        issuerCode: 'ZMT',
        issuerName: 'Zomato Rider Academy',
        issuerCountry: 'IN',
        issuerSigningKey: zomatoKey,

        serial: 2001,
        year: 2026,
      });

      expect(zomatoRiderCert.certificateNumber).toContain('ZMT');

      // Save both PDFs
      await writeFile(
        path.join(OUTPUT_DIR, 'certificate-swiggy-rider.pdf'),
        swiggyRiderCert.pdfBuffer
      );

      await writeFile(
        path.join(OUTPUT_DIR, 'certificate-zomato-rider.pdf'),
        zomatoRiderCert.pdfBuffer
      );

      // Verify signatures with correct keys
      expect((await verifySignedCredential(swiggyRiderCert.signedCredential, swiggyKey)).valid).toBe(true);
      expect((await verifySignedCredential(zomatoRiderCert.signedCredential, zomatoKey)).valid).toBe(true);

      // Cross-verification should fail
      expect((await verifySignedCredential(swiggyRiderCert.signedCredential, zomatoKey)).valid).toBe(false);

      console.log('\n========================================');
      console.log('MULTI-ISSUER CERTIFICATES GENERATED');
      console.log('========================================');
      console.log(`Swiggy Rider: ${swiggyRiderCert.certificateNumber}`);
      console.log(`Zomato Rider: ${zomatoRiderCert.certificateNumber}`);
      console.log('========================================\n');
    });
  });

  describe('Verification URL', () => {
    it('should generate correct verification URL', async () => {
      const certificate = await generateCertificate({
        givenName: 'Test',
        familyName: 'User',
        level: 'bronze',

        issuerCode: 'TST',
        issuerName: 'Test Issuer',
        issuerCountry: 'IN',
        issuerSigningKey,

        serial: 999,
        year: 2026,
        verificationBaseUrl: 'https://rscp.autoviatest.com',
      });

      expect(certificate.verificationUrl).toContain('https://rscp.autoviatest.com/verify');
      expect(certificate.verificationUrl).toContain('cert=');
      expect(certificate.verificationUrl).toContain('code=');
      expect(certificate.verificationUrl).toContain(encodeURIComponent(certificate.certificateNumber));

      console.log('\n========================================');
      console.log('VERIFICATION URL TEST');
      console.log('========================================');
      console.log(`URL: ${certificate.verificationUrl}`);
      console.log('========================================\n');
    });
  });

  describe('QR Code', () => {
    it('should generate valid QR code data URL', async () => {
      const certificate = await generateCertificate({
        givenName: 'QR',
        familyName: 'Test',
        level: 'gold',

        issuerCode: 'QRT',
        issuerName: 'QR Test Issuer',
        issuerCountry: 'IN',
        issuerSigningKey,

        serial: 1,
        year: 2026,
      });

      expect(certificate.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

      // QR code should be embeddable in HTML/PDF
      expect(certificate.qrCodeDataUrl.length).toBeGreaterThan(100);
    });
  });
});

// =============================================================================
// STANDALONE TEST RUNNER
// =============================================================================

/**
 * Run this file directly to generate sample certificates:
 * npx tsx examples/certificate-pdf/certificate.test.ts
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Generating sample certificates...\n');

  const issuerKey = generateSigningKey();

  generateCertificate({
    givenName: 'Demo',
    familyName: 'Student',
    level: 'gold',

    issuerCode: 'DEM',
    issuerName: 'Demo Driving School',
    issuerCountry: 'IN',
    issuerSigningKey: issuerKey,

    serial: 1,
    year: 2026,
  }).then(async (cert) => {
    const outputPath = path.join(OUTPUT_DIR, 'demo-certificate.pdf');
    await writeFile(outputPath, cert.pdfBuffer);

    console.log('========================================');
    console.log('DEMO CERTIFICATE GENERATED');
    console.log('========================================');
    console.log(`Certificate Number: ${cert.certificateNumber}`);
    console.log(`Verification Code: ${cert.verificationCode}`);
    console.log(`Verification URL: ${cert.verificationUrl}`);
    console.log(`PDF saved to: ${outputPath}`);
    console.log('========================================');
  });
}
