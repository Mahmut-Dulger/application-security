// Import the trip service and the trip database module (to be mocked)
import tripService from '../../service/trip.service';
import tripDB from '../../repository/trip.db';

// Mock the trip database so no real database is accessed
jest.mock('../../repository/trip.db');

describe('Trip Service', () => {
    // Reset all mocks before each test to ensure clean state
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ✅ Test: Should return all trips
    it('should return all trips', async () => {
        // Mock the database to return a list of two trips
        (tripDB.getAllTrips as jest.Mock).mockResolvedValue([
            { getDestination: () => 'Brugge' },
            { getDestination: () => 'Ardennen' },
        ]);

        // Call the service to get all trips
        const trips = await tripService.getAllTrips();

        // Check that two trips are returned with correct destinations
        expect(trips.length).toBe(2);
        expect(trips[0].getDestination()).toBe('Brugge');
    });

    // ✅ Test: Should return a single trip by ID
    it('should return a trip by id', async () => {
        // Mock DB to return a specific trip for ID 1
        (tripDB.getTripById as jest.Mock).mockResolvedValue({
            getId: () => 1,
            getDestination: () => 'Brugge',
        });

        // Call the service to get trip by ID
        const trip = await tripService.getTripById({ id: 1 });

        // Assert trip data is correct
        expect(trip.getId()).toBe(1);
        expect(trip.getDestination()).toBe('Brugge');
    });

    // ❌ Test: Should throw if no trip exists for given ID
    it('should throw if trip does not exist', async () => {
        // Mock DB to return null for unknown ID
        (tripDB.getTripById as jest.Mock).mockResolvedValue(null);

        // Expect service to throw an error when trip is not found
        await expect(tripService.getTripById({ id: 999 })).rejects.toThrow('Trip with id: 999 does not exist.');
    });

    // ✅ Test: Should return only upcoming trips
    it('should return only upcoming trips', async () => {
        const now = new Date();

        // Mock DB to return one future trip and one past trip
        (tripDB.getAllTrips as jest.Mock).mockResolvedValue([
            { getStartDate: () => new Date(now.getTime() + 86400000) }, // tomorrow
            { getStartDate: () => new Date(now.getTime() - 86400000) }, // yesterday
        ]);

        // Call the service to get only upcoming trips
        const trips = await tripService.getUpcomingTrips();

        // Assert only one trip is returned and it is in the future
        expect(trips.length).toBe(1);
        expect(trips[0].getStartDate().getTime()).toBeGreaterThan(now.getTime());
    });
});