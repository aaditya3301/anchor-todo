import { Request, Response } from 'express';
import { ActionsManifest, actionsManifestSchema } from '../schemas/actions';

/**
 * Generate the Actions manifest according to Solana Actions specification
 * This manifest defines the routing rules for all todo-related actions
 * 
 * The manifest follows the Solana Actions specification v1.2.1:
 * - Each rule maps a pathPattern to an apiPath
 * - Wildcards (*) are supported for dynamic parameters
 * - All todo operations (create, complete, delete) are included
 */
export function generateActionsManifest(): ActionsManifest {
  const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
  
  const manifest: ActionsManifest = {
    rules: [
      // Rule for create todo action - allows users to add new todos
      {
        pathPattern: "/api/actions/create-todo",
        apiPath: "/api/actions/create-todo"
      },
      // Rule for complete todo action with dynamic todo ID parameter
      {
        pathPattern: "/api/actions/complete-todo/*",
        apiPath: "/api/actions/complete-todo/*"
      },
      // Rule for delete todo action with dynamic todo ID parameter
      {
        pathPattern: "/api/actions/delete-todo/*",
        apiPath: "/api/actions/delete-todo/*"
      },
      // Rule for view todos action - displays user's todo list
      {
        pathPattern: "/api/actions/view-todos",
        apiPath: "/api/actions/view-todos"
      }
    ]
  };

  // Validate the manifest against the schema to ensure compliance
  const validationResult = actionsManifestSchema.safeParse(manifest);
  if (!validationResult.success) {
    const errorDetails = validationResult.error.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    ).join(', ');
    throw new Error(`Invalid actions manifest: ${errorDetails}`);
  }

  return manifest;
}

/**
 * Handle GET /actions.json endpoint
 * Returns the Actions manifest for the todo application
 * 
 * This endpoint must comply with the Solana Actions specification:
 * - Returns JSON with proper Content-Type header
 * - Includes CORS headers for cross-origin access
 * - Provides proper error handling with structured responses
 */
export function handleActionsManifest(req: Request, res: Response): void {
  try {
    const manifest = generateActionsManifest();
    
    // Set headers required by Solana Actions specification
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Accept-Encoding');
    
    // Add caching headers for better performance
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
    
    // Log successful manifest generation for monitoring
    console.log(`Actions manifest served successfully at ${new Date().toISOString()}`);
    
    res.status(200).json(manifest);
  } catch (error) {
    console.error('Error generating actions manifest:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate actions manifest',
      code: 'MANIFEST_GENERATION_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}