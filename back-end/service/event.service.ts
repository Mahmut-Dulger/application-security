import eventDB from '../repository/event.db';
import userDB from '../repository/user.db';
import { Event } from '../model/event';
import { User } from '../model/user';

const getAllEvents = async (): Promise<Event[]> => {
    return eventDB.getAllEvents();
};

const getEventById = async ({ id }: { id: number }): Promise<Event> => {
    const event = await eventDB.getEventById({ id });
    if (!event) {
        throw new Error(`Event with id: ${id} does not exist.`);
    }
    return event;
};

const getEventsByOrganiserId = async ({ organiserId }: { organiserId: number }): Promise<Event[]> => {
    return eventDB.getEventsByOrganiserId({ organiserId });
};

const getUpcomingEvents = async (): Promise<Event[]> => {
    const allEvents = await eventDB.getAllEvents();
    const now = new Date();
    return allEvents.filter((event) => event.getDate() > now);
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
    // Check organiser
    const organiser = await userDB.getUserById({ id: organiserId });
    if (!organiser) throw new Error('Organiser not found');
    if (!organiser.getIsOrganiser()) throw new Error('Only organisers can create experiences');
    // Validate date
    const eventDate = new Date(date);
    if (eventDate <= new Date()) throw new Error('Experience date must be in the future');

    // Check for existing event on the same day for this organiser
    const existingEvents = await eventDB.getEventsByOrganiserId({ organiserId });
    const sameDayEvent = existingEvents.find(ev => {
        const evDate = new Date(ev.getDate());
        return (
            evDate.getFullYear() === eventDate.getFullYear() &&
            evDate.getMonth() === eventDate.getMonth() &&
            evDate.getDate() === eventDate.getDate()
        );
    });
    if (sameDayEvent) {
        throw new Error('You already have an experience on this day.');
    }

    return eventDB.createEvent({
        name,
        description,
        date: eventDate,
        location,
        organiserId,
    });
};

export default {
    getAllEvents,
    getEventById,
    getEventsByOrganiserId,
    getUpcomingEvents,
    createEvent,
};
