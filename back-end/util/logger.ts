import pino from 'pino';
import pinoHttp from 'pino-http';

/**
 * Pino Logger Configuration
 *
 * Why Pino?
 * 1. **Performance**: Fastest JSON logger for Node.js (100x faster than Winston)
 * 2. **Security**: Built-in redaction for sensitive fields (passwords, tokens)
 * 3. **Structured Logging**: JSON output perfect for log aggregation (CloudWatch, ELK, Datadog)
 * 4. **Audit Trail**: Every request/response logged with correlation IDs
 * 5. **Low Overhead**: Minimal memory and CPU impact on high-traffic APIs
 * 6. **Standards**: ISO 8601 timestamps, log levels (debug, info, warn, error)
 *
 * Output Example:
 * {
 *   "level": 30,
 *   "time": "2025-12-22T16:30:45.123Z",
 *   "pid": 12345,
 *   "hostname": "server-01",
 *   "req": {
 *     "method": "POST",
 *     "url": "/users/login",
 *     "headers": {...},
 *     "remoteAddress": "192.168.1.1"
 *   },
 *   "res": {
 *     "statusCode": 200,
 *     "responseTime": 145
 *   },
 *   "msg": "Authentication successful"
 * }
 */

// Sensitive fields to redact from logs (prevent credential leakage)
const REDACT_FIELDS = {
    paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        'req.body.password',
        'req.body.token',
        'res.headers["set-cookie"]',
        'auth.password',
        'auth.token',
    ],
};

/**
 * Base Pino logger instance
 * Used for application logging
 */
export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty', // Pretty-print in development
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
        },
    },
    // Redaction configuration
    redact: REDACT_FIELDS,
    // Include request ID for correlation
    mixin() {
        return {
            version: process.env.APP_VERSION || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
        };
    },
});

/**
 * HTTP logger middleware for Express
 * Logs all incoming requests and outgoing responses
 */
export const httpLogger = pinoHttp({
    logger,
    autoLogging: true,
    customLogLevel: (req: any, res: any, err: any) => {
        if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
        if (res.statusCode >= 500 || err) return 'error';
        return 'info';
    },
    customSuccessMessage: (req: any, res: any) => {
        return `${req.method} ${req.url} - ${res.statusCode}`;
    },
    customErrorMessage: (req: any, res: any, err: any) => {
        return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
    },
    redact: REDACT_FIELDS,
});

/**
 * Log security events (authentication, authorization, suspicious activity)
 */
export const logSecurityEvent = (
    eventType: 
        | 'LOGIN' 
        | 'LOGOUT' 
        | 'LOGOUT_ALL_SESSIONS'
        | 'FAILED_AUTH' 
        | 'UNAUTHORIZED' 
        | 'PRIVILEGE_ESCALATION'
        | 'SIGNUP'
        | 'SIGNUP_FAILED'
        | 'EMAIL_VERIFICATION_FAILED'
        | 'EMAIL_VERIFIED'
        | 'VERIFICATION_EMAIL_RESENT'
        | 'LOGIN_FAILED'
        | 'ACCOUNT_LOCKED'
        | 'MFA_INITIATED'
        | 'MFA_VERIFICATION_FAILED'
        | 'MFA_VERIFIED'
        | 'PASSWORD_RESET_REQUESTED'
        | 'PASSWORD_RESET'
        | 'CHANGE_PASSWORD_FAILED'
        | 'CHANGE_PASSWORD_MFA_INITIATED'
        | 'PASSWORD_CHANGED'
        | 'REMEMBER_ME_TOKEN_CREATED'
        | 'REMEMBER_ME_LOGIN',
    details: {
        userId?: number;
        email?: string;
        ipAddress?: string;
        reason?: string;
        attempts?: number;
        role?: string;
        [key: string]: any;
    }
) => {
    logger.warn(
        {
            eventType,
            timestamp: new Date().toISOString(),
            ...details,
        },
        `🔐 Security Event: ${eventType}`
    );
};

export default logger;
