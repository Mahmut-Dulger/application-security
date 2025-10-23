import { Event } from '../model/event';
import database from './database';

const getAllEvents = async (): Promise<Event[]> => {
    try {
        const eventsPrisma = await database.event.findMany({
    //  For each event fetched,
	// 	Also fetch:
	// 	The related organiser (e.g. the user or entity who created the event)
	// 	The related attendees (e.g. list of users attending)
            include: {
                organiser: true,
                attendees: true,
            },
        });
        //Take each raw event from the database, convert it to a proper Event object using the from() method, and return the array of those.
        return eventsPrisma.map((eventPrisma) => Event.from(eventPrisma));
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

const getEventById = async ({ id }: { id: number }): Promise<Event | null> => {
    try {
        const eventPrisma = await database.event.findUnique({
            // filter by event ID
            where: { id },
            include: {
                organiser: true,
                attendees: true,
            },
        });
        // If no event is found, return null
        return eventPrisma ? Event.from(eventPrisma) : null;
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

const getEventsByOrganiserId = async ({
    organiserId,
}: {
    organiserId: number;
}): Promise<Event[]> => {
    try {
        const eventsPrisma = await database.event.findMany({
            where: { organiserId },
            include: {
                organiser: true,
                attendees: true,
            },
        });
        return eventsPrisma.map((eventPrisma) => Event.from(eventPrisma));
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

const createEvent = async ({
    name,
    description,
    date,
    location,
    organiserId,
}: {
    name: string;
    description: string;
    date: Date;
    location: string;
    organiserId: number;
}): Promise<Event> => {
    try {
        const eventPrisma = await database.event.create({
            data: {
                name,
                description,
                date,
                location,
                organiserId,
            },
            include: {
                organiser: true,
                attendees: true,
            },
        });
        return Event.from(eventPrisma);
    } catch (error) {
        console.error(error);
        throw new Error('Database error. See server log for details.');
    }
};

export default {
    getAllEvents,
    getEventById,
    getEventsByOrganiserId,
    createEvent,
};
