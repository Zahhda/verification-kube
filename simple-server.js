require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

// Environment variables
const PORT = process.env.PORT || 3002;
const SERVICE_NAME = process.env.SERVICE_NAME || 'Verification Service';
const DATA_DIR = process.env.DATA_DIR || './data';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const ISSUANCE_SERVICE_PATH = process.env.ISSUANCE_SERVICE_PATH || '../issuance-service';

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, DATA_DIR);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
  console.log(`📁 Created data directory: ${dataDir}`);
}

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      status: 'ok', 
      service: SERVICE_NAME,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Verify credential endpoint
  if (req.method === 'POST' && req.url === '/verify') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const credential = JSON.parse(body);
        
        if (!credential || !credential.id) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid credential format. Must include an id.' }));
          return;
        }
        
        // Check issuance service data
        const issuanceDbPath = path.join(__dirname, ISSUANCE_SERVICE_PATH, DATA_DIR, 'credentials.json');
        let isValid = false;
        let verificationResult = {
          id: credential.id,
          isValid: false,
          verifiedAt: new Date().toISOString(),
          reason: 'Credential not found'
        };
        
        if (fs.existsSync(issuanceDbPath)) {
          try {
            const issuedCredentials = JSON.parse(fs.readFileSync(issuanceDbPath, 'utf8'));
            const foundCredential = issuedCredentials.find(cred => cred.id === credential.id);
            
            if (foundCredential) {
              isValid = true;
              verificationResult = {
                id: credential.id,
                isValid: true,
                verifiedAt: new Date().toISOString(),
                issuer: foundCredential.issuer || 'Unknown',
                issuedAt: foundCredential.issuedAt,
                status: foundCredential.status || 'valid'
              };
            }
          } catch (err) {
            console.error('❌ Error reading issuance credentials file:', err);
          }
        }
        
        // Store verification result
        const verificationDbFile = path.join(dataDir, 'verifications.json');
        let existingVerifications = [];
        
        if (fs.existsSync(verificationDbFile)) {
          try {
            existingVerifications = JSON.parse(fs.readFileSync(verificationDbFile, 'utf8'));
          } catch (err) {
            console.error('❌ Error reading verifications file:', err);
          }
        }
        
        existingVerifications.push(verificationResult);
        fs.writeFileSync(verificationDbFile, JSON.stringify(existingVerifications, null, 2));
        
        console.log(`🔍 Credential verified: ${credential.id} - ${isValid ? '✅ Valid' : '❌ Invalid'}`);
        
        if (!isValid) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(verificationResult));
          return;
        }
        
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(verificationResult));
      } catch (error) {
        console.error('❌ Error verifying credential:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Failed to verify credential' }));
      }
    });
    
    return;
  }

  // Not found
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║  🚀 ${SERVICE_NAME} is running!            ║
║                                            ║
║  📡 Port: ${PORT}                          ║
║  🌐 Environment: ${process.env.NODE_ENV || 'development'} ║
║  📂 Data directory: ${DATA_DIR}            ║
║                                            ║
║  Health check: http://localhost:${PORT}/health ║
║                                            ║
╚════════════════════════════════════════════╝
  `);
});