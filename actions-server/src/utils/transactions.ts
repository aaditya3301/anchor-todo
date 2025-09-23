import { 
  Transaction, 
  TransactionInstruction, 
  PublicKey, 
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { connection, getWallet } from './solana';

export interface TransactionResult {
  transaction: string;
  message: string;
}

export interface TransactionError {
  error: string;
  message: string;
}

// Build and serialize transaction
export async function buildTransaction(
  instructions: TransactionInstruction[],
  payer?: PublicKey
): Promise<string> {
  const wallet = getWallet();
  const payerKey = payer || wallet.publicKey;

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash('confirmed');

  // Create transaction
  const transaction = new Transaction({
    feePayer: payerKey,
    recentBlockhash: blockhash,
  });

  // Add instructions
  transaction.add(...instructions);

  // Serialize transaction
  const serializedTransaction = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return serializedTransaction.toString('base64');
}

// Sign and send transaction
export async function signAndSendTransaction(
  transaction: Transaction
): Promise<string> {
  const wallet = getWallet();

  // Sign transaction
  transaction.sign(wallet);

  // Send transaction
  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
    {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    }
  );

  // Confirm transaction
  await connection.confirmTransaction(signature, 'confirmed');

  return signature;
}

// Simulate transaction before sending
export async function simulateTransaction(
  transaction: Transaction
): Promise<boolean> {
  try {
    const simulation = await connection.simulateTransaction(transaction);
    
    if (simulation.value.err) {
      console.error('Transaction simulation failed:', simulation.value.err);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error simulating transaction:', error);
    return false;
  }
}

// Check if account has sufficient balance for transaction
export async function checkBalance(
  publicKey: PublicKey,
  requiredLamports: number = 0.01 * LAMPORTS_PER_SOL
): Promise<boolean> {
  try {
    const balance = await connection.getBalance(publicKey);
    return balance >= requiredLamports;
  } catch (error) {
    console.error('Error checking balance:', error);
    return false;
  }
}

// Create account instruction helper
export async function createAccountInstruction(
  payer: PublicKey,
  newAccount: PublicKey,
  space: number,
  programId: PublicKey
): Promise<TransactionInstruction> {
  const lamports = await connection.getMinimumBalanceForRentExemption(space);
  
  return SystemProgram.createAccount({
    fromPubkey: payer,
    newAccountPubkey: newAccount,
    lamports,
    space,
    programId,
  });
}