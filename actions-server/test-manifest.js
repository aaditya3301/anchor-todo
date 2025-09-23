const { generateActionsManifest } = require('./dist/handlers/manifest');

try {
  console.log('Testing manifest generation...');
  const manifest = generateActionsManifest();
  console.log('Manifest generated successfully:');
  console.log(JSON.stringify(manifest, null, 2));
  console.log('Test passed!');
} catch (error) {
  console.error('Test failed:', error.message);
  process.exit(1);
}