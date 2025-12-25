import { logger } from './logger';

interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
}

class PasswordValidator {
    private minLength = 12;
    private maxLength = 128;
    
    /**
     * Validate password against security policy
     * Requirements:
     * - Minimum 12 characters
     * - Maximum 128 characters
     * - At least one uppercase letter
     * - At least one lowercase letter
     * - At least one number
     * - At least one special character
     * - No common patterns or dictionary words (basic check)
     */
    validate(password: string): PasswordValidationResult {
        const errors: string[] = [];

        if (!password) {
            errors.push('Password is required');
            return { isValid: false, errors };
        }

        // Check length
        if (password.length < this.minLength) {
            errors.push(`Password must be at least ${this.minLength} characters long`);
        }

        if (password.length > this.maxLength) {
            errors.push(`Password must not exceed ${this.maxLength} characters`);
        }

        // Check uppercase
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        // Check lowercase
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        // Check number
        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        // Check special character
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one special character (!@#$%^&*)');
        }

        // Check for common weak patterns
        if (this.isCommonPassword(password)) {
            errors.push('Password is too common or predictable');
        }

        // Check for sequential characters (aaa, 123, abc, etc.)
        if (this.hasSequentialCharacters(password)) {
            errors.push('Password contains too many sequential characters');
        }

        // Check if password contains email or username (if provided)
        // This would need to be checked at service level with email/username context

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Check if password is on common passwords list
     */
    private isCommonPassword(password: string): boolean {
        const commonPasswords = [
            'password', 'password123', '123456', '12345678', 'qwerty',
            'abc123', 'monkey', '1234567', 'letmein', 'trustno1',
            'dragon', 'baseball', '111111', 'iloveyou', 'master',
            'sunshine', 'ashley', 'bailey', 'passw0rd', 'shadow',
        ];

        const lowerPassword = password.toLowerCase();
        return commonPasswords.some(common => lowerPassword.includes(common));
    }

    /**
     * Check for sequential characters (aaa, 123, abc, etc.)
     */
    private hasSequentialCharacters(password: string): boolean {
        let sequentialCount = 1;
        
        for (let i = 1; i < password.length; i++) {
            const current = password.charCodeAt(i);
            const previous = password.charCodeAt(i - 1);
            
            // Check if characters are sequential (differ by 1 in ASCII)
            if (Math.abs(current - previous) === 1) {
                sequentialCount++;
                if (sequentialCount >= 4) {
                    return true;
                }
            } else {
                sequentialCount = 1;
            }
        }
        
        return false;
    }

    /**
     * Check if password contains email or username
     */
    isPasswordContainsEmail(password: string, email: string): boolean {
        const emailParts = email.split('@')[0].toLowerCase();
        return password.toLowerCase().includes(emailParts);
    }

    /**
     * Generate a strong random password for testing/admin purposes
     */
    generateStrongPassword(length: number = 16): string {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        const allChars = uppercase + lowercase + numbers + special;
        let password = '';

        // Ensure at least one of each required character type
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += special[Math.floor(Math.random() * special.length)];

        // Fill rest with random characters
        for (let i = password.length; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }

        // Shuffle password
        return password
            .split('')
            .sort(() => Math.random() - 0.5)
            .join('');
    }
}

export default new PasswordValidator();
