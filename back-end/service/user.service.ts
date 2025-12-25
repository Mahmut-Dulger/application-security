import bcrypt from 'bcrypt';
import userDB from '../repository/user.db';
import { AuthenticationResponse, UserInput } from '../types';
import { generateJwtToken } from '../util/jwt';
import { User } from '../model/user';
import { logger, logSecurityEvent } from '../util/logger';
import emailService from '../util/email.service';
import passwordValidator from '../util/password.validator';
import tokenGenerator from '../util/token.generator';

const getUserByEmail = async ({ email }: { email: string }): Promise<User> => {
    const user = await userDB.getUserByEmail({ email });
    if (!user) {
        logger.warn({ email }, '❌ Login attempt for non-existent user');
        throw new Error(`User with email: ${email} does not exist.`);
    }
    return user;
};

const getUserById = async ({ id }: { id: number }): Promise<User> => {
    const user = await userDB.getUserById({ id });
    if (!user) {
        logger.warn({ userId: id }, '⚠️ User not found by ID');
        throw new Error(`User with id: ${id} does not exist.`);
    }
    return user;
};

/**
 * SIGNUP - Register a new user with email verification
 * Threat mitigated: Prevents unauthorized account creation, ensures valid emails
 */
const signup = async ({
    firstName,
    lastName,
    email,
    password,
    isOrganiser,
}: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    isOrganiser: boolean;
}): Promise<{ message: string }> => {
    try {
        // Check if user already exists
        const existingUser = await userDB.getUserByEmail({ email });
        if (existingUser) {
            logSecurityEvent('SIGNUP_FAILED', {
                email,
                reason: 'Email already registered',
            });
            throw new Error('Email already registered. Please use a different email or try logging in.');
        }

        // Validate password policy
        const passwordValidation = passwordValidator.validate(password);
        if (!passwordValidation.isValid) {
            throw new Error(passwordValidation.errors.join('. '));
        }

        // Check if password contains email
        if (passwordValidator.isPasswordContainsEmail(password, email)) {
            throw new Error('Password must not contain your email address');
        }

        // Create email verification token (valid for 24 hours)
        const verificationToken = tokenGenerator.generateSecureToken();
        const verificationTokenExp = tokenGenerator.getExpirationTime(24 * 60); // 24 hours

        // Create user in database
        const user = await userDB.createUser({
            firstName,
            lastName,
            email,
            password,
            isOrganiser,
            emailVerificationToken: verificationToken,
            emailVerificationTokenExp: verificationTokenExp,
        });

        // Send verification email (non-blocking - fire and forget)
        emailService.sendVerificationEmail(email, verificationToken, firstName)
            .catch((err: any) => {
                logger.error({ email, error: err instanceof Error ? err.message : 'Unknown error' }, '📧 Failed to send verification email');
                // Email failure is not critical - user can still verify later or request resend
            });

        logSecurityEvent('SIGNUP', {
            email,
            role: isOrganiser ? 'ORGANISER' : 'CLIENT',
        });

        return {
            message: 'Account created successfully! Please check your email to verify your account.',
        };
    } catch (error) {
        logger.error({ email, error: error instanceof Error ? error.message : 'Unknown error' }, '🔐 Signup error');
        throw error;
    }
};

/**
 * VERIFY EMAIL - Confirm email ownership
 * Threat mitigated: Ensures email ownership, prevents spam, enables communication with user
 */
const verifyEmail = async ({ token }: { token: string }): Promise<{ message: string }> => {
    try {
        const user = await userDB.getUserByVerificationToken({ token });
        if (!user) {
            logSecurityEvent('EMAIL_VERIFICATION_FAILED', {
                reason: 'Invalid token',
            });
            throw new Error('Invalid or expired verification token.');
        }

        // Check if token has expired
        if (tokenGenerator.isTokenExpired(user.getEmailVerificationTokenExp())) {
            logSecurityEvent('EMAIL_VERIFICATION_FAILED', {
                userId: user.getId(),
                reason: 'Token expired',
            });
            throw new Error('Verification token has expired. Please request a new one.');
        }

        // Verify email
        const updatedUser = await userDB.verifyEmail({ id: user.getId()! });

        logSecurityEvent('EMAIL_VERIFIED', {
            userId: user.getId(),
            email: user.getEmail(),
        });

        return {
            message: 'Email verified successfully! You can now log in.',
        };
    } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, '🔐 Email verification error');
        throw error;
    }
};

/**
 * Resend verification email
 */
const resendVerificationEmail = async ({ email }: { email: string }): Promise<{ message: string }> => {
    try {
        const user = await getUserByEmail({ email });

        if (user.getEmailVerified()) {
            throw new Error('Email is already verified.');
        }

        // Generate new verification token
        const verificationToken = tokenGenerator.generateSecureToken();
        const verificationTokenExp = tokenGenerator.getExpirationTime(24 * 60); // 24 hours

        // Update user with new token
        await userDB.updateEmailVerificationToken({
            id: user.getId()!,
            token: verificationToken,
            expiresAt: verificationTokenExp,
        });

        // Send new verification email (non-blocking - fire and forget)
        emailService.sendVerificationEmail(email, verificationToken, user.getFirstName())
            .catch((err: any) => {
                logger.error({ email, error: err instanceof Error ? err.message : 'Unknown error' }, '📧 Failed to send verification email');
            });

        logSecurityEvent('VERIFICATION_EMAIL_RESENT', {
            email,
        });

        return {
            message: 'Verification email sent. Please check your inbox.',
        };
    } catch (error) {
        logger.error({ email, error: error instanceof Error ? error.message : 'Unknown error' }, '🔐 Resend verification error');
        throw error;
    }
};

/**
 * AUTHENTICATE - Login with email and password
 * Threat mitigated: Failed login tracking, account lockout after multiple attempts, MFA
 */
const authenticate = async ({ email, password }: UserInput): Promise<AuthenticationResponse> => {
    try {
        const user = await getUserByEmail({ email });

        // Check if email is verified
        if (!user.getEmailVerified()) {
            logSecurityEvent('LOGIN_FAILED', {
                email,
                reason: 'Email not verified',
            });
            throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
        }

        // Check if account is locked
        if (user.isAccountLocked()) {
            logSecurityEvent('LOGIN_FAILED', {
                userId: user.getId(),
                email,
                reason: 'Account locked',
            });
            const minutesLeft = Math.ceil((user.getLockedUntil()!.getTime() - new Date().getTime()) / (1000 * 60));
            throw new Error(`Account is locked due to too many failed login attempts. Try again in ${minutesLeft} minutes.`);
        }

        const isValidPassword = await bcrypt.compare(password, user.getPassword());

        if (!isValidPassword) {
            // Increment failed login attempts
            const newAttempts = user.getFailedLoginAttempts() + 1;
            const MAX_ATTEMPTS = 5;
            const LOCKOUT_DURATION_MINUTES = 30;

            let lockedUntil = null;
            if (newAttempts >= MAX_ATTEMPTS) {
                lockedUntil = new Date();
                lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
                
                logSecurityEvent('ACCOUNT_LOCKED', {
                    userId: user.getId(),
                    email,
                    reason: 'Max failed login attempts',
                });
            }

            await userDB.updateFailedLoginAttempts({
                id: user.getId()!,
                attempts: newAttempts,
                lockedUntil,
            });

            logSecurityEvent('FAILED_AUTH', {
                email,
                attempts: newAttempts,
                reason: 'Invalid password',
            });

            if (newAttempts >= MAX_ATTEMPTS) {
                throw new Error('Too many failed login attempts. Your account has been locked for 30 minutes.');
            }

            throw new Error('Incorrect password.');
        }

        // Reset failed login attempts on successful authentication
        await userDB.resetFailedLoginAttempts({ id: user.getId()! });

        // Check if MFA is enabled - if so, send MFA code
        if (user.getMfaEnabled()) {
            const mfaCode = tokenGenerator.generateMFACode();
            const mfaCodeExp = tokenGenerator.getExpirationTime(10); // 10 minutes

            await userDB.setMFACode({
                id: user.getId()!,
                code: mfaCode,
                expiresAt: mfaCodeExp,
            });

            // Send MFA email (non-blocking - fire and forget)
            emailService.sendMFAEmail(user.getEmail(), mfaCode, user.getFirstName())
                .catch((err: any) => {
                    logger.error({ email: user.getEmail(), error: err instanceof Error ? err.message : 'Unknown error' }, '📧 Failed to send MFA email');
                });

            logSecurityEvent('MFA_INITIATED', {
                userId: user.getId(),
                email,
            });

            return {
                token: '', // Empty token until MFA is verified
                id: user.getId()!,
                firstName: user.getFirstName(),
                lastName: user.getLastName(),
                role: user.getIsOrganiser() ? 'ORGANISER' : 'CLIENT',
                requiresMFA: true,
            } as any;
        }

        // Log successful authentication
        logSecurityEvent('LOGIN', {
            userId: user.getId(),
            email,
            role: user.getIsOrganiser() ? 'ORGANISER' : 'CLIENT',
        });

        return {
            token: generateJwtToken({ userId: user.getId()!, email, isOrganiser: user.getIsOrganiser() }),
            id: user.getId()!,
            firstName: user.getFirstName(),
            lastName: user.getLastName(),
            role: user.getIsOrganiser() ? 'ORGANISER' : 'CLIENT',
        };
    } catch (error) {
        logger.error({ email, error: error instanceof Error ? error.message : 'Unknown error' }, '🔐 Authentication error');
        throw error;
    }
};

/**
 * VERIFY MFA - Verify MFA code sent via email
 * Threat mitigated: Multi-factor authentication prevents unauthorized access even with password compromise
 */
const verifyMFA = async ({ userId, mfaCode }: { userId: number; mfaCode: string }): Promise<AuthenticationResponse> => {
    try {
        const user = await getUserById({ id: userId });

        const storedMfaCode = user.getMfaCode();
        if (!storedMfaCode) {
            throw new Error('MFA code not found. Please initiate login again.');
        }

        // Check if MFA code has expired
        if (tokenGenerator.isTokenExpired(user.getMfaCodeExp())) {
            await userDB.clearMFACode({ id: userId });
            throw new Error('MFA code has expired. Please initiate login again.');
        }

        // Verify MFA code
        if (storedMfaCode !== mfaCode) {
            logSecurityEvent('MFA_VERIFICATION_FAILED', {
                userId,
                reason: 'Invalid code',
            });
            throw new Error('Invalid MFA code. Please try again.');
        }

        // Clear MFA code
        await userDB.clearMFACode({ id: userId });

        logSecurityEvent('MFA_VERIFIED', {
            userId,
            email: user.getEmail(),
        });

        return {
            token: generateJwtToken({ userId: user.getId()!, email: user.getEmail(), isOrganiser: user.getIsOrganiser() }),
            id: user.getId()!,
            firstName: user.getFirstName(),
            lastName: user.getLastName(),
            role: user.getIsOrganiser() ? 'ORGANISER' : 'CLIENT',
        };
    } catch (error) {
        logger.error({ userId, error: error instanceof Error ? error.message : 'Unknown error' }, '🔐 MFA verification error');
        throw error;
    }
};

/**
 * FORGOT PASSWORD - Initiate password reset process
 * Threat mitigated: Rate limiting, secure token generation, time-limited reset links
 */
const forgotPassword = async ({ email }: { email: string }): Promise<{ message: string }> => {
    try {
        const user = await getUserByEmail({ email });

        // Generate password reset token (valid for 1 hour)
        const resetToken = tokenGenerator.generateSecureToken();
        const resetTokenExp = tokenGenerator.getExpirationTime(60); // 1 hour

        // Store reset token
        await userDB.setPasswordResetToken({
            id: user.getId()!,
            token: resetToken,
            expiresAt: resetTokenExp,
        });

        // Send password reset email (non-blocking - fire and forget)
        emailService.sendPasswordResetEmail(email, resetToken, user.getFirstName())
            .catch((err: any) => {
                logger.error({ email, error: err instanceof Error ? err.message : 'Unknown error' }, '📧 Failed to send password reset email');
            });

        logSecurityEvent('PASSWORD_RESET_REQUESTED', {
            userId: user.getId(),
            email,
        });

        return {
            message: 'Password reset link sent to your email. Please check your inbox.',
        };
    } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, '🔐 Forgot password error');
        // Don't leak if email exists or not
        return {
            message: 'If an account exists with that email, you will receive a password reset link.',
        };
    }
};

/**
 * RESET PASSWORD - Complete password reset with token verification
 * Threat mitigated: Secure token validation, password policy enforcement
 */
const resetPassword = async ({
    token,
    newPassword,
}: {
    token: string;
    newPassword: string;
}): Promise<{ message: string }> => {
    try {
        const user = await userDB.getUserByPasswordResetToken({ token });
        if (!user) {
            throw new Error('Invalid or expired password reset token.');
        }

        // Check if token has expired
        if (tokenGenerator.isTokenExpired(user.getPasswordResetTokenExp())) {
            throw new Error('Password reset token has expired. Please request a new one.');
        }

        // Validate new password
        const passwordValidation = passwordValidator.validate(newPassword);
        if (!passwordValidation.isValid) {
            throw new Error(passwordValidation.errors.join('. '));
        }

        // Check if new password contains email
        if (passwordValidator.isPasswordContainsEmail(newPassword, user.getEmail())) {
            throw new Error('New password must not contain your email address');
        }

        // Update password
        await userDB.updatePassword({
            id: user.getId()!,
            password: newPassword,
        });

        logSecurityEvent('PASSWORD_RESET', {
            userId: user.getId(),
            email: user.getEmail(),
        });

        return {
            message: 'Password reset successfully. You can now log in with your new password.',
        };
    } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, '🔐 Reset password error');
        throw error;
    }
};

/**
 * CHANGE PASSWORD - Change password while logged in (requires MFA verification)
 * Threat mitigated: Multi-factor authentication for sensitive operation
 */
const changePassword = async ({
    userId,
    currentPassword,
    newPassword,
}: {
    userId: number;
    currentPassword: string;
    newPassword: string;
}): Promise<{ message: string }> => {
    try {
        const user = await getUserById({ id: userId });

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.getPassword());
        if (!isValidPassword) {
            logSecurityEvent('CHANGE_PASSWORD_FAILED', {
                userId,
                reason: 'Invalid current password',
            });
            throw new Error('Current password is incorrect.');
        }

        // Validate new password
        const passwordValidation = passwordValidator.validate(newPassword);
        if (!passwordValidation.isValid) {
            throw new Error(passwordValidation.errors.join('. '));
        }

        // Check if new password contains email
        if (passwordValidator.isPasswordContainsEmail(newPassword, user.getEmail())) {
            throw new Error('New password must not contain your email address');
        }

        // Check if new password is same as current
        const isSamePassword = await bcrypt.compare(newPassword, user.getPassword());
        if (isSamePassword) {
            throw new Error('New password must be different from current password.');
        }

        // Send MFA code for password change
        const mfaCode = tokenGenerator.generateMFACode();
        const mfaCodeExp = tokenGenerator.getExpirationTime(10); // 10 minutes

        await userDB.setMFACode({
            id: userId,
            code: mfaCode,
            expiresAt: mfaCodeExp,
        });

        // Send MFA email for password change (non-blocking - fire and forget)
        emailService.sendMFAEmail(user.getEmail(), mfaCode, user.getFirstName())
            .catch((err: any) => {
                logger.error({ email: user.getEmail(), error: err instanceof Error ? err.message : 'Unknown error' }, '📧 Failed to send MFA email for password change');
            });

        logSecurityEvent('CHANGE_PASSWORD_MFA_INITIATED', {
            userId,
            email: user.getEmail(),
        });

        return {
            message: 'MFA code sent to your email. Please verify to complete password change.',
        };
    } catch (error) {
        logger.error({ userId, error: error instanceof Error ? error.message : 'Unknown error' }, '🔐 Change password error');
        throw error;
    }
};

/**
 * VERIFY CHANGE PASSWORD - Verify MFA and complete password change
 */
const verifyChangePassword = async ({
    userId,
    mfaCode,
    newPassword,
}: {
    userId: number;
    mfaCode: string;
    newPassword: string;
}): Promise<{ message: string }> => {
    try {
        const user = await getUserById({ id: userId });

        const storedMfaCode = user.getMfaCode();
        if (!storedMfaCode) {
            throw new Error('MFA code not found. Please initiate password change again.');
        }

        // Check if MFA code has expired
        if (tokenGenerator.isTokenExpired(user.getMfaCodeExp())) {
            await userDB.clearMFACode({ id: userId });
            throw new Error('MFA code has expired. Please initiate password change again.');
        }

        // Verify MFA code
        if (storedMfaCode !== mfaCode) {
            throw new Error('Invalid MFA code. Please try again.');
        }

        // Validate new password
        const passwordValidation = passwordValidator.validate(newPassword);
        if (!passwordValidation.isValid) {
            throw new Error(passwordValidation.errors.join('. '));
        }

        // Update password and clear MFA code
        await userDB.updatePassword({ id: userId, password: newPassword });

        logSecurityEvent('PASSWORD_CHANGED', {
            userId,
            email: user.getEmail(),
        });

        return {
            message: 'Password changed successfully.',
        };
    } catch (error) {
        logger.error({ userId, error: error instanceof Error ? error.message : 'Unknown error' }, '🔐 Verify change password error');
        throw error;
    }
};

/**
 * REMEMBER ME - Create a remember me token for persistent login
 * Threat mitigated: Secure token generation, proper expiration, can be revoked
 */
const createRememberMeToken = async ({ userId }: { userId: number }): Promise<{ rememberMeToken: string }> => {
    try {
        const user = await getUserById({ id: userId });

        const token = tokenGenerator.generateRememberMeToken();
        const expiresAt = tokenGenerator.getExpirationTime(30 * 24 * 60); // 30 days

        await userDB.createRememberMeToken({
            userId,
            token,
            expiresAt,
        });

        logSecurityEvent('REMEMBER_ME_TOKEN_CREATED', {
            userId,
        });

        return {
            rememberMeToken: token,
        };
    } catch (error) {
        logger.error({ userId, error: error instanceof Error ? error.message : 'Unknown error' }, '🔐 Create remember me token error');
        throw error;
    }
};

/**
 * VERIFY REMEMBER ME TOKEN - Validate and use remember me token
 */
const verifyRememberMeToken = async ({ token }: { token: string }): Promise<AuthenticationResponse> => {
    try {
        const rememberMeToken = await userDB.getRememberMeToken({ token });
        if (!rememberMeToken) {
            throw new Error('Invalid remember me token.');
        }

        // Check if token has expired
        if (new Date() > new Date(rememberMeToken.expiresAt)) {
            await userDB.deleteRememberMeToken({ token });
            throw new Error('Remember me token has expired.');
        }

        const user = await getUserById({ id: rememberMeToken.userId });

        logSecurityEvent('REMEMBER_ME_LOGIN', {
            userId: user.getId(),
            email: user.getEmail(),
        });

        return {
            token: generateJwtToken({ userId: user.getId()!, email: user.getEmail(), isOrganiser: user.getIsOrganiser() }),
            id: user.getId()!,
            firstName: user.getFirstName(),
            lastName: user.getLastName(),
            role: user.getIsOrganiser() ? 'ORGANISER' : 'CLIENT',
        };
    } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, '🔐 Verify remember me token error');
        throw error;
    }
};

/**
 * LOGOUT - Revoke all remember me tokens for complete logout
 */
const logout = async ({ userId }: { userId: number }): Promise<void> => {
    try {
        await userDB.deleteAllRememberMeTokens({ userId });
        logSecurityEvent('LOGOUT_ALL_SESSIONS', {
            userId,
        });
    } catch (error) {
        logger.error({ userId, error: error instanceof Error ? error.message : 'Unknown error' }, '🔐 Logout error');
        throw error;
    }
};

export default {
    getUserByEmail,
    getUserById,
    signup,
    verifyEmail,
    resendVerificationEmail,
    authenticate,
    verifyMFA,
    forgotPassword,
    resetPassword,
    changePassword,
    verifyChangePassword,
    createRememberMeToken,
    verifyRememberMeToken,
    logout,
};
