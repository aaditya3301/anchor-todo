# Solana Todo App

A decentralized todo application built on the Solana blockchain using the Anchor framework. This application leverages Solana Actions and Blinks to provide seamless blockchain interactions through shareable links, while maintaining a traditional web frontend for enhanced user experience.

## Features

- **Decentralized Storage**: All todos are stored permanently on the Solana blockchain
- **Solana Actions**: Standardized API endpoints for blockchain interactions
- **Blinks Integration**: Shareable interactive links for todo operations
- **Modern Frontend**: React-based UI with wallet integration
- **Real-time Updates**: Automatic synchronization with blockchain state

## Project Structure

```
solana-todo-app/
├── programs/
│   └── solana-todo-app/          # Anchor smart contract
├── actions-server/               # Express.js Actions API server
├── frontend/                     # React frontend application
├── tests/                        # Integration tests
├── Anchor.toml                   # Anchor configuration
└── package.json                  # Root package configuration
```

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://rustup.rs/)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor Framework](https://www.anchor-lang.com/docs/installation)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd solana-todo-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install workspace dependencies**
   ```bash
   npm run install:all
   ```

## Development Setup

### 1. Configure Solana CLI

Set up your Solana CLI for local development:

```bash
# Set to localhost for local development
solana config set --url localhost

# Create a new keypair (if you don't have one)
solana-keygen new

# Get your public key
solana address
```

### 2. Start Local Solana Validator

In a separate terminal, start the local Solana test validator:

```bash
solana-test-validator
```

### 3. Build and Deploy Smart Contract

```bash
# Build the Anchor program
anchor build

# Deploy to local validator
anchor deploy
```

### 4. Start Development Servers

You can start both the Actions server and frontend simultaneously:

```bash
# Start both servers
npm run dev
```

Or start them individually:

```bash
# Start Actions server (port 8080)
npm run actions-server

# Start frontend (port 3000)
npm run frontend
```

## Available Scripts

### Root Level
- `npm run build` - Build the Anchor program
- `npm run deploy` - Deploy the program to configured cluster
- `npm run test` - Run Anchor tests
- `npm run dev` - Start both Actions server and frontend
- `npm run actions-server` - Start Actions server only
- `npm run frontend` - Start frontend only

### Actions Server
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Start development server with hot reload
- `npm run start` - Start production server
- `npm run test` - Run Jest tests

### Frontend
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run Vitest tests
- `npm run lint` - Run ESLint

## Environment Configuration

### Actions Server

Create a `.env` file in the `actions-server` directory:

```env
PORT=8080
SOLANA_RPC_URL=http://localhost:8899
PROGRAM_ID=<your-program-id>
WALLET_PRIVATE_KEY=<your-wallet-private-key>
```

### Frontend

Create a `.env` file in the `frontend` directory:

```env
VITE_SOLANA_RPC_URL=http://localhost:8899
VITE_PROGRAM_ID=<your-program-id>
VITE_ACTIONS_API_URL=http://localhost:8080
```

## Testing

### Smart Contract Tests
```bash
anchor test
```

### Actions Server Tests
```bash
cd actions-server
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Deployment

### Devnet Deployment

1. Configure Solana CLI for devnet:
   ```bash
   solana config set --url devnet
   ```

2. Airdrop SOL for deployment:
   ```bash
   solana airdrop 2
   ```

3. Deploy the program:
   ```bash
   anchor deploy
   ```

4. Update environment variables with devnet configuration

### Production Deployment

For mainnet deployment, follow similar steps but use mainnet-beta cluster and ensure you have sufficient SOL for deployment costs.

## Architecture

The application consists of four main components:

1. **Smart Contract**: Anchor-based program handling todo storage and operations
2. **Actions Server**: Express.js API implementing Solana Actions specification
3. **Blinks System**: URL generation and handling for shareable interactions
4. **Frontend**: React application providing user interface

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions and support, please open an issue in the GitHub repository.