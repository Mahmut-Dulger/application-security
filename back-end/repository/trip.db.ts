import { ca } from 'date-fns/locale';
import { Trip } from '../model/trip';
import database from './database';

// implement these two functions

const getAllTrips = async () => {
    try {
        const tripsPrisma = await database.trip.findMany({
            include: {
                organiser: true,
                attendees: true,
            },
        });
        return tripsPrisma.map((tripPrisma) => Trip.from(tripPrisma));
    }catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

const getTripById = async ({ id }: { id: number }) => {
    try {
        const tripPrisma = await database.trip.findUnique({
            where: { id },
            include: {
                organiser: true,
                attendees: true,
            },
        });
        if (!tripPrisma) throw new Error('Trip not found');
        return Trip.from(tripPrisma);
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

export default {
    getAllTrips,
    getTripById,
};
