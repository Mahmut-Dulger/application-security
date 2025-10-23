// Import the service and the database modules (to be mocked)
import eventService from '../../service/event.service';
import userDB from '../../repository/user.db';
import eventDB from '../../repository/event.db';

// Mock the database modules to isolate tests from real DB behavior
jest.mock('../../repository/user.db');
jest.mock('../../repository/event.db');
// describe = Groups related tests under a common heading

describe('Event Service', () => {
    // Mocked organiser user object (with ID 1)
    const organiser = {
        getId: () => 1,
        getIsOrganiser: () => true,
    } as any;

    // Mocked client user object (with ID 2)
    const client = {
        getId: () => 2,
        getIsOrganiser: () => false,
    } as any;

    // Reset mocks before each test to avoid test interference
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ✅ Test: Organiser can create an event if they don't have one on the same day
    it('should create a new experience for an organiser if no event exists on the same day', async () => {
        // Mock user lookup to return organiser
        (userDB.getUserById as jest.Mock).mockResolvedValue(organiser);

        // Mock event lookup to return no events (empty array)
        (eventDB.getEventsByOrganiserId as jest.Mock).mockResolvedValue([]);

        // Mock event creation to return an object with the same fields + getter methods
        (eventDB.createEvent as jest.Mock).mockImplementation(async (data) => ({
            ...data,
            getDate: () => new Date(data.date),
            getName: () => data.name,
            getLocation: () => data.location,
        }));

        // Call the service method to create the event
        const event = await eventService.createEvent({
            name: 'Test Event',
            description: 'Test Desc',
            date: new Date(Date.now() + 86400000), // tomorrow
            location: 'Test Location',
            organiserId: 1,
        });

        // Assert the returned event has expected values
        expect(event.getName()).toBe('Test Event');
        expect(event.getLocation()).toBe('Test Location');
    });

    // ❌ Test: Organiser can't create two events on the same day
    it('should throw if organiser already has an event on the same day', async () => {
        (userDB.getUserById as jest.Mock).mockResolvedValue(organiser);

        const sameDay = new Date(Date.now() + 86400000);

        // Mock existing event on the same date
        (eventDB.getEventsByOrganiserId as jest.Mock).mockResolvedValue([
            { getDate: () => sameDay }
        ]);

        // Attempt to create another event on the same date should throw
        await expect(
            eventService.createEvent({
                name: 'Another Event',
                description: 'Desc',
                date: sameDay,
                location: 'Loc',
                organiserId: 1,
            })
        ).rejects.toThrow('You already have an experience on this day.');
    });

    // ❌ Test: Clients (non-organisers) are not allowed to create events
    it('should throw if a client tries to create an experience', async () => {
        (userDB.getUserById as jest.Mock).mockResolvedValue(client);

        // Attempt to create an event as a client should throw
        await expect(
            eventService.createEvent({
                name: 'Client Event',
                description: 'Desc',
                date: new Date(Date.now() + 86400000),
                location: 'Loc',
                organiserId: 2,
            })
        ).rejects.toThrow('Only organisers can create experiences');
    });

    // ✅ Test: Fetching all events returns expected data
    it('should return all experiences', async () => {
        // Mock event list with two sample events
        (eventDB.getAllEvents as jest.Mock).mockResolvedValue([
            { getName: () => 'Event1' },
            { getName: () => 'Event2' },
        ]);

        const events = await eventService.getAllEvents();

        // Assert correct length and values
        expect(events.length).toBe(2);
        expect(events[0].getName()).toBe('Event1');
    });
});