import * as dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as bodyParser from 'body-parser';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { expressjwt } from 'express-jwt';
import { tripRouter } from './controller/trip.routes';
import { eventRouter } from './controller/event.routes';
import { userRouter, tokenBlacklist } from './controller/user.routes';
import helmet from 'helmet';
import { httpLogger, logger } from './util/logger';

const app = express();

// JSON logging middleware (must be first)
app.use(httpLogger);

// Log startup
logger.info('🚀 Starting Travel Booking API with Pino JSON logging...');

app.use(helmet());

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            // Set default-src as fallback
            defaultSrc: ["'none'"],
            // Allow connections to own server and the external API
            connectSrc: ["'self'", 'https://api.ucll.be'],
            // Control JavaScript sources
            scriptSrc: ["'self'"],
            // Control CSS sources
            styleSrc: ["'self'"],
            // Control image sources
            imgSrc: ["'self'"],
            // Control font sources
            fontSrc: ["'self'"],
            // Restrict frame embedding
            frameSrc: ["'none'"],
            // Block plugins
            objectSrc: ["'none'"],
            // Prevent clickjacking
            frameAncestors: ["'none'"],
            // Form submissions only to same origin
            formAction: ["'self'"],
            // Set upgradeInsecureRequests directive
            upgradeInsecureRequests: []
        },
    })
);

dotenv.config();
const port = process.env.APP_PORT || 3000;
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8080'];

app.use(cors({ origin: allowedOrigins }));
app.use(bodyParser.json());

// Token blacklist middleware - check if token is logged out
app.use((req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token && tokenBlacklist.has(token)) {
        return res.status(401).json({ status: 'unauthorized', message: 'Token has been revoked' });
    }
    next();
});

app.use(
    expressjwt({
        secret: process.env.JWT_SECRET || 'default_secret',
        algorithms: ['HS256'],
    }).unless({
        path: ['/api-docs', /^\/api-docs\/.*/, '/users/login', '/users/logout', '/status', '/trips', /^\/trips\/.*/],
    })
);

app.use('/trips', tripRouter);
app.use('/events', eventRouter);
app.use('/users', userRouter);

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Check API status
 *     description: Returns the current status of the Travel Booking API
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: API is running successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Travel Booking API is running..."
 */
app.get('/status', (req, res) => {
    res.json({ message: 'Travel Booking API is running...' });
});

const swaggerOpts = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Travel Booking API',
            version: '1.0.0',
        },
    },
    apis: ['./controller/*.routes.ts'],
};
const swaggerSpec = swaggerJSDoc(swaggerOpts);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).id;
    
    if (err.name === 'UnauthorizedError') {
        logger.warn({ requestId, error: err.message }, '🔓 Unauthorized request');
        res.status(401).json({ status: 'unauthorized', message: err.message });
    } else if (err.name === 'TravelBookingError') {
        logger.error({ requestId, error: err.message }, '❌ Domain error');
        res.status(400).json({ status: 'domain error', message: err.message });
    } else {
        logger.error({ requestId, error: err.message, stack: err.stack }, '🚨 Application error');
        res.status(400).json({ status: 'application error', message: err.message });
    }
});

app.listen(port || 3000, () => {
    logger.info(
        {
            port: port || 3000,
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString(),
        },
        '✅ Travel Booking API listening on port'
    );
});

