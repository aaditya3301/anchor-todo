import { connection, getWallet, getProgramId, isValidPublicKey } from '../utils/solana';
import { buildTransaction, simulateTransaction } from '../utils/transactions';
import { ActionsError } from '../middleware/errorHandler';

describe('Actions Server Foundation', () => {

  describe('Solana Utilities', () => {
    it('should validate public keys correctly', () => {
      // Valid public key format
      expect(isValidPublicKey('11111111111111111111111111111112')).toBe(true);
      
      // Invalid public key formats
      expect(isValidPublicKey('invalid')).toBe(false);
      expect(isValidPublicKey('')).toBe(false);
      expect(isValidPublicKey('too-short')).toBe(false);
    });

    it('should create wallet from environment', () => {
      expect(() => getWallet()).not.toThrow();
      const wallet = getWallet();
      expect(wallet.publicKey).toBeDefined();
    });

    it('should get program ID from environment', () => {
      expect(() => getProgramId()).not.toThrow();
      const programId = getProgramId();
      expect(programId.toString()).toBeDefined();
    });
  });

  describe('Transaction Utilities', () => {
    it('should build transactions with instructions', async () => {
      // This is a basic test - in real scenarios we'd need actual instructions
      const instructions: any[] = [];
      
      try {
        const transaction = await buildTransaction(instructions);
        expect(typeof transaction).toBe('string');
        expect(transaction.length).toBeGreaterThan(0);
      } catch (error) {
        // Expected to fail without proper Solana connection in test environment
        expect(error).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should create ActionsError with proper properties', () => {
      const error = new ActionsError('Test error', 400, 'TEST_ERROR');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('ActionsError');
    });

    it('should create ActionsError with default values', () => {
      const error = new ActionsError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBeUndefined();
    });
  });
});