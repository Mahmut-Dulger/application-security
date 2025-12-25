import { User as UserPrisma } from '@prisma/client';

export class User {
    private id?: number;
    private firstName: string;
    private lastName: string;
    private email: string;
    private password: string;
    private isOrganiser: boolean;

    // Email verification
    private emailVerified: boolean;
    private emailVerificationToken?: string;
    private emailVerificationTokenExp?: Date;

    // Password reset
    private passwordResetToken?: string;
    private passwordResetTokenExp?: Date;

    // Account security
    private failedLoginAttempts: number;
    private lockedUntil?: Date;

    // MFA
    private mfaEnabled: boolean;
    private mfaCode?: string;
    private mfaCodeExp?: Date;

    private createdAt?: Date;
    private updatedAt?: Date;

    constructor(user: {
        id?: number;
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        isOrganiser: boolean;
        emailVerified?: boolean;
        emailVerificationToken?: string;
        emailVerificationTokenExp?: Date;
        passwordResetToken?: string;
        passwordResetTokenExp?: Date;
        failedLoginAttempts?: number;
        lockedUntil?: Date;
        mfaEnabled?: boolean;
        mfaCode?: string;
        mfaCodeExp?: Date;
        createdAt?: Date;
        updatedAt?: Date;
    }) {
        this.validate(user);

        this.id = user.id;
        this.firstName = user.firstName;
        this.lastName = user.lastName;
        this.email = user.email;
        this.password = user.password;
        this.isOrganiser = user.isOrganiser;
        this.emailVerified = user.emailVerified ?? false;
        this.emailVerificationToken = user.emailVerificationToken;
        this.emailVerificationTokenExp = user.emailVerificationTokenExp;
        this.passwordResetToken = user.passwordResetToken;
        this.passwordResetTokenExp = user.passwordResetTokenExp;
        this.failedLoginAttempts = user.failedLoginAttempts ?? 0;
        this.lockedUntil = user.lockedUntil;
        this.mfaEnabled = user.mfaEnabled ?? false;
        this.mfaCode = user.mfaCode;
        this.mfaCodeExp = user.mfaCodeExp;
        this.createdAt = user.createdAt;
        this.updatedAt = user.updatedAt;
    }
    validate(user: { firstName: string; lastName: string; email: string; password: string }) {
        if (!user.firstName?.trim()) {
            throw new Error('First name is required');
        }
        if (!user.lastName?.trim()) {
            throw new Error('Last name is required');
        }
        if (!user.email?.trim()) {
            throw new Error('Email is required');
        }
        if (!user.password?.trim()) {
            throw new Error('Password is required');
        }
        if (user.password.length < 12) {
            throw new Error('Password must be at least 12 characters long');
        }
        if (!/[A-Z]/.test(user.password)) {
            throw new Error('Password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(user.password)) {
            throw new Error('Password must contain at least one lowercase letter');
        }
        if (!/[0-9]/.test(user.password)) {
            throw new Error('Password must contain at least one number');
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(user.password)) {
            throw new Error('Password must contain at least one special character');
        }
    }

    // Getters
    getId(): number | undefined {
        return this.id;
    }

    getFirstName(): string {
        return this.firstName;
    }

    getLastName(): string {
        return this.lastName;
    }

    getFullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }

    getEmail(): string {
        return this.email;
    }

    getPassword(): string {
        return this.password;
    }

    getCreatedAt(): Date | undefined {
        return this.createdAt;
    }

    getUpdatedAt(): Date | undefined {
        return this.updatedAt;
    }

    getIsOrganiser(): boolean {
        return this.isOrganiser;
    }

    getEmailVerified(): boolean {
        return this.emailVerified;
    }

    getEmailVerificationToken(): string | undefined {
        return this.emailVerificationToken;
    }

    getEmailVerificationTokenExp(): Date | undefined {
        return this.emailVerificationTokenExp;
    }

    getPasswordResetToken(): string | undefined {
        return this.passwordResetToken;
    }

    getPasswordResetTokenExp(): Date | undefined {
        return this.passwordResetTokenExp;
    }

    getFailedLoginAttempts(): number {
        return this.failedLoginAttempts;
    }

    getLockedUntil(): Date | undefined {
        return this.lockedUntil;
    }

    getMfaEnabled(): boolean {
        return this.mfaEnabled;
    }

    getMfaCode(): string | undefined {
        return this.mfaCode;
    }

    getMfaCodeExp(): Date | undefined {
        return this.mfaCodeExp;
    }

    // Setters
    setEmailVerified(verified: boolean): void {
        this.emailVerified = verified;
    }

    setEmailVerificationToken(token: string | undefined, exp: Date | undefined): void {
        this.emailVerificationToken = token;
        this.emailVerificationTokenExp = exp;
    }

    setPasswordResetToken(token: string | undefined, exp: Date | undefined): void {
        this.passwordResetToken = token;
        this.passwordResetTokenExp = exp;
    }

    setPassword(password: string): void {
        if (!password?.trim()) {
            throw new Error('Password is required');
        }
        this.password = password;
    }

    setFailedLoginAttempts(attempts: number): void {
        this.failedLoginAttempts = attempts;
    }

    setLockedUntil(lockedUntil: Date | undefined): void {
        this.lockedUntil = lockedUntil;
    }

    setMfaEnabled(enabled: boolean): void {
        this.mfaEnabled = enabled;
    }

    setMfaCode(code: string | undefined, exp: Date | undefined): void {
        this.mfaCode = code;
        this.mfaCodeExp = exp;
    }

    // Helper methods
    isAccountLocked(): boolean {
        if (!this.lockedUntil) return false;
        return new Date() < this.lockedUntil;
    }

    equals(other: User): boolean {
        return (
            this.firstName === other.firstName &&
            this.lastName === other.lastName &&
            this.email === other.email &&
            this.isOrganiser === other.isOrganiser &&
            this.id === other.id
        );
    }

    static from(userObj: any): User {
        const {
            id,
            firstName,
            lastName,
            email,
            password,
            isOrganiser,
            emailVerified,
            emailVerificationToken,
            emailVerificationTokenExp,
            passwordResetToken,
            passwordResetTokenExp,
            failedLoginAttempts,
            lockedUntil,
            mfaEnabled,
            mfaCode,
            mfaCodeExp,
            createdAt,
            updatedAt,
        } = userObj;

        return new User({
            id,
            firstName,
            lastName,
            email,
            password,
            isOrganiser,
            emailVerified: emailVerified ?? false,
            emailVerificationToken: emailVerificationToken ?? undefined,
            emailVerificationTokenExp: emailVerificationTokenExp ?? undefined,
            passwordResetToken: passwordResetToken ?? undefined,
            passwordResetTokenExp: passwordResetTokenExp ?? undefined,
            failedLoginAttempts: failedLoginAttempts ?? 0,
            lockedUntil: lockedUntil ?? undefined,
            mfaEnabled: mfaEnabled ?? false,
            mfaCode: mfaCode ?? undefined,
            mfaCodeExp: mfaCodeExp ?? undefined,
            createdAt,
            updatedAt,
        });
    }
}

