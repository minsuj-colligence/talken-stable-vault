# Contributing Guide

Thank you for your interest in contributing to Talken Stable Vault!

## Development Setup

1. **Fork and Clone**

```bash
git clone https://github.com/your-username/talken-stable-vault.git
cd talken-stable-vault
```

2. **Install Dependencies**

```bash
pnpm install
```

3. **Set Up Environment**

```bash
cp apps/yields-backend/.env.example apps/yields-backend/.env
cp apps/operator-api/.env.example apps/operator-api/.env
# Configure each .env file
```

4. **Start Development**

```bash
# Start infrastructure
cd infra/docker
docker-compose up -d postgres redis

# Start services
pnpm dev
```

## Code Standards

### TypeScript

- Use TypeScript strict mode
- Follow ESLint rules
- Add JSDoc comments for public APIs
- Write unit tests for new features

### Solidity

- Use Solidity 0.8.24
- Follow OpenZeppelin patterns
- Add NatSpec comments
- Write Foundry tests

### Rust/Anchor

- Follow Rust formatting (rustfmt)
- Add doc comments
- Write comprehensive tests

## Testing

### EVM Contracts

```bash
cd packages/evm-contracts
forge test
forge test -vvv  # Verbose
forge coverage   # Coverage report
```

### Solana Programs

```bash
cd packages/solana-programs
anchor test
```

### TypeScript

```bash
cd apps/yields-backend
pnpm test
```

## Pull Request Process

1. **Create a Branch**

```bash
git checkout -b feature/your-feature-name
```

2. **Make Changes**

- Write clean, documented code
- Add tests
- Update documentation

3. **Commit**

```bash
git add .
git commit -m "feat: add new feature"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Tests
- `refactor:` Code refactoring
- `chore:` Maintenance

4. **Push and Create PR**

```bash
git push origin feature/your-feature-name
```

Create a pull request on GitHub with:
- Clear description
- Related issue numbers
- Test results
- Screenshots (if UI changes)

## Code Review

All PRs require:
- [ ] Passing tests
- [ ] Code review approval
- [ ] Documentation updates
- [ ] No merge conflicts

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create release tag
4. Deploy to staging
5. Test thoroughly
6. Deploy to production

## Questions?

- Open a GitHub Discussion
- Join our Discord
- Email: dev@talken.io

Thank you for contributing!
