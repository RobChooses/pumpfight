# PumpFight 🥊

**Combat Sports Token Launchpad on Chiliz/Socios**

PumpFight is a revolutionary token launchpad specifically designed for combat sports, built on the Chiliz Chain ecosystem. Unlike traditional memecoins, PumpFight tokens represent verified fighters with real utility and comprehensive anti-rug protections.

## 🚀 Key Features

### Fighter-First Design
- Every token must be tied to a verified fighter
- Built-in revenue sharing with fighters
- Anti-rug mechanisms protect all stakeholders
- Real utility beyond speculation

### Bonding Curve Economics
- Predictable step-function pricing
- Automatic DEX graduation at 300k tokens
- Built-in liquidity provision
- Transparent price discovery

### Fan Engagement
- Staking rewards for token holders
- On-chain voting for fighter decisions
- Prediction markets for fights
- Exclusive NFT rewards

### Anti-Rug Protection
- 90-day vesting for fighter tokens
- 1-hour sell cooldown period
- 10% maximum sell percentage
- Liquidity locked permanently

## 🏗️ Architecture

### Technology Stack
- **Blockchain**: Chiliz Chain (88888)
- **Smart Contracts**: Solidity 0.8.19 + OpenZeppelin
- **Frontend**: React + Next.js
- **Backend**: Node.js + Express

### Core Contracts
- `PumpFightFactory.sol` - Deploys fighter tokens
- `FighterToken.sol` - CAP-20 token with bonding curve
- `FighterVault.sol` - Staking and utility features

## 🔗 Chiliz/Socios Integration

### Native Features
- Privy wallet integration for Socios Wallet and social logins
- CHZ payment rails
- Fan token synergies
- Existing user base access

### Cross-Token Benefits
- Bonus rewards for Fan Token holders
- Fiat on-ramp via Socios
- KYC/compliance handled
- Co-marketing opportunities

## 📊 Tokenomics

### Bonding Curve Parameters
- Initial Price: 0.0005 CHZ per token
- Step Size: 50,000 tokens per price level
- Price Multiplier: 2x per step
- Graduation Target: 300,000 tokens
- Maximum Supply: 10,000,000 tokens

### Fee Structure
- Fighter Share: 5% of all purchases
- Platform Fee: 2.5% of all purchases
- Creation Fee: 100 CHZ per token launch
- Liquidity Provision: 80% of reserves at graduation

## 🛡️ Security Features

### Smart Contract Security
- OpenZeppelin audited libraries
- Formal verification ready
- Bug bounty program
- Multi-signature controls

### Anti-Manipulation
- Sell cooldown periods
- Maximum sell percentages
- Vesting schedules
- Slippage protection

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Git
- Chiliz wallet (Socios recommended)

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/pumpfight.git
cd pumpfight

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

### Environment Variables
```env
NEXT_PUBLIC_CHILIZ_RPC_URL=https://rpc.chiliz.com
NEXT_PUBLIC_CHILIZ_CHAIN_ID=88888
NEXT_PUBLIC_SOCIOS_APP_ID=your-app-id
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_SECRET=

```

## 🧪 Testing

### Smart Contract Tests
```bash
# Run contract tests
npm run test:contracts

# Run with coverage
npm run test:coverage

# Deploy to testnet
npm run deploy:testnet
```

### Frontend Tests
```bash
# Run frontend tests
npm run test:frontend

# Run E2E tests
npm run test:e2e
```

## 📈 Roadmap

### Phase 1: Core Infrastructure (Weeks 1-4)
- [x] Smart contracts development
- [x] Basic frontend with wallet connection
- [x] Token purchase/sell functionality
- [x] Fighter verification system

### Phase 2: Fighter Features (Weeks 5-8)
- [ ] Fighter dashboard
- [ ] Vault staking mechanism
- [ ] Basic voting system
- [ ] Revenue sharing implementation

### Phase 3: Fan Engagement (Weeks 9-12)
- [ ] Prediction markets
- [ ] NFT rewards system
- [ ] Mobile app development
- [ ] Push notifications

### Phase 4: Socios Integration (Weeks 13-16)
- [ ] Full Socios Wallet integration
- [ ] Cross-token synergies
- [ ] Fiat on-ramp integration
- [ ] Co-marketing campaigns

### Phase 5: Scale & Optimize (Weeks 17-20)
- [ ] Mainnet deployment
- [ ] Security audit completion
- [ ] Performance optimization
- [ ] Analytics dashboard

## 📱 Mobile App

Roadmap for PumpFight mobile includes a React Native mobile app for iOS and Android, optimized for fight fans on the go.

### Features
- Real-time price monitoring
- One-tap token purchases
- Push notifications for fights
- Offline-first architecture

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting pull requests.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **GitHub Issues**: For bug reports and feature requests


## ⚠️ Disclaimer

PumpFight is experimental software. Use at your own risk. Always do your own research before investing in any tokens. Past performance does not guarantee future results.

---

**Built with ❤️ by the PumpFight team**