import { User } from '../model/user';
import database from './database';
import bcrypt from 'bcrypt';

const getUserById = async ({ id }: { id: number }): Promise<User | null> => {
    try {
        const userPrisma = await database.user.findUnique({
            where: { id },
        });

        return userPrisma ? User.from(userPrisma) : null;
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

const getUserByEmail = async ({ email }: { email: string }): Promise<User | null> => {
    try {
        const userPrisma = await database.user.findUnique({
            where: { email },
        });

        return userPrisma ? User.from(userPrisma) : null;
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

/**
 * Create a new user with hashed password
 */
const createUser = async ({
    firstName,
    lastName,
    email,
    password,
    isOrganiser,
    emailVerificationToken,
    emailVerificationTokenExp,
}: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    isOrganiser: boolean;
    emailVerificationToken: string;
    emailVerificationTokenExp: Date;
}): Promise<User> => {
    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const userPrisma = await database.user.create({
            data: {
                firstName,
                lastName,
                email,
                password: hashedPassword,
                isOrganiser,
                emailVerificationToken,
                emailVerificationTokenExp,
                emailVerified: false,
            },
        });

        return User.from(userPrisma);
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

/**
 * Find user by email verification token
 */
const getUserByVerificationToken = async ({ token }: { token: string }): Promise<User | null> => {
    try {
        const userPrisma = await database.user.findUnique({
            where: { emailVerificationToken: token },
        });

        return userPrisma ? User.from(userPrisma) : null;
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

/**
 * Find user by password reset token
 */
const getUserByPasswordResetToken = async ({ token }: { token: string }): Promise<User | null> => {
    try {
        const userPrisma = await database.user.findUnique({
            where: { passwordResetToken: token },
        });

        return userPrisma ? User.from(userPrisma) : null;
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

/**
 * Verify email for user
 */
const verifyEmail = async ({ id }: { id: number }): Promise<User | null> => {
    try {
        const userPrisma = await database.user.update({
            where: { id },
            data: {
                emailVerified: true,
                emailVerificationToken: null,
                emailVerificationTokenExp: null,
            },
        });

        return User.from(userPrisma);
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

/**
 * Update user's password
 */
const updatePassword = async ({ id, password }: { id: number; password: string }): Promise<User | null> => {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const userPrisma = await database.user.update({
            where: { id },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetTokenExp: null,
                failedLoginAttempts: 0,
                lockedUntil: null,
            },
        });

        return User.from(userPrisma);
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

/**
 * Update email verification token
 */
const updateEmailVerificationToken = async ({
    id,
    token,
    expiresAt,
}: {
    id: number;
    token: string;
    expiresAt: Date;
}): Promise<User | null> => {
    try {
        const userPrisma = await database.user.update({
            where: { id },
            data: {
                emailVerificationToken: token,
                emailVerificationTokenExp: expiresAt,
            },
        });

        return User.from(userPrisma);
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

/**
 * Set password reset token
 */
const setPasswordResetToken = async ({
    id,
    token,
    expiresAt,
}: {
    id: number;
    token: string;
    expiresAt: Date;
}): Promise<User | null> => {
    try {
        const userPrisma = await database.user.update({
            where: { id },
            data: {
                passwordResetToken: token,
                passwordResetTokenExp: expiresAt,
            },
        });

        return User.from(userPrisma);
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

/**
 * Update failed login attempts and account lockout
 */
const updateFailedLoginAttempts = async ({
    id,
    attempts,
    lockedUntil,
}: {
    id: number;
    attempts: number;
    lockedUntil: Date | null;
}): Promise<User | null> => {
    try {
        const userPrisma = await database.user.update({
            where: { id },
            data: {
                failedLoginAttempts: attempts,
                lockedUntil,
            },
        });

        return User.from(userPrisma);
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

/**
 * Reset failed login attempts
 */
const resetFailedLoginAttempts = async ({ id }: { id: number }): Promise<User | null> => {
    try {
        const userPrisma = await database.user.update({
            where: { id },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
            },
        });

        return User.from(userPrisma);
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

/**
 * Set MFA code
 */
const setMFACode = async ({
    id,
    code,
    expiresAt,
}: {
    id: number;
    code: string;
    expiresAt: Date;
}): Promise<User | null> => {
    try {
        const userPrisma = await database.user.update({
            where: { id },
            data: {
                mfaCode: code,
                mfaCodeExp: expiresAt,
            },
        });

        return User.from(userPrisma);
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

/**
 * Clear MFA code
 */
const clearMFACode = async ({ id }: { id: number }): Promise<User | null> => {
    try {
        const userPrisma = await database.user.update({
            where: { id },
            data: {
                mfaCode: null,
                mfaCodeExp: null,
            },
        });

        return User.from(userPrisma);
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

/**
 * Create remember me token
 */
const createRememberMeToken = async ({
    userId,
    token,
    expiresAt,
}: {
    userId: number;
    token: string;
    expiresAt: Date;
}): Promise<void> => {
    try {
        await database.rememberMeToken.create({
            data: {
                userId,
                token,
                expiresAt,
            },
        });
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

/**
 * Get remember me token
 */
const getRememberMeToken = async ({ token }: { token: string }): Promise<any> => {
    try {
        return await database.rememberMeToken.findUnique({
            where: { token },
        });
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

/**
 * Delete remember me token
 */
const deleteRememberMeToken = async ({ token }: { token: string }): Promise<void> => {
    try {
        await database.rememberMeToken.delete({
            where: { token },
        });
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

/**
 * Delete all remember me tokens for user
 */
const deleteAllRememberMeTokens = async ({ userId }: { userId: number }): Promise<void> => {
    try {
        await database.rememberMeToken.deleteMany({
            where: { userId },
        });
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

export default {
    getUserById,
    getUserByEmail,
    createUser,
    getUserByVerificationToken,
    getUserByPasswordResetToken,
    verifyEmail,
    updateEmailVerificationToken,
    updatePassword,
    setPasswordResetToken,
    updateFailedLoginAttempts,
    resetFailedLoginAttempts,
    setMFACode,
    clearMFACode,
    createRememberMeToken,
    getRememberMeToken,
    deleteRememberMeToken,
    deleteAllRememberMeTokens,
};
