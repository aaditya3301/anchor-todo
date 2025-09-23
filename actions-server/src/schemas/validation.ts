import { z } from 'zod';

// Solana public key validation
const publicKeySchema = z.string().refine(
  (key) => {
    try {
      // Basic length and character validation for Solana public keys
      return key.length >= 32 && key.length <= 44 && /^[A-Za-z0-9]+$/.test(key);
    } catch {
      return false;
    }
  },
  { message: 'Invalid Solana public key format' }
);

// Todo text validation
const todoTextSchema = z.string()
  .min(1, 'Todo text cannot be empty')
  .max(280, 'Todo text cannot exceed 280 characters')
  .trim();

// Create todo request schema
export const createTodoSchema = z.object({
  account: publicKeySchema.optional(),
  data: z.object({
    text: todoTextSchema,
  }),
});

// Complete todo request schema
export const completeTodoSchema = z.object({
  account: publicKeySchema.optional(),
  data: z.object({
    todoId: z.string().or(z.number()),
  }),
});

// Delete todo request schema
export const deleteTodoSchema = z.object({
  account: publicKeySchema.optional(),
  data: z.object({
    todoId: z.string().or(z.number()),
  }),
});

// Generic action request schema
export const actionRequestSchema = z.object({
  account: publicKeySchema.optional(),
  data: z.record(z.any()).optional(),
});

// Action response schema
export const actionResponseSchema = z.object({
  transaction: z.string(),
  message: z.string(),
  links: z.object({
    next: z.object({
      type: z.string(),
      href: z.string(),
    }).optional(),
  }).optional(),
});

// Error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  code: z.string().optional(),
  timestamp: z.string(),
});

export type CreateTodoRequest = z.infer<typeof createTodoSchema>;
export type CompleteTodoRequest = z.infer<typeof completeTodoSchema>;
export type DeleteTodoRequest = z.infer<typeof deleteTodoSchema>;
export type ActionRequest = z.infer<typeof actionRequestSchema>;
export type ActionResponse = z.infer<typeof actionResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;