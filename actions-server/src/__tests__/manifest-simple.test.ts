import { generateActionsManifest } from '../handlers/manifest';

describe('Simple Manifest Test', () => {
  it('should generate manifest without errors', () => {
    const manifest = generateActionsManifest();
    expect(manifest).toBeDefined();
    expect(manifest.rules).toBeDefined();
    expect(Array.isArray(manifest.rules)).toBe(true);
  });
});