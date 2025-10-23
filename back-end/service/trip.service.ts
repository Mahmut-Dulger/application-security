import tripDB from '../repository/trip.db';
import userDB from '../repository/user.db';
import { Trip } from '../model/trip';
import { User } from '../model/user';

const getAllTrips = async (): Promise<Trip[]> => tripDB.getAllTrips();

const getTripById = async ({ id }: { id: number }): Promise<Trip> => {
    const trip = await tripDB.getTripById({ id });
    if (!trip) {
        throw new Error(`Trip with id: ${id} does not exist.`);
    }
    return trip;
};

const getUpcomingTrips = async (): Promise<Trip[]> => {
    const allTrips = await tripDB.getAllTrips();
    const now = new Date();
    return allTrips.filter((trip) => trip.getStartDate() > now);
};

export default {
    getAllTrips,
    getTripById,
    getUpcomingTrips,
};
