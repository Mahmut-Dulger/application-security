import userService from '../../service/user.service';
import userDB from '../../repository/user.db';
import emailService from '../../util/email.service';

// Mock the database and email modules
jest.mock('../../repository/user.db');
jest.mock('../../util/email.service');

describe('User Signup Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully create a user with valid credentials', async () => {
        // Mock database call - user doesn't exist
        (userDB.getUserByEmail as jest.Mock).mockResolvedValue(null);
        
        // Mock user creation
        (userDB.createUser as jest.Mock).mockResolvedValue({
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            isOrganiser: false,
        });

        // Mock email service
        (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

        const result = await userService.signup({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'SecurePass123!',
            isOrganiser: false,
        });

        expect(result.message).toContain('Account created successfully');
        expect(userDB.createUser).toHaveBeenCalled();
        expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should reject signup if email already exists', async () => {
        // Mock database call - user exists
        (userDB.getUserByEmail as jest.Mock).mockResolvedValue({
            id: 1,
            email: 'existing@example.com',
        });

        await expect(
            userService.signup({
                firstName: 'John',
                lastName: 'Doe',
                email: 'existing@example.com',
                password: 'SecurePass123!',
                isOrganiser: false,
            })
        ).rejects.toThrow('Email already registered');
    });

    it('should reject password that is too short', async () => {
        (userDB.getUserByEmail as jest.Mock).mockResolvedValue(null);

        await expect(
            userService.signup({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                password: 'Short1!',
                isOrganiser: false,
            })
        ).rejects.toThrow();
    });

    it('should reject password missing uppercase letter', async () => {
        (userDB.getUserByEmail as jest.Mock).mockResolvedValue(null);

        await expect(
            userService.signup({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                password: 'securepass123!',
                isOrganiser: false,
            })
        ).rejects.toThrow();
    });

    it('should reject password missing lowercase letter', async () => {
        (userDB.getUserByEmail as jest.Mock).mockResolvedValue(null);

        await expect(
            userService.signup({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                password: 'SECUREPASS123!',
                isOrganiser: false,
            })
        ).rejects.toThrow();
    });

    it('should reject password missing number', async () => {
        (userDB.getUserByEmail as jest.Mock).mockResolvedValue(null);

        await expect(
            userService.signup({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                password: 'SecurePass!',
                isOrganiser: false,
            })
        ).rejects.toThrow();
    });

    it('should reject password missing special character', async () => {
        (userDB.getUserByEmail as jest.Mock).mockResolvedValue(null);

        await expect(
            userService.signup({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                password: 'SecurePass123',
                isOrganiser: false,
            })
        ).rejects.toThrow();
    });

    it('should reject password that contains email address', async () => {
        (userDB.getUserByEmail as jest.Mock).mockResolvedValue(null);

        await expect(
            userService.signup({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                password: 'JohnSecurePass123!',
                isOrganiser: false,
            })
        ).rejects.toThrow('must not contain');
    });

    it('should allow signup with organiser flag', async () => {
        (userDB.getUserByEmail as jest.Mock).mockResolvedValue(null);
        
        (userDB.createUser as jest.Mock).mockResolvedValue({
            id: 2,
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            isOrganiser: true,
        });

        (emailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

        const result = await userService.signup({
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            password: 'SecurePass123!',
            isOrganiser: true,
        });

        expect(result.message).toContain('Account created successfully');
        expect(userDB.createUser).toHaveBeenCalledWith(
            expect.objectContaining({
                isOrganiser: true,
            })
        );
    });
});
