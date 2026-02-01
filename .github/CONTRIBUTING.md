# Contributing to RSCP SDK

Thank you for your interest in contributing to RSCP! This document provides guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

1. **Check existing issues** - Make sure the bug hasn't already been reported
2. **Create a detailed issue** with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (Node.js version, OS, etc.)
   - Code samples if applicable

### Suggesting Features

1. **Open a discussion first** - Get community feedback before creating an issue
2. **Describe the use case** - Explain why this feature is needed
3. **Consider alternatives** - What other ways could this be solved?

### Submitting Pull Requests

1. **Fork the repository**
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following our coding standards
4. **Write/update tests** - Maintain >90% coverage
5. **Run the test suite**:
   ```bash
   pnpm test
   pnpm typecheck
   pnpm lint
   ```
6. **Create a changeset** (for user-facing changes):
   ```bash
   pnpm changeset
   ```
7. **Submit the PR** with a clear description

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/rscp-sdk.git
cd rscp-sdk

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

## Project Structure

```
rscp-sdk/
├── packages/
│   ├── core/           # Core library (@rscp/core)
│   │   ├── src/
│   │   │   ├── types/        # Type definitions
│   │   │   ├── identifiers/  # ID generation
│   │   │   ├── check-digits/ # Validation algorithms
│   │   │   ├── protocol/     # Zero-trust enforcement
│   │   │   ├── crypto/       # Signing and hashing
│   │   │   └── utils/        # Utility functions
│   │   └── tests/
│   ├── registry-client/
│   └── react/
├── docs/
└── examples/
```

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer `interface` over `type` for object shapes
- Use explicit return types for public functions
- Document public APIs with JSDoc

### Testing

- Write tests for all new functionality
- Use descriptive test names
- Test edge cases and error conditions
- Maintain >90% code coverage

### Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix a bug
docs: update documentation
test: add tests
refactor: code refactoring
chore: maintenance tasks
```

### Code Style

- Use Prettier for formatting
- Max line length: 100 characters
- Use single quotes for strings
- Use semicolons

## Protocol Changes (RFCs)

For changes to the RSCP protocol itself (not just SDK implementation):

1. Create an RFC document in the `rfcs/` directory
2. Follow the RFC template
3. Submit for TSC review
4. Implement reference in SDK
5. Merge when approved

## Getting Help

- **Discord**: [Join our community](https://discord.gg/rscp)
- **Discussions**: Use GitHub Discussions for questions
- **Issues**: For bugs and feature requests

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.
