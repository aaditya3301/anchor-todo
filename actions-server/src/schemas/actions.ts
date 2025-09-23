import { z } from 'zod';

// Solana Actions specification schemas

// Action metadata schema
export const actionMetadataSchema = z.object({
  icon: z.string().url('Icon must be a valid URL'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  label: z.string().min(1, 'Label is required'),
  disabled: z.boolean().optional(),
  links: z.object({
    actions: z.array(z.object({
      label: z.string(),
      href: z.string(),
      parameters: z.array(z.object({
        name: z.string(),
        label: z.string().optional(),
        required: z.boolean().optional(),
      })).optional(),
    })).optional(),
  }).optional(),
});

// Actions manifest rule schema
export const actionRuleSchema = z.object({
  pathPattern: z.string().min(1, 'Path pattern is required'),
  apiPath: z.string().min(1, 'API path is required'),
});

// Actions manifest schema
export const actionsManifestSchema = z.object({
  rules: z.array(actionRuleSchema).min(1, 'At least one rule is required'),
});

// Action parameter schema
export const actionParameterSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  required: z.boolean().optional(),
});

// Action link schema
export const actionLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
  parameters: z.array(actionParameterSchema).optional(),
});

// Complete action response schema
export const actionGetResponseSchema = z.object({
  icon: z.string().url(),
  title: z.string(),
  description: z.string(),
  label: z.string(),
  disabled: z.boolean().optional(),
  links: z.object({
    actions: z.array(actionLinkSchema).optional(),
  }).optional(),
});

// Action POST response schema
export const actionPostResponseSchema = z.object({
  transaction: z.string(),
  message: z.string(),
  links: z.object({
    next: actionGetResponseSchema.optional(),
  }).optional(),
});

// Export types
export type ActionMetadata = z.infer<typeof actionMetadataSchema>;
export type ActionRule = z.infer<typeof actionRuleSchema>;
export type ActionsManifest = z.infer<typeof actionsManifestSchema>;
export type ActionParameter = z.infer<typeof actionParameterSchema>;
export type ActionLink = z.infer<typeof actionLinkSchema>;
export type ActionGetResponse = z.infer<typeof actionGetResponseSchema>;
export type ActionPostResponse = z.infer<typeof actionPostResponseSchema>;