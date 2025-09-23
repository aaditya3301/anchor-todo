import request from 'supertest';
import express from 'express';
import { handleActionsManifest, generateActionsManifest } from '../handlers/manifest';
import { actionsManifestSchema } from '../schemas/actions';

// Create test app
const app = express();
app.get('/actions.json', handleActionsManifest);

describe('Actions Manifest Endpoint', () => {
  describe('GET /actions.json', () => {
    it('should return a valid actions manifest', async () => {
      const response = await request(app)
        .get('/actions.json')
        .expect(200);

      // Verify response headers
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe('GET, POST, OPTIONS');
      expect(response.headers['cache-control']).toBe('public, max-age=300');

      // Verify response structure
      expect(response.body).toHaveProperty('rules');
      expect(Array.isArray(response.body.rules)).toBe(true);
      expect(response.body.rules.length).toBeGreaterThan(0);
    });

    it('should include all required todo action rules', async () => {
      const response = await request(app)
        .get('/actions.json')
        .expect(200);

      const { rules } = response.body;
      
      // Check for create todo rule
      const createTodoRule = rules.find((rule: any) => 
        rule.pathPattern === '/api/actions/create-todo'
      );
      expect(createTodoRule).toBeDefined();
      expect(createTodoRule.apiPath).toBe('/api/actions/create-todo');

      // Check for complete todo rule with wildcard
      const completeTodoRule = rules.find((rule: any) => 
        rule.pathPattern === '/api/actions/complete-todo/*'
      );
      expect(completeTodoRule).toBeDefined();
      expect(completeTodoRule.apiPath).toBe('/api/actions/complete-todo/*');

      // Check for delete todo rule with wildcard
      const deleteTodoRule = rules.find((rule: any) => 
        rule.pathPattern === '/api/actions/delete-todo/*'
      );
      expect(deleteTodoRule).toBeDefined();
      expect(deleteTodoRule.apiPath).toBe('/api/actions/delete-todo/*');

      // Check for view todos rule
      const viewTodosRule = rules.find((rule: any) => 
        rule.pathPattern === '/api/actions/view-todos'
      );
      expect(viewTodosRule).toBeDefined();
      expect(viewTodosRule.apiPath).toBe('/api/actions/view-todos');
    });

    it('should return manifest that validates against Solana Actions schema', async () => {
      const response = await request(app)
        .get('/actions.json')
        .expect(200);

      // Validate against the schema
      const validationResult = actionsManifestSchema.safeParse(response.body);
      expect(validationResult.success).toBe(true);
      
      if (!validationResult.success) {
        console.error('Schema validation errors:', validationResult.error.errors);
      }
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/actions.json')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe('GET, POST, OPTIONS');
    });

    it('should include proper caching headers', async () => {
      const response = await request(app)
        .get('/actions.json')
        .expect(200);

      expect(response.headers['cache-control']).toBe('public, max-age=300');
    });
  });

  describe('generateActionsManifest function', () => {
    it('should generate a valid manifest object', () => {
      const manifest = generateActionsManifest();
      
      expect(manifest).toHaveProperty('rules');
      expect(Array.isArray(manifest.rules)).toBe(true);
      expect(manifest.rules.length).toBe(4);
    });

    it('should include all required rule properties', () => {
      const manifest = generateActionsManifest();
      
      manifest.rules.forEach(rule => {
        expect(rule).toHaveProperty('pathPattern');
        expect(rule).toHaveProperty('apiPath');
        expect(typeof rule.pathPattern).toBe('string');
        expect(typeof rule.apiPath).toBe('string');
        expect(rule.pathPattern.length).toBeGreaterThan(0);
        expect(rule.apiPath.length).toBeGreaterThan(0);
      });
    });

    it('should validate against the actions manifest schema', () => {
      const manifest = generateActionsManifest();
      const validationResult = actionsManifestSchema.safeParse(manifest);
      
      expect(validationResult.success).toBe(true);
    });

    it('should include wildcard patterns for dynamic routes', () => {
      const manifest = generateActionsManifest();
      
      const wildcardRules = manifest.rules.filter(rule => 
        rule.pathPattern.includes('*')
      );
      
      expect(wildcardRules.length).toBe(2); // complete-todo/* and delete-todo/*
      
      wildcardRules.forEach(rule => {
        expect(rule.pathPattern).toMatch(/\/\*$/);
        expect(rule.apiPath).toMatch(/\/\*$/);
      });
    });

    it('should throw error for invalid manifest data', () => {
      // Mock environment to cause validation failure
      const originalEnv = process.env.BASE_URL;
      
      // Test with invalid schema by mocking the schema validation
      const originalParse = actionsManifestSchema.safeParse;
      actionsManifestSchema.safeParse = jest.fn().mockReturnValue({
        success: false,
        error: {
          errors: [{ path: ['rules'], message: 'Test validation error' }]
        }
      });

      expect(() => generateActionsManifest()).toThrow('Invalid actions manifest: rules: Test validation error');
      
      // Restore original function
      actionsManifestSchema.safeParse = originalParse;
      process.env.BASE_URL = originalEnv;
    });
  });

  describe('Solana Actions Specification Compliance', () => {
    it('should follow the correct URL pattern format', async () => {
      const response = await request(app)
        .get('/actions.json')
        .expect(200);

      const { rules } = response.body;
      
      rules.forEach((rule: any) => {
        // Path patterns should start with /
        expect(rule.pathPattern).toMatch(/^\//);
        expect(rule.apiPath).toMatch(/^\//);
        
        // API paths should match path patterns
        expect(rule.apiPath).toBe(rule.pathPattern);
      });
    });

    it('should support dynamic parameters with wildcards', async () => {
      const response = await request(app)
        .get('/actions.json')
        .expect(200);

      const { rules } = response.body;
      
      // Find rules with dynamic parameters
      const dynamicRules = rules.filter((rule: any) => 
        rule.pathPattern.includes('*')
      );
      
      expect(dynamicRules.length).toBeGreaterThan(0);
      
      dynamicRules.forEach((rule: any) => {
        expect(rule.pathPattern).toContain('*');
        expect(rule.apiPath).toContain('*');
      });
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/actions.json')
        .expect(200);

      expect(response.type).toBe('application/json');
    });

    it('should be accessible from any origin (CORS)', async () => {
      const response = await request(app)
        .get('/actions.json')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });

  describe('Error Handling', () => {
    it('should handle manifest generation errors gracefully', async () => {
      // Create a test app that will throw an error
      const errorApp = express();
      errorApp.get('/actions.json', (req, res) => {
        // Mock an error in manifest generation
        throw new Error('Test error');
      });

      const response = await request(errorApp)
        .get('/actions.json')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});