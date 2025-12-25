/**
 * @swagger
 *   components:
 *    securitySchemes:
 *     bearerAuth:
 *      type: http
 *      scheme: bearer
 *      bearerFormat: JWT
 *    schemas:
 *      AuthenticationResponse:
 *          type: object
 *          properties:
 *            message:
 *              type: string
 *              description: Authentication response.
 *            token:
 *              type: string
 *              description: JWT access token.
 *            email:
 *              type: string
 *              description: User email.
 *            firstName:
 *              type: string
 *              description: User first name.
 *            lastName:
 *              type: string
 *              description: User last name.
 *      AuthenticationRequest:
 *          type: object
 *          properties:
 *            email:
 *              type: string
 *              description: User email.
 *            password:
 *              type: string
 *              description: User password.
 *      User:
 *          type: object
 *          properties:
 *            id:
 *              type: number
 *              format: int64
 *            email:
 *              type: string
 *              description: User email.
 *            firstName:
 *              type: string
 *              description: User first name.
 *            lastName:
 *              type: string
 *              description: User last name.
 *            isOrganiser:
 *              type: boolean
 *              description: Whether the user is an organiser.
 *            createdAt:
 *              type: string
 *              format: date-time
 *              description: User creation date.
 *            updatedAt:
 *              type: string
 *              format: date-time
 *              description: User last update date.
 *      UserInput:
 *          type: object
 *          properties:
 *            email:
 *              type: string
 *              description: User email.
 *            password:
 *              type: string
 *              description: User password.
 *            firstName:
 *              type: string
 *              description: User first name.
 *            lastName:
 *              type: string
 *              description: User last name.
 *            isOrganiser:
 *              type: boolean
 *              description: Whether the user is an organiser.
 *              default: false
 */
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import userService from '../service/user.service';
import { UserInput } from '../types/index';
import { logger, logSecurityEvent } from '../util/logger';

const userRouter = express.Router();

// In-memory token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set<string>();

// Rate limiting for login endpoint - 5 attempts per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per IP
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting for signup - 10 attempts per hour
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts per IP
    message: 'Too many signup attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting for password reset - 5 attempts per hour
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 attempts per IP
    message: 'Too many password reset attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting for email verification - 10 attempts per hour
const verificationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts per IP
    message: 'Too many verification attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting for MFA verification - 5 attempts per 10 minutes
const mfaLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // 5 attempts per IP
    message: 'Too many MFA verification attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @swagger
 * /users/signup:
 *   post:
 *      summary: Register a new user with email verification required
 *      tags:
 *        - Authentication
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                firstName:
 *                  type: string
 *                lastName:
 *                  type: string
 *                email:
 *                  type: string
 *                password:
 *                  type: string
 *                isOrganiser:
 *                  type: boolean
 *      responses:
 *         201:
 *            description: User registered successfully
 *         400:
 *            description: Invalid request data
 */
userRouter.post('/signup', signupLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        logger.info('📝 Signup request received');
        const { firstName, lastName, email, password, isOrganiser } = req.body;
        logger.info({ email }, '🔄 Processing signup...');
        const response = await userService.signup({
            firstName,
            lastName,
            email,
            password,
            isOrganiser: isOrganiser ?? false,
        });
        logger.info({ email }, '✅ Signup successful');
        res.status(201).json(response);
    } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, '❌ Signup error');
        next(error);
    }
});

/**
 * @swagger
 * /users/verify-email:
 *   post:
 *      summary: Verify user email with verification token
 *      tags:
 *        - Authentication
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                token:
 *                  type: string
 *      responses:
 *         200:
 *            description: Email verified successfully
 *         400:
 *            description: Invalid or expired token
 */
userRouter.post('/verify-email', verificationLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.body;
        const response = await userService.verifyEmail({ token });
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /users/resend-verification:
 *   post:
 *      summary: Resend verification email
 *      tags:
 *        - Authentication
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                email:
 *                  type: string
 *      responses:
 *         200:
 *            description: Verification email resent
 *         400:
 *            description: Invalid email or already verified
 */
userRouter.post('/resend-verification', verificationLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        const response = await userService.resendVerificationEmail({ email });
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /users/login:
 *   post:
 *      summary: Login using email/password. Returns an object with JWT token and user details when successful.
 *      tags:
 *        - Authentication
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/AuthenticationRequest'
 *      responses:
 *         200:
 *            description: Authentication successful
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/AuthenticationResponse'
 *         400:
 *            description: Invalid credentials or request data
 *            content:
 *              application/json:
 *                schema:
 *                  type: object
 *                  properties:
 *                    status:
 *                      type: string
 *                      example: "application error"
 *                    message:
 *                      type: string
 *                      example: "Incorrect password."
 */
userRouter.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userInput = <UserInput>req.body;
        const response = await userService.authenticate(userInput);
        res.status(200).json({ message: 'Authentication successful', ...response });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /users/verify-mfa:
 *   post:
 *      summary: Verify MFA code sent via email
 *      tags:
 *        - Authentication
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                userId:
 *                  type: number
 *                mfaCode:
 *                  type: string
 *      responses:
 *         200:
 *            description: MFA verified successfully
 *         400:
 *            description: Invalid or expired MFA code
 */
userRouter.post('/verify-mfa', mfaLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId, mfaCode } = req.body;
        const response = await userService.verifyMFA({ userId, mfaCode });
        res.status(200).json({ message: 'MFA verified successfully', ...response });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /users/forgot-password:
 *   post:
 *      summary: Initiate password reset process
 *      tags:
 *        - Authentication
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                email:
 *                  type: string
 *      responses:
 *         200:
 *            description: Password reset email sent
 *         400:
 *            description: Invalid request
 */
userRouter.post('/forgot-password', passwordResetLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        const response = await userService.forgotPassword({ email });
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /users/reset-password:
 *   post:
 *      summary: Reset password with valid reset token
 *      tags:
 *        - Authentication
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                token:
 *                  type: string
 *                newPassword:
 *                  type: string
 *      responses:
 *         200:
 *            description: Password reset successfully
 *         400:
 *            description: Invalid or expired token
 */
userRouter.post('/reset-password', passwordResetLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, newPassword } = req.body;
        const response = await userService.resetPassword({ token, newPassword });
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /users/change-password:
 *   post:
 *      summary: Change password while logged in (initiates MFA)
 *      tags:
 *        - Authentication
 *      security:
 *        - bearerAuth: []
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                currentPassword:
 *                  type: string
 *                newPassword:
 *                  type: string
 *      responses:
 *         200:
 *            description: MFA code sent to email
 *         400:
 *            description: Invalid current password
 *         401:
 *            description: Unauthorized
 */
userRouter.post('/change-password', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).auth?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { currentPassword, newPassword } = req.body;
        const response = await userService.changePassword({
            userId,
            currentPassword,
            newPassword,
        });
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /users/verify-change-password:
 *   post:
 *      summary: Verify MFA and complete password change
 *      tags:
 *        - Authentication
 *      security:
 *        - bearerAuth: []
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                mfaCode:
 *                  type: string
 *                newPassword:
 *                  type: string
 *      responses:
 *         200:
 *            description: Password changed successfully
 *         400:
 *            description: Invalid MFA code
 *         401:
 *            description: Unauthorized
 */
userRouter.post('/verify-change-password', mfaLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).auth?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { mfaCode, newPassword } = req.body;
        const response = await userService.verifyChangePassword({
            userId,
            mfaCode,
            newPassword,
        });
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /users/remember-me:
 *   post:
 *      summary: Create remember me token for persistent login
 *      tags:
 *        - Authentication
 *      security:
 *        - bearerAuth: []
 *      responses:
 *         200:
 *            description: Remember me token created
 *         401:
 *            description: Unauthorized
 */
userRouter.post('/remember-me', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).auth?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const response = await userService.createRememberMeToken({ userId });
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /users/login-with-token:
 *   post:
 *      summary: Login using remember me token
 *      tags:
 *        - Authentication
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                rememberMeToken:
 *                  type: string
 *      responses:
 *         200:
 *            description: Login successful
 *         400:
 *            description: Invalid or expired token
 */
userRouter.post('/login-with-token', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { rememberMeToken } = req.body;
        const response = await userService.verifyRememberMeToken({ token: rememberMeToken });
        res.status(200).json({ message: 'Login successful', ...response });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /users/logout:
 *   post:
 *      summary: Logout the current user. Invalidates the JWT token and revokes remember me tokens.
 *      tags:
 *        - Authentication
 *      security:
 *        - bearerAuth: []
 *      responses:
 *         200:
 *            description: Logout successful
 *         401:
 *            description: Unauthorized
 */
userRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const userId = (req as any).auth?.userId;

        if (token) {
            tokenBlacklist.add(token);
        }

        if (userId) {
            await userService.logout({ userId });
            logSecurityEvent('LOGOUT', {
                userId,
            });
            logger.info({ userId }, '👋 User logged out');
        }

        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
});

export { userRouter, tokenBlacklist };
