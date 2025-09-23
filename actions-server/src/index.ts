import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connection, getWallet, getProgramId, isValidPublicKey } from './utils/solana';
import { errorHandler, ActionsError, asyncHandler } from './middleware/errorHandler';
import { actionRequestSchema } from './schemas/validation';
import { handleActionsManifest } from './handlers/manifest';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Enhanced CORS configuration for Actions
const corsOptions = {
  origin: true, // Allow all origins for Actions compatibility
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Accept-Encoding'],
  credentials: false,
};

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Required for Actions
  contentSecurityPolicy: false, // Disable CSP for Actions compatibility
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint with Solana connection status
app.get('/health', asyncHandler(async (req, res) => {
  try {
    // Test Solana connection
    const slot = await connection.getSlot();
    const wallet = getWallet();
    const programId = getProgramId();
    
    res.json({ 
      status: 'ok', 
      message: 'Solana Todo Actions Server is running',
      solana: {
        connected: true,
        slot,
        rpcUrl: process.env.SOLANA_RPC_URL,
        programId: programId.toString(),
        walletPublicKey: wallet.publicKey.toString(),
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    throw new ActionsError('Solana connection failed', 503, 'SOLANA_CONNECTION_ERROR');
  }
}));

// Actions manifest endpoint - follows Solana Actions specification
app.get('/actions.json', handleActionsManifest);

// Basic actions endpoint for testing
app.get('/actions/todo', (req, res) => {
  res.json({
    icon: "https://via.placeholder.com/512x512/000000/FFFFFF?text=TODO",
    title: "Solana Todo App",
    description: "Manage your todos on the Solana blockchain",
    label: "Get Started"
  });
});

// Validation middleware for action requests
app.use('/api/actions/*', (req, res, next) => {
  if (req.method === 'POST') {
    try {
      actionRequestSchema.parse(req.body);
    } catch (error: any) {
      return next(new ActionsError(`Invalid request format: ${error.message}`, 400, 'VALIDATION_ERROR'));
    }
  }
  next();
});

// TODO: Action endpoints will be implemented in subsequent tasks
// Placeholder for create-todo action
app.get('/api/actions/create-todo', (req, res) => {
  res.json({
    icon: "https://via.placeholder.com/512x512/4CAF50/FFFFFF?text=+",
    title: "Create Todo",
    description: "Add a new todo to your blockchain list",
    label: "Create Todo"
  });
});

// Placeholder for complete-todo action
app.get('/api/actions/complete-todo/:todoId', (req, res) => {
  const { todoId } = req.params;
  res.json({
    icon: "https://via.placeholder.com/512x512/2196F3/FFFFFF?text=✓",
    title: "Complete Todo",
    description: `Mark todo ${todoId} as complete`,
    label: "Complete"
  });
});

// Placeholder for delete-todo action
app.get('/api/actions/delete-todo/:todoId', (req, res) => {
  const { todoId } = req.params;
  res.json({
    icon: "https://via.placeholder.com/512x512/F44336/FFFFFF?text=×",
    title: "Delete Todo",
    description: `Delete todo ${todoId} from your list`,
    label: "Delete"
  });
});

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Actions server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Actions manifest: http://localhost:${PORT}/actions.json`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ Solana RPC: ${process.env.SOLANA_RPC_URL}`);
});