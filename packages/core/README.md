# @rscp/core

Core library for the Road Safety Certification Protocol (RSCP).

[![npm version](https://img.shields.io/npm/v/@rscp/core.svg)](https://www.npmjs.com/package/@rscp/core)
[![License](https://img.shields.io/npm/l/@rscp/core.svg)](https://github.com/rscp-protocol/rscp-sdk/blob/main/LICENSE)

## Overview

RSCP is a privacy-preserving, zero-trust protocol for road safety certifications. This core library provides:

- **Identifier Generation**: Certificate numbers, verification codes, credential IDs
- **Protocol Enforcement**: Zero-trust validation that prevents PII leakage
- **Cryptographic Signing**: HMAC-SHA256 signatures for credential integrity
- **Validation Utilities**: Check digit algorithms (ISO 7064, Damm)

## Installation

```bash
npm install @rscp/core
# or
pnpm add @rscp/core
# or
yarn add @rscp/core
```

## Quick Start

```typescript
import {
  generateCertificateNumber,
  generateVerificationCode,
  enforcePublicAttributesOnly,
  createSignedCredential,
  generateSigningKey,
} from '@rscp/core';

// Generate identifiers
const certNumber = generateCertificateNumber({
  year: 2026,
  level: 'gold',
  country: 'IN',
  issuerCode: 'SWG',
  serial: 1,
});
// → 'RS-2026-G-IN-SWG-000001-7'

const verificationCode = generateVerificationCode();
// → 'A3B7K9M2'

// Create public attributes (only these go to registry)
const publicAttributes = enforcePublicAttributesOnly({
  givenName: 'Rahul',
  familyName: 'Kumar',
  level: 'gold',
  validFrom: '2026-01-15',
  validUntil: '2028-01-15',
  // email: 'rahul@example.com', // Would throw ProtocolViolationError!
});

// Sign the credential
const signingKey = generateSigningKey();
const signed = await createSignedCredential({
  credentialId: 'urn:rscp:credential:swg:2026:000001',
  certificateNumber: certNumber,
  verificationCode,
  publicAttributes,
  issuerCode: 'SWG',
}, signingKey);
```

## Key Concepts

### Zero-Trust Architecture

RSCP enforces privacy at the protocol level, not by policy:

```typescript
import { ALLOWED_PUBLIC_FIELDS, FORBIDDEN_FIELDS } from '@rscp/core';

console.log(ALLOWED_PUBLIC_FIELDS);
// ['givenName', 'familyName', 'level', 'validFrom', 'validUntil']

console.log(FORBIDDEN_FIELDS);
// ['email', 'phone', 'testScore', 'hazardScore', 'address', ...]
```

Any attempt to store forbidden fields in the registry throws a `ProtocolViolationError`.

### Certificate Number Format

```
RS-2026-G-IN-SWG-000001-7
│  │    │ │  │   │      └─ ISO 7064 check digit
│  │    │ │  │   └──────── 6-digit serial number
│  │    │ │  └──────────── 3-char issuer code
│  │    │ └─────────────── 2-char country (ISO 3166-1)
│  │    └───────────────── Level: B/S/G (Bronze/Silver/Gold)
│  └────────────────────── 4-digit year
└───────────────────────── Protocol prefix
```

### Verification Code Format

```
A3B7-K9M2
│       └─ Damm check digit
└──────── 7 random characters
```

- Uses 32-character alphabet (excludes I, O, 0, 1)
- Cryptographically secure random generation
- Damm algorithm detects all single-digit errors

### Certification Levels

| Level | Training | Min Score | Validity |
|-------|----------|-----------|----------|
| Bronze | 2 hours | ≥70% | 1 year |
| Silver | 4 hours | ≥80% | 1 year |
| Gold | 8 hours | ≥85% | 2 years |

## API Reference

### Identifiers

```typescript
// Certificate numbers
generateCertificateNumber(options): string
parseCertificateNumber(certNumber): CertificateNumberParts | null
validateCertificateNumber(certNumber): boolean

// Verification codes
generateVerificationCode(): string
formatVerificationCode(code): string  // 'A3B7K9M2' → 'A3B7-K9M2'
validateVerificationCode(code): boolean

// Credential IDs
generateCredentialId(issuerCode, year, serial): string
parseCredentialId(credentialId): CredentialIdParts | null

// DIDs
generateIssuerDid(issuerCode): string  // 'did:rscp:issuer:swg'
generateHolderDid(userId): string      // 'did:rscp:holder:{uuid}'
```

### Protocol Enforcement

```typescript
// Main enforcement function
enforcePublicAttributesOnly(data): RSCPPublicAttributes
// Throws: ProtocolViolationError, MissingAttributeError, AttributeValidationError

// Field checking
isForbiddenField(field): boolean
isAllowedField(field): boolean
detectForbiddenFields(data): string[]
```

### Cryptography

```typescript
// Key management
generateSigningKey(): string
isValidSigningKey(key): boolean

// Signing
signPayload(payload, key): Promise<string>
verifySignature(payload, signature, key): Promise<SignatureVerificationResult>
createSignedCredential(input, key): Promise<SignedCredential>

// Hashing
generateCredentialHash(payload): Promise<string>
verifyCredentialHash(payload, hash): Promise<boolean>

// Secure random
getRandomBytes(length): Uint8Array
getSecureRandomInt(max): number
getRandomString(length, alphabet): string
```

### Utilities

```typescript
// Dates
getExpiryDate(level, fromDate?): string
isExpired(validUntil): boolean
daysUntilExpiry(validUntil): number

// Levels
compareLevels(a, b): -1 | 0 | 1
meetsLevelRequirement(actual, minimum): boolean
getLevelMinScore(level): number

// Scores
determineLevelFromScores(testScore, hazardScore?): CertificationLevel | null
```

## Builder API

For fluent credential creation:

```typescript
import { RSCP } from '@rscp/core';

const credential = RSCP.credential()
  .issuer('SWG', 'IN')
  .holder('Rahul', 'Kumar')
  .level('gold')
  .validFor({ years: 2 })
  .serial(1)
  .build();
```

## Error Types

```typescript
import {
  ProtocolViolationError,
  MissingAttributeError,
  AttributeValidationError,
} from '@rscp/core';

try {
  enforcePublicAttributesOnly({ email: 'test@example.com' });
} catch (e) {
  if (e instanceof ProtocolViolationError) {
    console.log(e.field); // 'email'
    console.log(e.code);  // 'PROTOCOL_VIOLATION'
  }
}
```

## Requirements

- Node.js >= 18.0.0 (for Web Crypto API)
- Modern browsers with Web Crypto API support

## Related Packages

- `@rscp/registry-client` - HTTP client for RSCP registry
- `@rscp/react` - React hooks and components
- `@rscp/node` - Node.js optimizations

## License

Apache-2.0 - see [LICENSE](../../LICENSE) for details.

## Links

- [Documentation](https://rscp.org/docs)
- [Protocol Specification](https://rscp.org/spec)
- [GitHub](https://github.com/rscp-protocol/rscp-sdk)
