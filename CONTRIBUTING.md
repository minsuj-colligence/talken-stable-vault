# Contributing Guide

Thank you for your interest in contributing to **Talken Stable Vault**! This guide will help you get started.

## 🚀 Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/your-username/talken-stable-vault.git
cd talken-stable-vault

# Add upstream remote
git remote add upstream https://github.com/minsuj-colligence/talken-stable-vault.git
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install

# Or using npm
npm install
```

### 3. Start Development Servers

```bash
# Terminal 1: Yields Backend (port 3001)
cd apps/yields-backend
npm run dev

# Terminal 2: Dashboard (port 3000)
cd apps/dashboard
npm run dev
```

**Access:**
- Dashboard: http://localhost:3000
- Yields API: http://localhost:3001/api/yields
- WebSocket: ws://localhost:3001/ws

## 📝 Code Standards

### TypeScript/JavaScript

- **Strict Mode**: Use TypeScript strict mode
- **ESLint**: Follow ESLint rules (`npm run lint`)
- **Formatting**: Use Prettier for consistent formatting
- **Comments**: Add JSDoc comments for public APIs
- **Testing**: Write unit tests for new features

Example:
```typescript
/**
 * Calculate weighted average APY for a vault
 * @param strategies - Array of strategies with APY and weight
 * @returns Weighted average APY as percentage
 */
export function calculateWeightedAPY(strategies: Strategy[]): number {
  const totalWeight = strategies.reduce((sum, s) => sum + s.weight, 0)
  const weightedSum = strategies.reduce((sum, s) => sum + s.apy * s.weight, 0)
  return totalWeight > 0 ? weightedSum / totalWeight : 0
}
```

### Solidity (Smart Contracts)

- **Version**: Solidity ^0.8.24
- **Style**: Follow [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- **Security**: Follow OpenZeppelin patterns
- **Comments**: Add NatSpec documentation
- **Testing**: Write comprehensive Foundry tests

Example:
```solidity
/**
 * @notice Deposit assets into vault with permit signature
 * @param assets Amount of assets to deposit
 * @param receiver Address to receive vault shares
 * @param deadline Permit signature deadline
 * @param v, r, s Permit signature components
 * @return shares Amount of shares minted
 */
function depositWithPermit(
    uint256 assets,
    address receiver,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external returns (uint256 shares);
```

### Rust/Anchor (Solana Programs)

- **Formatting**: Run `cargo fmt` before committing
- **Linting**: Run `cargo clippy` to catch common issues
- **Documentation**: Add doc comments with `///`
- **Testing**: Write comprehensive Anchor tests

Example:
```rust
/// Deposit USDC into vault and mint shares
///
/// # Arguments
/// * `ctx` - Deposit context with accounts
/// * `amount` - Amount of USDC to deposit
///
/// # Returns
/// * `Result<()>` - Success or error
#[access_control(ctx.accounts.validate())]
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // Implementation
}
```

## 🧪 Testing

### EVM Contracts (Foundry)

```bash
cd packages/evm-contracts

# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test
forge test --match-test testDepositWithPermit

# Generate coverage report
forge coverage
```

### Solana Programs (Anchor)

```bash
cd packages/solana-programs

# Build program
anchor build

# Run tests
anchor test

# Run specific test file
anchor test --skip-lint tests/deposit.ts
```

### TypeScript/JavaScript

```bash
# Yields Backend
cd apps/yields-backend
npm test

# Dashboard
cd apps/dashboard
npm test

# Run with coverage
npm run test:coverage
```

### End-to-End Testing

```bash
# Start all services first
# Then run E2E tests
npm run test:e2e
```

## 🔄 Pull Request Process

### 1. Create a Feature Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clean, well-documented code
- Add tests for new functionality
- Update documentation (README, CLAUDE.md, etc.)
- Follow code style guidelines

### 3. Commit Your Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
git add .
git commit -m "feat: add 30d average APY calculation"
```

**Commit Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding/updating tests
- `chore:` Maintenance tasks
- `perf:` Performance improvements

### 4. Push and Create PR

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

**PR Checklist:**
- [ ] Clear, descriptive title
- [ ] Detailed description of changes
- [ ] Link to related issues (e.g., "Closes #123")
- [ ] All tests passing
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Screenshots (if UI changes)

### 5. Code Review

Your PR will be reviewed for:
- Code quality and style
- Test coverage
- Documentation completeness
- Security considerations
- Performance impact

Address reviewer feedback and push updates:
```bash
git add .
git commit -m "fix: address review feedback"
git push origin feature/your-feature-name
```

## 🏗️ Project Structure

```
/talken-stable-vault
  /apps
    /dashboard          # Next.js dashboard (port 3000)
    /operator-api       # Operator API (port 3002)
    /yields-backend     # Yields backend (port 3001)
  /packages
    /evm-contracts      # Ethereum/EVM contracts
    /bsc-contracts      # BSC contracts
    /solana-programs    # Solana Anchor programs
    /indexer            # Event indexer
    /sdk                # TypeScript SDK
  /infra
    /docker             # Docker configs
```

## 🐛 Reporting Bugs

1. **Check existing issues** to avoid duplicates
2. **Create new issue** with:
   - Clear title
   - Detailed description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment (OS, Node version, etc.)
   - Screenshots/logs if applicable

## 💡 Suggesting Features

1. **Check roadmap and existing issues**
2. **Open a GitHub Discussion** first
3. **Provide details**:
   - Use case and motivation
   - Proposed solution
   - Alternative approaches
   - Implementation considerations

## 🔐 Security Issues

**DO NOT** open public issues for security vulnerabilities.

Instead:
- Email: security@talken.io
- Provide detailed description
- Include reproduction steps
- We'll respond within 48 hours

## 📚 Documentation

When updating features, also update:
- [ ] `README.md` - Overview and quick start
- [ ] `CLAUDE.md` - Implementation details
- [ ] `DEPLOYMENT.md` - Deployment procedures
- [ ] Code comments and JSDoc/NatSpec
- [ ] API documentation

## 🎨 UI/UX Contributions

For dashboard changes:
- Follow shadcn/ui design system
- Ensure responsive design (mobile/tablet/desktop)
- Test in dark mode
- Include Tailwind classes
- Add loading states and error handling

## 🔧 Development Tips

### Hot Reload Issues

```bash
# Dashboard not updating
cd apps/dashboard
rm -rf .next
npm run dev

# Backend not reflecting changes
cd apps/yields-backend
rm -rf dist
npm run dev
```

### Debugging

```bash
# Enable verbose logging
LOG_LEVEL=debug npm run dev

# Debug TypeScript
node --inspect node_modules/.bin/tsx src/index.ts

# Debug Solidity with Foundry
forge test -vvvv --debug testYourFunction
```

### Common Issues

**Port Already in Use**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill
```

**Module Not Found**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 🚢 Release Process

1. **Update Version**
   ```bash
   npm version patch|minor|major
   ```

2. **Update CHANGELOG.md**
   - Add release notes
   - Document breaking changes

3. **Create Release Tag**
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

4. **Deploy**
   - Staging: Automatic on merge to `develop`
   - Production: Manual trigger or merge to `main`

## 🤝 Community

- **GitHub Discussions**: https://github.com/minsuj-colligence/talken-stable-vault/discussions
- **Issues**: https://github.com/minsuj-colligence/talken-stable-vault/issues
- **Pull Requests**: https://github.com/minsuj-colligence/talken-stable-vault/pulls

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- `CONTRIBUTORS.md` file
- Release notes
- Project documentation

---

**Thank you for contributing to Talken Stable Vault!** 🚀

**Built with [Claude Code](https://claude.com/claude-code)**
