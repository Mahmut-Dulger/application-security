import nodemailer, { Transporter } from 'nodemailer';
import { logger } from './logger';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

class EmailService {
    private transporter: Transporter;

    constructor() {
        // Initialize transporter with environment variables
        // In production, use SendGrid, AWS SES, or similar
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '1025'),
            secure: process.env.SMTP_SECURE === 'true', // Use TLS
            auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            } : undefined,
        });
    }

    /**
     * Send email verification code
     */
    async sendVerificationEmail(email: string, token: string, firstName: string): Promise<void> {
        const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
        
        const html = `
            <h2>Welcome to Our Application, ${firstName}!</h2>
            <p>Please verify your email address to activate your account.</p>
            <p>Click the link below or copy the code to verify your email:</p>
            <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                Verify Email
            </a>
            <p>Or enter this code: <strong>${token}</strong></p>
            <p>This link will expire in 24 hours.</p>
            <p>If you did not create this account, please ignore this email.</p>
        `;

        await this.sendEmail({
            to: email,
            subject: 'Verify Your Email Address',
            html,
        });

        logger.info({ email }, '📧 Verification email sent');
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email: string, token: string, firstName: string): Promise<void> {
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        const html = `
            <h2>Password Reset Request</h2>
            <p>Hi ${firstName},</p>
            <p>We received a request to reset your password. Click the link below to reset it:</p>
            <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                Reset Password
            </a>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
            <p>For security reasons, never share this link with anyone.</p>
        `;

        await this.sendEmail({
            to: email,
            subject: 'Password Reset Request',
            html,
        });

        logger.info({ email }, '📧 Password reset email sent');
    }

    /**
     * Send MFA code via email
     */
    async sendMFAEmail(email: string, code: string, firstName: string): Promise<void> {
        const html = `
            <h2>Multi-Factor Authentication</h2>
            <p>Hi ${firstName},</p>
            <p>Your authentication code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; font-family: monospace; color: #007bff;">${code}</h1>
            <p>This code will expire in 10 minutes.</p>
            <p>If you did not request this code, your account may be compromised. Please contact support immediately.</p>
        `;

        await this.sendEmail({
            to: email,
            subject: 'Your Authentication Code',
            html,
        });

        logger.info({ email }, '📧 MFA email sent');
    }

    /**
     * Send suspicious login alert
     */
    async sendSuspiciousLoginAlert(email: string, firstName: string, ipAddress: string): Promise<void> {
        const html = `
            <h2>Unusual Login Activity Detected</h2>
            <p>Hi ${firstName},</p>
            <p>We detected an unusual login attempt to your account from:</p>
            <p><strong>IP Address:</strong> ${ipAddress}</p>
            <p>If this was you, you can ignore this email.</p>
            <p>If you did not make this login attempt, please:</p>
            <ol>
                <li>Change your password immediately</li>
                <li>Contact our support team</li>
            </ol>
            <p>For security reasons, we recommend enabling two-factor authentication on your account.</p>
        `;

        await this.sendEmail({
            to: email,
            subject: 'Unusual Login Activity Detected',
            html,
        });

        logger.warn({ email }, '📧 Suspicious login alert sent');
    }

    /**
     * Generic email sending method
     */
    private async sendEmail(options: EmailOptions): Promise<void> {
        try {
            const info = await this.transporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@application.com',
                ...options,
            });
            logger.info({ messageId: info.messageId }, '✅ Email sent successfully');
        } catch (error) {
            logger.error({ error, to: options.to }, '❌ Failed to send email');
            throw new Error('Failed to send email. Please try again later.');
        }
    }

    /**
     * Test email configuration
     */
    async testConnection(): Promise<void> {
        try {
            await this.transporter.verify();
            logger.info('✅ Email service configured correctly');
        } catch (error) {
            logger.error({ error }, '❌ Email service configuration error');
            throw error;
        }
    }
}

export default new EmailService();
