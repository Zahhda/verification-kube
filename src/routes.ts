import { Router, Request, Response } from 'express';
import { verifyCredential, checkVerificationStatus } from './database';

const router = Router();
const WORKER_ID = process.env.WORKER_ID || 'worker-1';

// POST /verify - Verify a credential
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const credential = req.body;
    
    // Validate request body
    if (!credential || !credential.id) {
      return res.status(400).json({ 
        error: 'Invalid credential format. Must include an id field.',
        worker: WORKER_ID
      });
    }
    
    // Check if credential was previously verified
    const existingVerification = await checkVerificationStatus(credential.id);
    
    if (existingVerification) {
      // Return existing verification
      return res.status(200).json({
        valid: existingVerification.isValid,
        worker: existingVerification.verifiedBy,
        timestamp: new Date(existingVerification.timestamp).toISOString()
      });
    }
    
    // Perform verification (in a real system, this would include more logic)
    const verification = await verifyCredential(credential.id, WORKER_ID);
    
    if (!verification.isValid) {
      return res.status(404).json({
        valid: false,
        message: "Credential not found or invalid",
        worker: WORKER_ID
      });
    }
    
    // Return verification result
    return res.status(200).json({
      valid: verification.isValid,
      worker: WORKER_ID,
      timestamp: new Date(verification.timestamp).toISOString()
    });
  } catch (error) {
    console.error(`[${WORKER_ID}] Error verifying credential:`, error);
    return res.status(500).json({ 
      error: 'Internal server error',
      worker: WORKER_ID
    });
  }
});

export { router };