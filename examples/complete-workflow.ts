/**
 * RSCP SDK - Complete Workflow Example
 *
 * This example demonstrates the full lifecycle of an RSCP credential:
 * 1. Issuer setup (driving school or delivery company)
 * 2. Certificate issuance after training/testing
 * 3. Registry storage (public data only)
 * 4. Verification by third parties
 *
 * Run with: npx tsx examples/complete-workflow.ts
 */

import {
  // Identifiers
  generateCertificateNumber,
  generateVerificationCode,
  generateCredentialId,
  generateIssuerDid,
  generateHolderDid,
  generateAllIdentifiers,
  parseCertificateNumber,
  validateCertificateNumber,
  validateVerificationCode,
  formatVerificationCode,
  getVerificationUrl,

  // Protocol enforcement
  enforcePublicAttributesOnly,
  ProtocolViolationError,
  ALLOWED_PUBLIC_FIELDS,
  FORBIDDEN_FIELDS,

  // Crypto
  generateSigningKey,
  createSignedCredential,
  verifySignedCredential,
  generateCredentialHash,
  verifyCredentialHash,

  // Utilities
  getExpiryDate,
  isExpired,
  daysUntilExpiry,
  formatFullName,
  determineLevelFromScores,
  meetsLevelRequirement,

  // Builder
  RSCP,

  // Types
  type RSCPPublicAttributes,
  type SignedCredential,
} from '../packages/core/src/index.js';

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║         RSCP SDK - Complete Workflow Demonstration             ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// ============================================================================
// STEP 1: ISSUER SETUP
// ============================================================================

console.log('📋 STEP 1: Issuer Setup');
console.log('─'.repeat(60));

// In production, this key would be stored securely (HSM, KMS, etc.)
const issuerSigningKey = generateSigningKey();
const issuerCode = 'DRV'; // "Drive Safe Academy"
const issuerCountry = 'IN';

console.log(`✅ Issuer Code: ${issuerCode}`);
console.log(`✅ Issuer DID: ${generateIssuerDid(issuerCode)}`);
console.log(`✅ Signing Key Generated: ${issuerSigningKey.substring(0, 16)}...`);
console.log(`✅ Key Length: ${issuerSigningKey.length * 4} bits\n`);

// ============================================================================
// STEP 2: TRAINING AND TESTING (Simulated)
// ============================================================================

console.log('📋 STEP 2: Training & Testing Results');
console.log('─'.repeat(60));

// This data comes from your training/testing platform
const trainingResults = {
  riderId: 'RIDER-2026-001',
  trainingHours: 8,
  testScore: 92,
  hazardScore: 88,
  completedAt: new Date().toISOString(),
};

// Determine certification level based on scores
const certLevel = determineLevelFromScores(trainingResults.testScore, trainingResults.hazardScore);

if (!certLevel) {
  console.log('❌ Rider did not pass the certification test');
  process.exit(1);
}

console.log(`✅ Training Hours: ${trainingResults.trainingHours} hours`);
console.log(`✅ Test Score: ${trainingResults.testScore}%`);
console.log(`✅ Hazard Perception Score: ${trainingResults.hazardScore}%`);
console.log(`✅ Certification Level: ${certLevel.toUpperCase()}\n`);

// ============================================================================
// STEP 3: COLLECT RIDER INFORMATION
// ============================================================================

console.log('📋 STEP 3: Rider Information');
console.log('─'.repeat(60));

// Full rider data (stored by issuer, NOT sent to registry)
const riderData = {
  // Public attributes (will go to registry)
  givenName: 'Rahul',
  familyName: 'Kumar',

  // Private attributes (NEVER sent to registry)
  email: 'rahul.kumar@example.com',
  phone: '+91-9876543210',
  dateOfBirth: '1995-03-20',
  address: '123 MG Road, Bangalore, Karnataka 560001',
  driversLicense: 'KA01-2020-1234567',
  testScore: trainingResults.testScore,
  hazardScore: trainingResults.hazardScore,
};

console.log(`✅ Rider Name: ${riderData.givenName} ${riderData.familyName}`);
console.log(`✅ Email: ${riderData.email} (PRIVATE - stays with issuer)`);
console.log(`✅ Phone: ${riderData.phone} (PRIVATE - stays with issuer)\n`);

// ============================================================================
// STEP 4: GENERATE IDENTIFIERS
// ============================================================================

console.log('📋 STEP 4: Generate Identifiers');
console.log('─'.repeat(60));

const serial = 1; // In production, get from database sequence
const year = new Date().getFullYear();

const identifiers = generateAllIdentifiers({
  year,
  level: certLevel,
  country: issuerCountry,
  issuerCode,
  serial,
});

console.log(`✅ Certificate Number: ${identifiers.certificateNumber}`);
console.log(`✅ Verification Code: ${formatVerificationCode(identifiers.verificationCode)}`);
console.log(`✅ Credential ID: ${identifiers.credentialId}`);
console.log(`✅ Issuer DID: ${identifiers.issuerDid}\n`);

// Parse and display certificate number components
const parsed = parseCertificateNumber(identifiers.certificateNumber);
if (parsed) {
  console.log('   Certificate Number Breakdown:');
  console.log(`   ├─ Protocol: RS (Road Safety)`);
  console.log(`   ├─ Year: ${parsed.year}`);
  console.log(`   ├─ Level: ${parsed.levelCode} (${parsed.level})`);
  console.log(`   ├─ Country: ${parsed.country}`);
  console.log(`   ├─ Issuer: ${parsed.issuerCode}`);
  console.log(`   ├─ Serial: ${parsed.serial}`);
  console.log(`   └─ Check Digit: ${parsed.checkDigit}\n`);
}

// ============================================================================
// STEP 5: ENFORCE PUBLIC ATTRIBUTES (ZERO-TRUST)
// ============================================================================

console.log('📋 STEP 5: Protocol Enforcement (Zero-Trust)');
console.log('─'.repeat(60));

console.log('   Allowed Public Fields:', ALLOWED_PUBLIC_FIELDS.join(', '));
console.log('   Forbidden Fields:', FORBIDDEN_FIELDS.slice(0, 5).join(', ') + '...\n');

// Demonstrate protocol violation detection
console.log('   Testing Protocol Enforcement:');

try {
  // This WILL throw - email is forbidden
  enforcePublicAttributesOnly({
    givenName: riderData.givenName,
    familyName: riderData.familyName,
    level: certLevel,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: getExpiryDate(certLevel),
    email: riderData.email, // FORBIDDEN!
  });
} catch (error) {
  if (error instanceof ProtocolViolationError) {
    console.log(`   ⛔ Correctly blocked: "${error.field}" is forbidden`);
  }
}

// Correct usage - only public fields
const validFrom = new Date().toISOString().split('T')[0]!;
const validUntil = getExpiryDate(certLevel);

const publicAttributes = enforcePublicAttributesOnly({
  givenName: riderData.givenName,
  familyName: riderData.familyName,
  level: certLevel,
  validFrom,
  validUntil,
});

console.log('   ✅ Public attributes validated successfully');
console.log('   ✅ Only 5 fields will be stored in registry:\n');
console.log(`      ${JSON.stringify(publicAttributes, null, 2).split('\n').join('\n      ')}\n`);

// ============================================================================
// STEP 6: SIGN THE CREDENTIAL
// ============================================================================

console.log('📋 STEP 6: Sign Credential');
console.log('─'.repeat(60));

const signedCredential = await createSignedCredential(
  {
    credentialId: identifiers.credentialId,
    certificateNumber: identifiers.certificateNumber,
    verificationCode: identifiers.verificationCode,
    publicAttributes,
    issuerCode,
  },
  issuerSigningKey
);

console.log(`✅ Signature: ${signedCredential.signature.substring(0, 32)}...`);
console.log(`✅ Signed At: ${signedCredential.signedAt}`);

// Generate credential hash for integrity
const credentialHash = await generateCredentialHash(signedCredential.payload);
console.log(`✅ Credential Hash: ${credentialHash.substring(0, 32)}...\n`);

// ============================================================================
// STEP 7: SIMULATE REGISTRY STORAGE
// ============================================================================

console.log('📋 STEP 7: Registry Storage (Simulated)');
console.log('─'.repeat(60));

// What gets stored in the public registry (e.g., Supabase)
const registryRecord = {
  id: identifiers.credentialId,
  certificate_number: identifiers.certificateNumber,
  verification_code_hash: await generateCredentialHash({
    ...signedCredential.payload,
    verificationCode: identifiers.verificationCode,
  }),
  issuer_code: issuerCode,
  given_name: publicAttributes.givenName,
  family_name: publicAttributes.familyName,
  level: publicAttributes.level,
  valid_from: publicAttributes.validFrom,
  valid_until: publicAttributes.validUntil,
  signature: signedCredential.signature,
  status: 'active',
  created_at: new Date().toISOString(),
};

console.log('   Registry stores ONLY:');
console.log(`   ${JSON.stringify(registryRecord, null, 2).split('\n').join('\n   ')}\n`);
console.log('   ⚠️  Note: NO email, phone, scores, or other PII stored!\n');

// ============================================================================
// STEP 8: VERIFICATION (By Police, Employer, etc.)
// ============================================================================

console.log('📋 STEP 8: Verification');
console.log('─'.repeat(60));

// Verifier receives certificate number and verification code
const certificateToVerify = identifiers.certificateNumber;
const codeToVerify = identifiers.verificationCode;

console.log(`   Verifying: ${certificateToVerify}`);
console.log(`   With Code: ${formatVerificationCode(codeToVerify)}\n`);

// Step 8a: Validate format
const formatValid = validateCertificateNumber(certificateToVerify);
const codeValid = validateVerificationCode(codeToVerify);

console.log(`   ├─ Format Valid: ${formatValid ? '✅' : '❌'}`);
console.log(`   ├─ Code Valid: ${codeValid ? '✅' : '❌'}`);

// Step 8b: Verify signature (in production, get issuer's public key from registry)
const signatureResult = await verifySignedCredential(signedCredential, issuerSigningKey);
console.log(`   ├─ Signature Valid: ${signatureResult.valid ? '✅' : '❌'}`);

// Step 8c: Check expiry
const expired = isExpired(publicAttributes.validUntil);
const daysLeft = daysUntilExpiry(publicAttributes.validUntil);
console.log(`   ├─ Expired: ${expired ? '❌ Yes' : '✅ No'}`);
console.log(`   └─ Days Until Expiry: ${daysLeft}\n`);

// Step 8d: Check if meets requirements
const requiredLevel = 'silver';
const meetsRequirement = meetsLevelRequirement(publicAttributes.level, requiredLevel);
console.log(`   Requirement Check: Needs ${requiredLevel.toUpperCase()} or higher`);
console.log(`   Result: ${meetsRequirement ? '✅ PASSES' : '❌ FAILS'}\n`);

// ============================================================================
// STEP 9: VERIFICATION URL
// ============================================================================

console.log('📋 STEP 9: Verification URL');
console.log('─'.repeat(60));

const verifyUrl = getVerificationUrl(certificateToVerify, codeToVerify);
console.log(`   ${verifyUrl}\n`);

// ============================================================================
// STEP 10: USING THE BUILDER API
// ============================================================================

console.log('📋 STEP 10: Builder API (Alternative Approach)');
console.log('─'.repeat(60));

const builderResult = RSCP.credential()
  .issuer('ZMT', 'IN')
  .holder('Priya', 'Sharma')
  .level('silver')
  .validFor({ years: 1 })
  .serial(42)
  .year(2026)
  .build();

console.log('   Built credential:');
console.log(`   ├─ Certificate: ${builderResult.identifiers.certificateNumber}`);
console.log(`   ├─ Name: ${builderResult.publicAttributes.givenName} ${builderResult.publicAttributes.familyName}`);
console.log(`   └─ Valid Until: ${builderResult.publicAttributes.validUntil}\n`);

// ============================================================================
// SUMMARY
// ============================================================================

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║                        SUMMARY                                 ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('✅ Complete credential issuance workflow demonstrated');
console.log('✅ Zero-trust privacy enforced (only 5 public fields)');
console.log('✅ Cryptographic signing and verification working');
console.log('✅ Check digit validation (ISO 7064, Damm) working');
console.log('✅ Expiry and level checking working\n');

console.log('📦 This credential can now be:');
console.log('   • Stored in the RSCP registry');
console.log('   • Printed on a physical certificate');
console.log('   • Added to a mobile wallet');
console.log('   • Verified by anyone with the cert number + code\n');

console.log('🔒 Privacy Protected:');
console.log('   • Email, phone, scores, address = NEVER stored in registry');
console.log('   • Only issuer has access to private data');
console.log('   • Impossible to breach what registry doesn\'t store\n');
}

// Run the main function
main().catch(console.error);
