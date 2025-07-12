# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PumpFight is a combat sports token launchpad built on the Chiliz blockchain, inspired by pump.fun but designed specifically for verified fighters. The platform creates fighter tokens with bonding curves, anti-rug mechanisms, and fan engagement features.

## Architecture

### Frontend (Next.js 14)
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom combat sports theme
- **Web3**: Reown (WalletConnect) AppKit for wallet integration
- **Location**: `/app/` directory for pages, `/components/` for UI components

### Smart Contracts (Solidity 0.8.19)
- **PumpFightFactory.sol**: Main factory for creating fighter tokens
- **FighterToken.sol**: ERC20/CAP20 token with bonding curve mechanics
- **FighterVault.sol**: Staking and fan engagement features
- **VerificationRegistry.sol**: Fighter verification system
- **Location**: `/contracts/` directory

### Key Features
- **Bonding Curve**: Step-function price discovery with graduation to DEX
- **Anti-Rug Protection**: Cooldown periods, max sell limits, vesting schedules
- **Fan Utilities**: Staking, voting, prediction markets, revenue sharing
- **Chiliz Integration**: Native CHZ payments, CAP-20 token standard

## Development Commands

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Smart Contract Development
```bash
# Compile contracts
npm run compile
# or
npx hardhat compile

# Run all tests
npm run test
# or
npx hardhat test

# Run specific test file
npx hardhat test test/PumpFight.test.js

# Deploy to Chiliz Spicy testnet
npm run deploy:testnet
# or
npx hardhat run scripts/deploy.js --network chiliz-spicy

# Deploy to Chiliz mainnet
npm run deploy:mainnet
# or
npx hardhat run scripts/deploy.js --network chiliz-mainnet
```

### Testing Individual Components
```bash
# Test specific contract functions
npx hardhat test --grep "should allow buying tokens"

# Test with gas reporting
REPORT_GAS=true npx hardhat test

# Test with coverage
npx hardhat coverage
```

## Project Structure

```
pumpfight/
├── app/                    # Next.js 14 app router pages
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   └── WalletConnect.tsx  # Web3 wallet connection
├── contracts/             # Solidity smart contracts
│   ├── PumpFightFactory.sol
│   ├── FighterToken.sol
│   ├── FighterVault.sol
│   └── VerificationRegistry.sol
├── interfaces/            # Solidity interfaces
│   ├── ICAP20.sol
│   └── IVerificationRegistry.sol
├── test/                  # Contract tests
│   ├── PumpFight.test.js
│   └── Debug.test.js
├── scripts/               # Deployment scripts
│   └── deploy.js
├── config/               # Configuration files
│   └── index.ts
└── context/              # React context providers
    └── index.tsx
```

## Smart Contract Architecture

### Core Contracts Flow
1. **VerificationRegistry**: Whitelists legitimate fighters
2. **PumpFightFactory**: Creates new fighter tokens (requires verification)
3. **FighterToken**: ERC20 token with bonding curve mechanics
4. **FighterVault**: Handles staking, voting, and fan engagement

### Key Contract Functions
- `createFighterToken()`: Deploy new fighter token (100 CHZ fee)
- `buy()`: Purchase tokens via bonding curve
- `sell()`: Sell tokens with anti-rug restrictions
- `stake()`: Stake tokens in vault for utilities
- `createVote()`: Create fan voting proposals

## Development Workflow

### Adding New Features
1. Write failing tests first (`test/` directory)
2. Implement smart contract changes
3. Update frontend components if needed
4. Run full test suite: `npm run test`
5. Deploy to testnet for integration testing

### Testing Strategy
- Unit tests for all contract functions
- Integration tests for cross-contract interactions
- Anti-rug mechanism tests (cooldowns, limits)
- Bonding curve mathematics verification
- Gas optimization testing

## Network Configuration

### Chiliz Spicy Testnet
- Chain ID: 88882
- RPC: https://spicy-rpc.chiliz.com/
- Explorer: https://spicy-blockscout.chiliz.com/

### Chiliz Mainnet
- Chain ID: 88888
- RPC: https://rpc.chiliz.com/
- Explorer: https://blockscout.chiliz.com/

## Environment Variables

Required for deployment:
```bash
PRIVATE_KEY=your_private_key
NEXT_PUBLIC_VERIFICATION_REGISTRY_ADDRESS=deployed_registry_address
NEXT_PUBLIC_FACTORY_ADDRESS=deployed_factory_address
NEXT_PUBLIC_CHILIZ_CHAIN_ID=88882  # or 88888 for mainnet
```

## Common Issues & Solutions

### Contract Deployment
- Ensure sufficient CHZ balance for gas fees
- Use `--network chiliz-spicy` for testnet deployments
- Check network configuration in hardhat.config.js

### Testing
- Use `network.provider.send("evm_increaseTime", [3600])` for time-based tests
- Reset hardhat network between tests for clean state
- Mock external dependencies like Chainlink VRF

### Frontend Development
- Web3 components must be client-side (`'use client'`)
- Wallet connection requires proper network configuration
- Contract interactions need proper error handling

## Security Considerations

- All contracts use OpenZeppelin security modules
- Anti-rug mechanisms implemented at token level
- Access controls for administrative functions
- Slippage protection for bonding curve trades
- Emergency pause functionality for critical issues

## Integration Points

### Chiliz/Socios Integration
- CAP-20 token standard compliance
- Native CHZ payment processing
- Future Socios wallet SDK integration
- Fan token synergies (planned)

### External Services
- Chainlink VRF for prediction randomness (planned)
- IPFS for fighter metadata storage (planned)
- Blockscout for transaction verification