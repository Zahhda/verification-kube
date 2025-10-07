const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Verify credential endpoint
app.post('/verify', (req, res) => {
  try {
    const credential = req.body;
    
    if (!credential || !credential.id) {
      return res.status(400).json({ error: 'Invalid credential format. Must include an id.' });
    }
    
    // Check issuance service data
    const issuanceDbPath = path.join(__dirname, '..', 'issuance-service', 'data', 'credentials.json');
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
        console.error('Error reading issuance credentials file:', err);
      }
    }
    
    // Store verification result
    const verificationDbFile = path.join(dataDir, 'verifications.json');
    let existingVerifications = [];
    
    if (fs.existsSync(verificationDbFile)) {
      try {
        existingVerifications = JSON.parse(fs.readFileSync(verificationDbFile, 'utf8'));
      } catch (err) {
        console.error('Error reading verifications file:', err);
      }
    }
    
    existingVerifications.push(verificationResult);
    fs.writeFileSync(verificationDbFile, JSON.stringify(existingVerifications, null, 2));
    
    if (!isValid) {
      return res.status(404).json(verificationResult);
    }
    
    res.status(200).json(verificationResult);
  } catch (error) {
    console.error('Error verifying credential:', error);
    res.status(500).json({ error: 'Failed to verify credential' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'verification-service' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Verification service running on port ${PORT}`);
});