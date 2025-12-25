import bcrypt from 'bcrypt';
import userDB from '../repository/user.db';
import { AuthenticationResponse, UserInput } from '../types';
import { generateJwtToken } from '../util/jwt';
import { User } from '../model/user';
import { logger, logSecurityEvent } from '../util/logger';

const getUserByEmail = async ({ email }: { email: string }): Promise<User> => {
    const user = await userDB.getUserByEmail({ email });
    if (!user) {
        logger.warn({ email }, '❌ Login attempt for non-existent user');
        throw new Error(`User with email: ${email} does not exist.`);
    }
    return user;
};

const authenticate = async ({ email, password }: UserInput): Promise<AuthenticationResponse> => {
    try {
        const user = await getUserByEmail({ email });

        const isValidPassword = await bcrypt.compare(password, user.getPassword());

        if (!isValidPassword) {
            logSecurityEvent('FAILED_AUTH', {
                email,
                reason: 'Invalid password',
            });
            throw new Error('Incorrect password.');
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

const getUserById = async ({ id }: { id: number }): Promise<User> => {
    const user = await userDB.getUserById({ id });
    if (!user) {
        logger.warn({ userId: id }, '⚠️ User not found by ID');
        throw new Error(`User with id: ${id} does not exist.`);
    }
    return user;
};

export default { getUserByEmail, getUserById, authenticate };
