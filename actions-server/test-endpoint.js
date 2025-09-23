const express = require('express');
const { handleActionsManifest } = require('./dist/handlers/manifest');

const app = express();
app.get('/actions.json', handleActionsManifest);

const server = app.listen(3001, () => {
  console.log('Test server running on port 3001');
  
  // Make a request to test the endpoint
  const http = require('http');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/actions.json',
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const manifest = JSON.parse(data);
        console.log('Response body:', JSON.stringify(manifest, null, 2));
        console.log('✅ Endpoint test passed!');
      } catch (error) {
        console.error('❌ Failed to parse JSON response:', error.message);
      }
      server.close();
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
    server.close();
  });

  req.end();
});