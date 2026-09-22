import { Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
} from 'node:crypto';

@Injectable()
export class VendorCryptoService {
  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  normalizeMobile(mobile: string): string {
    return mobile.replace(/\D/g, '').slice(-10);
  }

  normalizePan(pan: string): string {
    return pan.trim().toUpperCase();
  }

  normalizeAadhaar(aadhaar: string): string {
    return aadhaar.replace(/\D/g, '');
  }

  generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  hashOtp(
    challengeId: string,
    email: string,
    otp: string,
  ): string {
    const secret =
      process.env.VENDOR_OTP_HMAC_SECRET;

    if (!secret) {
      throw new Error(
        'VENDOR_OTP_HMAC_SECRET is not configured',
      );
    }

    return createHmac('sha256', secret)
      .update(
        `${challengeId}:${this.normalizeEmail(email)}:${otp}`,
      )
      .digest('hex');
  }

  generateVerificationToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hashToken(token: string): string {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }

  fingerprint(
    type: 'PAN' | 'AADHAAR',
    value: string,
  ): string {
    const secret =
      process.env.VENDOR_IDENTITY_HMAC_SECRET;

    if (!secret) {
      throw new Error(
        'VENDOR_IDENTITY_HMAC_SECRET is not configured',
      );
    }

    return createHmac('sha256', secret)
      .update(`${type}:${value}`)
      .digest('hex');
  }

  encryptSensitive(value: string): string {
    const encodedKey =
      process.env.VENDOR_IDENTITY_ENCRYPTION_KEY;

    if (!encodedKey) {
      throw new Error(
        'VENDOR_IDENTITY_ENCRYPTION_KEY is not configured',
      );
    }

    const key = Buffer.from(encodedKey, 'base64');

    if (key.length !== 32) {
      throw new Error(
        'VENDOR_IDENTITY_ENCRYPTION_KEY must be a base64 encoded 32-byte key',
      );
    }

    const iv = randomBytes(12);

    const cipher = createCipheriv(
      'aes-256-gcm',
      key,
      iv,
    );

    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return [
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }
}