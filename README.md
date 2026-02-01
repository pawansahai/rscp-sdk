# RSCP SDK

Official SDK for the **Road Safety Certification Protocol** - an open standard for privacy-preserving road safety credentials.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)

## What is RSCP?

RSCP (Road Safety Certification Protocol) is an **open, privacy-preserving protocol** for issuing, holding, and verifying road safety certifications for delivery riders and drivers worldwide.

### Key Features

- **Zero-Trust Privacy**: The registry stores ONLY public attributes (name, level, validity). Private data (email, phone, scores) stays with the issuer.
- **Protocol-Enforced**: Privacy is enforced by the schema, not by policies. You can't breach what you don't store.
- **Cryptographically Secure**: All credentials are digitally signed and verifiable.
- **Open Standard**: Anyone can implement RSCP. Join the ecosystem.

### Who Uses RSCP?

- **Driving Schools**: Issue certificates for students
- **Delivery Companies**: Certify riders (Swiggy, Zomato, Uber, etc.)
- **Governments**: National road safety programs
- **Insurance Companies**: Verify driver certifications
- **Verification Apps**: Police, employers, anyone who needs to verify

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| [`@rscp/core`](./packages/core) | Core library - identifiers, signing, validation | ✅ Ready |
| [`@rscp/registry-client`](./packages/registry-client) | HTTP client for RSCP registry | 🚧 Coming |
| [`@rscp/react`](./packages/react) | React hooks and components | 🚧 Coming |
| [`@rscp/node`](./packages/node) | Node.js optimizations | 🚧 Coming |

## Quick Start

```bash
npm install @rscp/core
```

```typescript
import {
  generateCertificateNumber,
  generateVerificationCode,
  enforcePublicAttributesOnly,
  validateCertificateNumber,
} from '@rscp/core';

// Generate a certificate number
const certNumber = generateCertificateNumber({
  year: 2026,
  level: 'gold',
  country: 'IN',
  issuerCode: 'SWG',
  serial: 1,
});
// → 'RS-2026-G-IN-SWG-000001-7'

// Generate a verification code
const verificationCode = generateVerificationCode();
// → 'A3B7K9M2'

// Enforce public-only attributes (zero-trust)
const publicAttributes = enforcePublicAttributesOnly({
  givenName: 'Rahul',
  familyName: 'Kumar',
  level: 'gold',
  validFrom: '2026-01-15',
  validUntil: '2028-01-15',
  // email: 'rahul@example.com', // ❌ Throws ProtocolViolationError!
});

// Validate a certificate number
const isValid = validateCertificateNumber('RS-2026-G-IN-SWG-000001-7');
// → true
```

## Data Separation Model

```
┌─────────────────────────────────────────────────────────────┐
│  FULL CREDENTIAL (issuer keeps this)                        │
├─────────────────────────────────────────────────────────────┤
│  PUBLIC (5 fields)           │  PRIVATE (issuer-only)      │
│  ─────────────────           │  ──────────────────         │
│  • givenName                 │  • email                    │
│  • familyName                │  • phone                    │
│  • level                     │  • testScore                │
│  • validFrom                 │  • hazardScore              │
│  • validUntil                │  • internalRiderId          │
└──────────────────────────────┴──────────────────────────────┘
          │                              │
          ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│  PUBLIC REGISTRY     │      │  ISSUER DATABASE     │
│  (registry.rscp.org) │      │  (your company)      │
│                      │      │                      │
│  ONLY 5 fields       │      │  ALL fields          │
│  No PII possible     │      │  Full control        │
└──────────────────────┘      └──────────────────────┘
```

## Certification Levels

| Level | Training | Test Score | Validity | Use Case |
|-------|----------|-----------|----------|----------|
| **Bronze** | 2 hours | ≥70% | 1 year | Basic safety |
| **Silver** | 4 hours | ≥80% | 1 year | Intermediate |
| **Gold** | 8 hours | ≥85% | 2 years | Professional |

## Certificate Number Format

```
RS-2026-G-IN-SWG-000001-7
│  │    │ │  │   │      └─ ISO 7064 check digit
│  │    │ │  │   └──────── 6-digit serial
│  │    │ │  └──────────── 3-char issuer code
│  │    │ └─────────────── ISO 3166-1 country
│  │    └───────────────── Level (B/S/G)
│  └────────────────────── Year
└───────────────────────── Protocol prefix
```

## Development

```bash
# Clone the repository
git clone https://github.com/rscp-protocol/rscp-sdk.git
cd rscp-sdk

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

## Project Structure

```
rscp-sdk/
├── packages/
│   ├── core/           # @rscp/core - Core library
│   ├── registry-client/# @rscp/registry-client
│   ├── react/          # @rscp/react
│   └── node/           # @rscp/node
├── docs/               # Documentation
├── examples/           # Integration examples
└── .github/            # CI/CD workflows
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines.

### Ways to Contribute

- 🐛 Report bugs
- 💡 Suggest features
- 📖 Improve documentation
- 🔧 Submit pull requests
- 🌍 Translate to other languages

## Governance

RSCP is governed by a Technical Steering Committee (TSC). See [GOVERNANCE.md](.github/GOVERNANCE.md) for details.

## Security

For security issues, please see [SECURITY.md](.github/SECURITY.md).

## Other Language SDKs

Coming soon:
- Python (`rscp`)
- Java (`io.rscp:rscp-sdk`)
- Go (`github.com/rscp-protocol/rscp-go`)
- Rust (`rscp`)
- And more...

## License

Apache-2.0 - see [LICENSE](LICENSE) for details.

---

**RSCP Protocol** - Making road safety certification secure, private, and global.

[Website](https://rscp.org) | [Docs](https://rscp.org/docs) | [Spec](https://rscp.org/spec) | [GitHub](https://github.com/rscp-protocol)
