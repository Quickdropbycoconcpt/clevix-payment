import * as crypto from 'node:crypto';

function build3DesKey(secret: string): Buffer {
  const digest = crypto.createHash('md5').update(secret, 'utf8').digest();

  const key = Buffer.alloc(24);
  digest.copy(key, 0, 0, 16);
  digest.copy(key, 16, 0, 8);

  return key;
}

export function tripleDESEncrypt(data: string, sessionId: string): string {
  const key = build3DesKey(sessionId);
  const iv = Buffer.alloc(8);

  const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);

  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  return encrypted;
}

export function tripleDESDecrypt(message: string, sessionId: string): string {
  const key = build3DesKey(sessionId);
  const iv = Buffer.alloc(8);

  const decipher = crypto.createDecipheriv('des-ede3-cbc', key, iv);

  let decrypted = decipher.update(message, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function base64Encoded(value: string): string {
  const base64 = Buffer.from(value).toString('base64');
  return base64;
}

// pos-data-code.util.ts
export type TransactionType = 'contactless' | 'contact';

export function buildPosDataCode(transactionType: TransactionType): string {
  let pos = '';

  pos += '9'; // Pos 1: terminal card data input capability — ICC (CONFIRM with processor)
  pos += '1'; // Pos 2: cardholder auth capability — PIN
  pos += '0'; // Pos 3: card capture capability — none
  pos += '1'; // Pos 4: operating environment — attended, on merchant premise
  pos += '0'; // Pos 5: cardholder present
  pos += '1'; // Pos 6: card present

  // Pos 7: actual card data input mode — varies by transaction type
  switch (transactionType) {
    case 'contactless':
      pos += '5'; // ICC (contact chip)
      break;
    case 'contact':
      pos += '7'; // Contactless ICC
      break;
    default:
      pos += '0'; // Unknown
      break;
  }

  pos += '1'; // Pos 8: actual cardholder auth method — PIN
  pos += '3'; // Pos 9: cardholder auth entity — CONFIRM with processor
  pos += '1'; // Pos 10: card data output capability — none
  pos += '3'; // Pos 11: terminal output capability — Display only
  pos += '6'; // Pos 12: PIN capture capability — six characters
  pos += '1'; // Pos 13: terminal operator — card acceptor operated
  pos += '01'; // Pos 14-15: terminal type — POS

  return pos;
}
