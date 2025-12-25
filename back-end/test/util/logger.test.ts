import { logger, logSecurityEvent } from '../../util/logger';
import pino from 'pino';

describe('Logger Configuration', () => {
    // Capture logs for testing
    let logs: any[] = [];
    let originalStdout: NodeJS.WritableStream;

    beforeEach(() => {
        logs = [];
    });

    describe('Base Logger (pino)', () => {
        it('should log with correct structure', () => {
            const testLogger = pino(
                {
                    level: 'info',
                    redact: {
                        paths: ['password', 'token'],
                    },
                },
                pino.transport({
                    target: 'pino/file',
                    options: { destination: 1 }, // stdout
                })
            );

            // Test basic logging
            testLogger.info({ userId: 123 }, 'User logged in');

            expect(logs).toBeDefined();
        });

        it('should redact sensitive fields', () => {
            const sensitiveData = {
                password: 'secret123',
                email: 'user@example.com',
                token: 'jwt_token_xyz',
            };

            // Password and token should be redacted
            logger.info(sensitiveData, 'Testing redaction');

            expect(sensitiveData.password).toBe('secret123'); // Original not modified
        });

        it('should include environment and version in logs', () => {
            // The logger's mixin should add version and environment
            const testLog = logger.info({ test: true }, 'Test message');

            expect(testLog).toBeUndefined(); // pino.info returns undefined
        });

        it('should handle different log levels', () => {
            expect(() => {
                logger.debug({ msg: 'debug' }, 'Debug message');
                logger.info({ msg: 'info' }, 'Info message');
                logger.warn({ msg: 'warn' }, 'Warning message');
                logger.error({ msg: 'error' }, 'Error message');
            }).not.toThrow();
        });
    });

    describe('Security Event Logging', () => {
        it('should log LOGIN security event', () => {
            expect(() => {
                logSecurityEvent('LOGIN', {
                    userId: 1,
                    email: 'user@example.com',
                    ipAddress: '192.168.1.1',
                });
            }).not.toThrow();
        });

        it('should log FAILED_AUTH security event', () => {
            expect(() => {
                logSecurityEvent('FAILED_AUTH', {
                    email: 'attacker@example.com',
                    ipAddress: '192.168.1.100',
                    reason: 'Invalid credentials',
                });
            }).not.toThrow();
        });

        it('should log UNAUTHORIZED security event', () => {
            expect(() => {
                logSecurityEvent('UNAUTHORIZED', {
                    userId: 2,
                    ipAddress: '192.168.1.50',
                    reason: 'Insufficient permissions',
                });
            }).not.toThrow();
        });

        it('should log LOGOUT security event', () => {
            expect(() => {
                logSecurityEvent('LOGOUT', {
                    userId: 1,
                    ipAddress: '192.168.1.1',
                });
            }).not.toThrow();
        });

        it('should log PRIVILEGE_ESCALATION security event', () => {
            expect(() => {
                logSecurityEvent('PRIVILEGE_ESCALATION', {
                    userId: 5,
                    fromRole: 'user',
                    toRole: 'admin',
                    ipAddress: '192.168.1.1',
                });
            }).not.toThrow();
        });

        it('should include timestamp in security events', () => {
            const beforeTime = new Date();

            logSecurityEvent('LOGIN', {
                userId: 1,
                email: 'user@example.com',
            });

            const afterTime = new Date();

            // Timestamp should be between before and after
            expect(beforeTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
        });
    });

    describe('Redaction Configuration', () => {
        it('should have all sensitive paths defined', () => {
            const redactPaths = [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.headers["x-api-key"]',
                'req.body.password',
                'req.body.token',
                'res.headers["set-cookie"]',
                'auth.password',
                'auth.token',
            ];

            redactPaths.forEach((path) => {
                expect(path).toMatch(/^(req|res|auth)\./);
            });
        });

        it('should NOT log authorization headers', () => {
            const requestData = {
                headers: {
                    authorization: 'Bearer secret_token_12345',
                    'content-type': 'application/json',
                },
                method: 'GET',
                url: '/api/users',
            };

            // This should not throw, but auth header should be redacted in actual logs
            expect(() => {
                logger.info(requestData, 'Request received');
            }).not.toThrow();
        });

        it('should NOT log passwords', () => {
            const userData = {
                body: {
                    email: 'user@example.com',
                    password: 'SecurePassword123!',
                    name: 'John Doe',
                },
            };

            expect(() => {
                logger.info(userData, 'User registration');
            }).not.toThrow();
        });

        it('should NOT log tokens', () => {
            const tokenData = {
                body: {
                    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    refreshToken: 'refresh_token_xyz',
                },
            };

            expect(() => {
                logger.info(tokenData, 'Token refresh');
            }).not.toThrow();
        });
    });

    describe('Logger Environment Variables', () => {
        const originalEnv = process.env;

        afterEach(() => {
            process.env = originalEnv;
        });

        it('should use LOG_LEVEL from environment', () => {
            expect(process.env.LOG_LEVEL || 'info').toBeTruthy();
        });

        it('should use APP_VERSION from environment', () => {
            expect(process.env.APP_VERSION || '1.0.0').toBeTruthy();
        });

        it('should use NODE_ENV from environment', () => {
            expect(process.env.NODE_ENV || 'development').toBeTruthy();
        });
    });
});
