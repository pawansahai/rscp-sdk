/**
 * RSCP Certificate PDF Generator
 *
 * Generates professional PDF certificates for road safety certifications.
 * Uses RSCP SDK for credential generation and validation.
 */

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Writable } from 'stream';
import {
  generateAllIdentifiers,
  generateSigningKey,
  createSignedCredential,
  enforcePublicAttributesOnly,
  parseCertificateNumber,
  formatVerificationCode,
  type RSCPPublicAttributes,
  type CertificationLevel,
  type SignedCredential,
} from '../../packages/core/src/index.js';

// =============================================================================
// TYPES
// =============================================================================

export interface CertificateInput {
  // Student information
  givenName: string;
  familyName: string;
  level: CertificationLevel;

  // Issuer information
  issuerCode: string;
  issuerName: string;
  issuerCountry: string;
  issuerSigningKey: string;

  // Certificate details
  serial: number;
  year?: number;
  validFrom?: string;
  validUntil?: string;

  // Customization
  verificationBaseUrl?: string;
}

export interface GeneratedCertificate {
  // Identifiers
  certificateNumber: string;
  verificationCode: string;
  credentialId: string;

  // Credential
  signedCredential: SignedCredential;
  publicAttributes: RSCPPublicAttributes;

  // PDF
  pdfBuffer: Buffer;

  // Verification
  verificationUrl: string;
  qrCodeDataUrl: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const LEVEL_COLORS: Record<CertificationLevel, { primary: string; secondary: string; name: string }> = {
  bronze: { primary: '#CD7F32', secondary: '#8B4513', name: 'BRONZE' },
  silver: { primary: '#C0C0C0', secondary: '#708090', name: 'SILVER' },
  gold: { primary: '#FFD700', secondary: '#DAA520', name: 'GOLD' },
};

const LEVEL_VALIDITY: Record<CertificationLevel, number> = {
  bronze: 1,
  silver: 1,
  gold: 2,
};

// =============================================================================
// QR CODE GENERATION
// =============================================================================

/**
 * Generate QR code data URL for verification.
 */
async function generateQRCode(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 150,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

/**
 * Build verification URL.
 */
function buildVerificationUrl(
  baseUrl: string,
  certificateNumber: string,
  verificationCode: string
): string {
  const cleanCode = verificationCode.replace(/-/g, '');
  return `${baseUrl}/verify?cert=${encodeURIComponent(certificateNumber)}&code=${cleanCode}`;
}

// =============================================================================
// PDF GENERATION
// =============================================================================

/**
 * Generate PDF certificate.
 */
async function generatePDF(
  input: CertificateInput,
  identifiers: {
    certificateNumber: string;
    verificationCode: string;
    credentialId: string;
  },
  publicAttributes: RSCPPublicAttributes,
  qrCodeDataUrl: string,
  verificationUrl: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    // Create PDF document (A4 landscape for certificate style)
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
    });

    // Collect chunks
    const stream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });

    doc.pipe(stream);

    stream.on('finish', () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on('error', reject);

    const levelConfig = LEVEL_COLORS[input.level];
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // =========================================================================
    // BORDER AND BACKGROUND
    // =========================================================================

    // Outer border
    doc
      .rect(20, 20, pageWidth - 40, pageHeight - 40)
      .lineWidth(3)
      .stroke(levelConfig.primary);

    // Inner border
    doc
      .rect(30, 30, pageWidth - 60, pageHeight - 60)
      .lineWidth(1)
      .stroke(levelConfig.secondary);

    // Corner decorations
    const cornerSize = 40;
    const corners = [
      { x: 35, y: 35 },
      { x: pageWidth - 35 - cornerSize, y: 35 },
      { x: 35, y: pageHeight - 35 - cornerSize },
      { x: pageWidth - 35 - cornerSize, y: pageHeight - 35 - cornerSize },
    ];

    corners.forEach(({ x, y }) => {
      doc
        .rect(x, y, cornerSize, cornerSize)
        .lineWidth(1)
        .stroke(levelConfig.primary);
    });

    // =========================================================================
    // HEADER
    // =========================================================================

    let yPos = 70;

    // Protocol badge
    doc
      .fontSize(10)
      .fillColor('#666666')
      .text('RSCP CERTIFIED', 0, yPos, { align: 'center' });

    yPos += 25;

    // Main title
    doc
      .fontSize(36)
      .fillColor('#1a1a1a')
      .font('Helvetica-Bold')
      .text('ROAD SAFETY CERTIFICATE', 0, yPos, { align: 'center' });

    yPos += 50;

    // Level badge
    doc
      .fontSize(18)
      .fillColor(levelConfig.primary)
      .font('Helvetica-Bold')
      .text(`${levelConfig.name} LEVEL`, 0, yPos, { align: 'center' });

    yPos += 45;

    // =========================================================================
    // RECIPIENT
    // =========================================================================

    doc
      .fontSize(14)
      .fillColor('#666666')
      .font('Helvetica')
      .text('This is to certify that', 0, yPos, { align: 'center' });

    yPos += 30;

    // Recipient name
    const fullName = `${publicAttributes.givenName} ${publicAttributes.familyName}`;
    doc
      .fontSize(32)
      .fillColor('#1a1a1a')
      .font('Helvetica-Bold')
      .text(fullName, 0, yPos, { align: 'center' });

    yPos += 50;

    doc
      .fontSize(14)
      .fillColor('#666666')
      .font('Helvetica')
      .text('has successfully completed the road safety certification program', 0, yPos, { align: 'center' });

    yPos += 20;

    doc
      .text(`and is certified at the ${levelConfig.name} level`, 0, yPos, { align: 'center' });

    yPos += 45;

    // =========================================================================
    // CERTIFICATE DETAILS (LEFT SIDE)
    // =========================================================================

    const detailsX = 80;
    const detailsWidth = 300;

    // Certificate number box
    doc
      .rect(detailsX, yPos, detailsWidth, 70)
      .lineWidth(1)
      .stroke('#cccccc');

    doc
      .fontSize(10)
      .fillColor('#666666')
      .font('Helvetica')
      .text('CERTIFICATE NUMBER', detailsX + 10, yPos + 10);

    doc
      .fontSize(14)
      .fillColor('#1a1a1a')
      .font('Helvetica-Bold')
      .text(identifiers.certificateNumber, detailsX + 10, yPos + 28);

    doc
      .fontSize(10)
      .fillColor('#666666')
      .font('Helvetica')
      .text(`Verification Code: ${formatVerificationCode(identifiers.verificationCode)}`, detailsX + 10, yPos + 50);

    // Validity box
    const validityX = detailsX + detailsWidth + 20;

    doc
      .rect(validityX, yPos, detailsWidth, 70)
      .lineWidth(1)
      .stroke('#cccccc');

    doc
      .fontSize(10)
      .fillColor('#666666')
      .font('Helvetica')
      .text('VALIDITY PERIOD', validityX + 10, yPos + 10);

    doc
      .fontSize(12)
      .fillColor('#1a1a1a')
      .font('Helvetica-Bold')
      .text(`From: ${publicAttributes.validFrom}`, validityX + 10, yPos + 28);

    doc
      .text(`Until: ${publicAttributes.validUntil}`, validityX + 10, yPos + 46);

    // =========================================================================
    // QR CODE (RIGHT SIDE)
    // =========================================================================

    const qrX = pageWidth - 200;
    const qrY = yPos - 20;
    const qrSize = 100;

    // QR code background
    doc
      .rect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 45)
      .fill('#f8f8f8');

    // Add QR code image
    const qrBuffer = Buffer.from(qrCodeDataUrl.split(',')[1]!, 'base64');
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

    doc
      .fontSize(8)
      .fillColor('#666666')
      .font('Helvetica')
      .text('Scan to verify', qrX, qrY + qrSize + 5, { width: qrSize, align: 'center' });

    doc
      .fontSize(7)
      .text('rscp.autoviatest.com', qrX, qrY + qrSize + 18, { width: qrSize, align: 'center' });

    yPos += 90;

    // =========================================================================
    // ISSUER SECTION
    // =========================================================================

    yPos += 20;

    // Issuer info
    doc
      .fontSize(10)
      .fillColor('#666666')
      .font('Helvetica')
      .text('Issued by', detailsX, yPos);

    doc
      .fontSize(14)
      .fillColor('#1a1a1a')
      .font('Helvetica-Bold')
      .text(input.issuerName, detailsX, yPos + 15);

    doc
      .fontSize(10)
      .fillColor('#666666')
      .font('Helvetica')
      .text(`Issuer Code: ${input.issuerCode} | Country: ${input.issuerCountry}`, detailsX, yPos + 35);

    // Date issued
    const issuedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    doc
      .fontSize(10)
      .fillColor('#666666')
      .text(`Date Issued: ${issuedDate}`, validityX, yPos + 35);

    // =========================================================================
    // FOOTER
    // =========================================================================

    const footerY = pageHeight - 60;

    doc
      .fontSize(8)
      .fillColor('#999999')
      .font('Helvetica')
      .text(
        `This certificate is issued under the Road Safety Certification Protocol (RSCP). ` +
        `Verify authenticity at ${verificationUrl}`,
        50,
        footerY,
        { align: 'center', width: pageWidth - 100 }
      );

    doc
      .fontSize(7)
      .text(
        `Credential ID: ${identifiers.credentialId}`,
        50,
        footerY + 15,
        { align: 'center', width: pageWidth - 100 }
      );

    // Finalize PDF
    doc.end();
  });
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Generate a complete RSCP certificate with PDF.
 */
export async function generateCertificate(input: CertificateInput): Promise<GeneratedCertificate> {
  const year = input.year ?? new Date().getFullYear();
  const baseUrl = input.verificationBaseUrl ?? 'https://rscp.autoviatest.com';

  // Calculate validity dates
  const validFrom = input.validFrom ?? new Date().toISOString().split('T')[0]!;
  const validUntilDate = new Date(validFrom);
  validUntilDate.setFullYear(validUntilDate.getFullYear() + LEVEL_VALIDITY[input.level]);
  const validUntil = input.validUntil ?? validUntilDate.toISOString().split('T')[0]!;

  // Step 1: Generate identifiers
  const identifiers = generateAllIdentifiers({
    year,
    level: input.level,
    country: input.issuerCountry,
    issuerCode: input.issuerCode,
    serial: input.serial,
  });

  // Step 2: Create public attributes
  const publicAttributes = enforcePublicAttributesOnly({
    givenName: input.givenName,
    familyName: input.familyName,
    level: input.level,
    validFrom,
    validUntil,
  });

  // Step 3: Sign the credential
  const signedCredential = await createSignedCredential(
    {
      credentialId: identifiers.credentialId,
      certificateNumber: identifiers.certificateNumber,
      verificationCode: identifiers.verificationCode,
      publicAttributes,
      issuerCode: input.issuerCode,
    },
    input.issuerSigningKey
  );

  // Step 4: Generate verification URL and QR code
  const verificationUrl = buildVerificationUrl(
    baseUrl,
    identifiers.certificateNumber,
    identifiers.verificationCode
  );

  // QR contains both URL and raw data for offline verification
  const qrData = JSON.stringify({
    url: verificationUrl,
    cert: identifiers.certificateNumber,
    code: identifiers.verificationCode,
    name: `${input.givenName} ${input.familyName}`,
    level: input.level,
    validUntil,
  });

  const qrCodeDataUrl = await generateQRCode(qrData);

  // Step 5: Generate PDF
  const pdfBuffer = await generatePDF(
    input,
    identifiers,
    publicAttributes,
    qrCodeDataUrl,
    verificationUrl
  );

  return {
    certificateNumber: identifiers.certificateNumber,
    verificationCode: identifiers.verificationCode,
    credentialId: identifiers.credentialId,
    signedCredential,
    publicAttributes,
    pdfBuffer,
    verificationUrl,
    qrCodeDataUrl,
  };
}

/**
 * Helper to create issuer signing key.
 */
export { generateSigningKey };
