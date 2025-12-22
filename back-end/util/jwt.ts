import jwt from 'jsonwebtoken';

const generateJwtToken = ({ userId, email, isOrganiser }: { userId: number; email: string; isOrganiser: boolean }): string => {
    const options = {
        expiresIn: `${process.env.JWT_EXPIRES_HOURS}h`,
        issuer: 'travel_booking_app',
    };

    try {
        return jwt.sign({ userId, email, isOrganiser }, process.env.JWT_SECRET!, options);
    } catch (error) {
        console.log(error);
        throw new Error('Error generating JWT token, see server log for details.');
    }
};

export { generateJwtToken };
