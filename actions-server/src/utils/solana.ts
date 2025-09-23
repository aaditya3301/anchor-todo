import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Solana connection
export const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'http://localhost:8899',
  'confirmed'
);

// Initialize wallet from private key
export function getWallet(): Keypair {
  const privateKeyString = process.env.WALLET_PRIVATE_KEY;
  if (!privateKeyString) {
    throw new Error('WALLET_PRIVATE_KEY environment variable is required');
  }

  try {
    const privateKeyArray = JSON.parse(privateKeyString);
    return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
  } catch (error) {
    throw new Error('Invalid WALLET_PRIVATE_KEY format. Expected JSON array of numbers.');
  }
}

// Get program ID from environment
export function getProgramId(): PublicKey {
  const programIdString = process.env.PROGRAM_ID;
  if (!programIdString) {
    throw new Error('PROGRAM_ID environment variable is required');
  }

  try {
    return new PublicKey(programIdString);
  } catch (error) {
    throw new Error('Invalid PROGRAM_ID format');
  }
}

// Create Anchor provider
export function createProvider(): AnchorProvider {
  const wallet = getWallet();
  const walletAdapter = new Wallet(wallet);
  
  return new AnchorProvider(
    connection,
    walletAdapter,
    { commitment: 'confirmed' }
  );
}

// Validate Solana public key
export function isValidPublicKey(key: string): boolean {
  try {
    new PublicKey(key);
    return true;
  } catch {
    return false;
  }
}

// Get account info with error handling
export async function getAccountInfo(publicKey: PublicKey) {
  try {
    return await connection.getAccountInfo(publicKey);
  } catch (error) {
    console.error('Error fetching account info:', error);
    return null;
  }
}