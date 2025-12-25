import crypto from 'crypto';
import { logger } from './logger';

class TokenGenerator {
    /**
     * Generate a secure random token for email verification, password reset, etc.
     * Uses URL-safe base64 encoding
     */
    generateSecureToken(length: number = 32): string {
        return crypto.randomBytes(length).toString('base64url');
    }

    /**
     * Generate a 6-digit MFA code
     */
    generateMFACode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Generate a remember me token
     */
    generateRememberMeToken(): string {
        return crypto.randomBytes(64).toString('base64url');
    }

    /**
     * Hash a token for storage (use crypto to hash verification tokens)
     */
    hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Verify if a plaintext token matches a hashed token
     */
    verifyToken(plainToken: string, hashedToken: string): boolean {
        return this.hashToken(plainToken) === hashedToken;
    }

    /**
     * Calculate expiration time
     */
    getExpirationTime(minutes: number): Date {
        const now = new Date();
        now.setMinutes(now.getMinutes() + minutes);
        return now;
    }

    /**
     * Check if a token is expired
     */
    isTokenExpired(expirationTime: Date | null | undefined): boolean {
        if (!expirationTime) return true;
        return new Date() > new Date(expirationTime);
    }
}

export default new TokenGenerator();
