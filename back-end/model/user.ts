import { User as UserPrisma } from '@prisma/client';

export class User {
    private id?: number;
    private firstName: string;
    private lastName: string;
    private email: string;
    private password: string;
    private isOrganiser: boolean;

    private createdAt?: Date;
    private updatedAt?: Date;

    constructor(user: {
        id?: number;
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        isOrganiser: boolean;
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
        if (user.password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }
    }

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

    equals(other: User): boolean {
        return (
            this.firstName === other.firstName &&
            this.lastName === other.lastName &&
            this.email === other.email &&
            this.isOrganiser === other.isOrganiser &&
            this.id === other.id
        );
    }
    static from({
        id,
        firstName,
        lastName,
        email,
        password,
        isOrganiser,
        createdAt,
        updatedAt,
    }: UserPrisma): User {
        return new User({
            id,
            firstName,
            lastName,
            email,
            password,
            isOrganiser,
            createdAt,
            updatedAt,
        });
    }
}
