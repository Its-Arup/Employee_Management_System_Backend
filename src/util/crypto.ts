import { ENV } from '../constant';
import crypto from 'crypto';

class Crypto {
    constructor(
        private readonly algorithm: string = 'aes-256-cbc',
        private readonly key = Buffer.from(ENV.ENCRYPTION_KEY, 'hex'), // crypto.randomBytes(32).toString("hex")
        private readonly iv = Buffer.from(ENV.IV, 'hex') // crypto.randomBytes(16).toString("hex")
    ) {}

    encrypt(text: string) {
        const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return encrypted.toString('hex');
    }

    decrypt(text: string) {
        const encryptedText = Buffer.from(text, 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }
}

export const cryptoUtil = new Crypto();
