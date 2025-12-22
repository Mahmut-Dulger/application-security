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

const userRouter = express.Router();

// Rate limiting for login endpoint - 5 attempts per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per IP
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// In-memory token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set<string>();

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
        res.status(200).json({ message: 'Authentication succesful', ...response });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /users/logout:
 *   post:
 *      summary: Logout the current user. Invalidates the JWT token.
 *      tags:
 *        - Authentication
 *      security:
 *        - bearerAuth: []
 *      responses:
 *         200:
 *            description: Logout successful
 *            content:
 *              application/json:
 *                schema:
 *                  type: object
 *                  properties:
 *                    message:
 *                      type: string
 *                      example: "Logged out successfully"
 *         401:
 *            description: Unauthorized - Authentication required
 *            content:
 *              application/json:
 *                schema:
 *                  type: object
 *                  properties:
 *                    status:
 *                      type: string
 *                      example: "unauthorized"
 *                    message:
 *                      type: string
 *                      example: "No authorization token was found"
 */
userRouter.post('/logout', (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        tokenBlacklist.add(token);
    }
    res.status(200).json({ message: 'Logged out successfully' });
});

export { userRouter, tokenBlacklist };
