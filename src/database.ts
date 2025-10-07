import sqlite3 from 'sqlite3';
import { resolve } from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || resolve(__dirname, '../data/verification.db');

// Ensure data directory exists
const dataDir = resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
export const db = new sqlite3.Database(DB_PATH);

// Initialize database with required tables
export const initializeDatabase = (): void => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS verifications (
        id TEXT PRIMARY KEY,
        verified_at INTEGER NOT NULL,
        verified_by TEXT NOT NULL,
        status TEXT NOT NULL
      )
    `);
  });
  
  console.log(`Database initialized at ${DB_PATH}`);
};

// Verify a credential
export const verifyCredential = (
  id: string,
  verifiedBy: string
): Promise<{ isValid: boolean; timestamp: number }> => {
  return new Promise((resolve, reject) => {
    const verifiedAt = Date.now();
    const status = 'valid'; // In a real system, we would perform actual verification logic
    
    db.run(
      'INSERT OR REPLACE INTO verifications (id, verified_at, verified_by, status) VALUES (?, ?, ?, ?)',
      [id, verifiedAt, verifiedBy, status],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ isValid: true, timestamp: verifiedAt });
        }
      }
    );
  });
};

// Check if a credential has been verified before
export const checkVerificationStatus = (id: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM verifications WHERE id = ?',
      [id],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row) {
            resolve({
              isValid: row.status === 'valid',
              timestamp: row.verified_at,
              verifiedBy: row.verified_by
            });
          } else {
            // Check with issuance service database
            const issuanceDbPath = process.env.ISSUANCE_DB_PATH || resolve(__dirname, '../../issuance-service/data/credentials.db');
            
            if (fs.existsSync(issuanceDbPath)) {
              const issuanceDb = new sqlite3.Database(issuanceDbPath);
              issuanceDb.get(
                'SELECT * FROM credentials WHERE id = ?',
                [id],
                (err, credRow) => {
                  issuanceDb.close();
                  if (err) {
                    resolve(null);
                  } else {
                    if (credRow) {
                      // Credential exists in issuance database
                      resolve({
                        isValid: true,
                        timestamp: Date.now(),
                        verifiedBy: 'verification-service'
                      });
                    } else {
                      resolve(null);
                    }
                  }
                }
              );
            } else {
              resolve(null);
            }
          }
        }
      }
    );
  });
};