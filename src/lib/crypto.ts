import crypto from 'crypto';

// The key must be exactly 32 bytes (256 bits)
const ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts plaintext data using AES-256-GCM.
 * @param text The plaintext string to encrypt.
 * @returns A formatted string containing IV, Auth Tag, and the Encrypted Text.
 */
export function encryptData(text: string): string {
  if (!ENCRYPTION_KEY) throw new Error('Server misconfiguration: Missing encryption key');
  
  // GCM standard recommends a 12-byte IV
  const iv = crypto.randomBytes(12); 
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // The auth tag ensures the ciphertext hasn't been tampered with
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Return as a single easily storable string format: iv:authTag:encryptedText
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts data previously encrypted by our utility.
 * @param encryptedData The formatted string (iv:authTag:encryptedText).
 * @returns The decrypted plaintext string.
 */
export function decryptData(encryptedData: string): string {
  if (!ENCRYPTION_KEY) throw new Error('Server misconfiguration: Missing encryption key');
  
  const parts = encryptedData.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted data format in database');
  
  const [ivHex, authTagHex, encryptedTextHex] = parts;
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    Buffer.from(ENCRYPTION_KEY, 'hex'), 
    Buffer.from(ivHex, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encryptedTextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}