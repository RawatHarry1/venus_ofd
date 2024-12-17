const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const encryptionKey = 'a7f8a79b34f1e4d7b9d5e3fa20863a2e';
const iv = Buffer.from('1234567890abcdef1234567890abcdef', 'hex');

const encryptData = (data) => {
  try {
    const key = Buffer.from(encryptionKey, 'utf8');

    if (key.length !== 32) {
      throw new Error('Encryption key must be 32 bytes long for AES-256.');
    }

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encryptedData = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encryptedData += cipher.final('hex');
    return { data: encryptedData };
  } catch (err) {
    console.error('Encryption error:', err);
    throw new Error('Encryption failed');
  }
};

const decryptData = (encryptedData) => {
  try {
    const key = Buffer.from(encryptionKey, 'utf8');

    if (key.length !== 32) {
      throw new Error('Encryption key must be 32 bytes long for AES-256.');
    }

    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
    decryptedData += decipher.final('utf8');

    return JSON.parse(decryptedData);
  } catch (err) {
    console.error('Decryption error:', err);
    throw new Error('Decryption failed');
  }
};

module.exports = { encryptData, decryptData };
