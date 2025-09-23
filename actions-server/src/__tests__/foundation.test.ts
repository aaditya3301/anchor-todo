import { isValidPublicKey } from '../utils/solana';
import { ActionsError } from '../middleware/errorHandler';
import { actionRequestSchema } from '../schemas/validation';

describe('Actions Server Foundation Tests', () => {
  describe('Solana Utilities', () => {
    test('should validate public keys correctly', () => {
      // Valid public key format (base58 encoded, 32 bytes = 44 chars max)
      expect(isValidPublicKey('11111111111111111111111111111112')).toBe(true);
      
      // Invalid formats
      expect(isValidPublicKey('invalid')).toBe(false);
      expect(isValidPublicKey('')).toBe(false);
      expect(isValidPublicKey('too-short')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should create ActionsError with proper properties', () => {
      const error = new ActionsError('Test error', 400, 'TEST_ERROR');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('ActionsError');
    });

    test('should create ActionsError with default values', () => {
      const error = new ActionsError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBeUndefined();
    });
  });

  describe('Validation Schemas', () => {
    test('should validate action request schema', () => {
      const validRequest = {
        account: '11111111111111111111111111111112',
        data: { text: 'test todo' }
      };

      expect(() => actionRequestSchema.parse(validRequest)).not.toThrow();
    });

    test('should accept request without account', () => {
      const validRequest = {
        data: { text: 'test todo' }
      };

      expect(() => actionRequestSchema.parse(validRequest)).not.toThrow();
    });

    test('should accept minimal request', () => {
      const validRequest = {};

      expect(() => actionRequestSchema.parse(validRequest)).not.toThrow();
    });
  });
});