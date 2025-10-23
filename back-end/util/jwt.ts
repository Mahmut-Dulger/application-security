import jwt from 'jsonwebtoken';

const generateJwtToken = ({ email, isOrganiser }: { email: string; isOrganiser: boolean }): string => {
    const options = {
        expiresIn: `${process.env.JWT_EXPIRES_HOURS}h`,
        issuer: 'travel_booking_app',
    };

    try {
        return jwt.sign({ email, isOrganiser }, process.env.JWT_SECRET!, options);
    } catch (error) {
        console.log(error);
        throw new Error('Error generating JWT token, see server log for details.');
    }
};

export { generateJwtToken };
