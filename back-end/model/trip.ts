import { Trip as TripPrisma, User as UserPrisma } from '@prisma/client';
import { User } from './user';

export class Trip {
    private id?: number;
    private createdAt: Date;
    private updatedAt: Date;
    private destination: string;
    private startDate: Date;
    private endDate: Date;
    private description: string;
    private organiser: User;
    private attendees: User[];

    constructor(trip: {
        id?: number;
        createdAt: Date;
        updatedAt: Date;
        destination: string;
        startDate: Date;
        endDate: Date;
        description: string;
        organiser: User;
        attendees: User[];
    }) {
        this.validate(trip);

        this.id = trip.id;
        this.createdAt = trip.createdAt;
        this.updatedAt = trip.updatedAt;
        this.destination = trip.destination;
        this.startDate = trip.startDate;
        this.endDate = trip.endDate;
        this.description = trip.description;
        this.organiser = trip.organiser;
        this.attendees = trip.attendees;
    }

    validate(trip: {
        destination: string;
        startDate: Date;
        endDate: Date;
        description: string;
        organiser: User;
    }) {
        if (!trip.destination?.trim()) {
            throw new Error('Destination is required');
        }
        if (!trip.startDate) {
            throw new Error('Start date is required');
        }
        if (!trip.endDate) {
            throw new Error('End date is required');
        }
        if (trip.startDate >= trip.endDate) {
            throw new Error('End date must be after start date');
        }
        if (!trip.description?.trim()) {
            throw new Error('Description is required');
        }
        if (!trip.organiser) {
            throw new Error('Organiser is required');
        }
        if (!trip.organiser.getIsOrganiser()) {
            throw new Error('User must be an organiser to organise trips');
        }
    }

    getId(): number | undefined {
        return this.id;
    }

    getCreatedAt(): Date {
        return this.createdAt;
    }

    getUpdatedAt(): Date {
        return this.updatedAt;
    }

    getDestination(): string {
        return this.destination;
    }

    getStartDate(): Date {
        return this.startDate;
    }

    getEndDate(): Date {
        return this.endDate;
    }

    getDescription(): string {
        return this.description;
    }

    getOrganiser(): User {
        return this.organiser;
    }

    getAttendees(): User[] {
        return this.attendees;
    }

    addAttendee(user: User): void {
        if (!this.attendees.find((attendee) => attendee.getId() === user.getId())) {
            this.attendees.push(user);
        }
    }

    removeAttendee(userId: number): void {
        this.attendees = this.attendees.filter((attendee) => attendee.getId() !== userId);
    }

    isUserAttending(userId: number): boolean {
        return this.attendees.some((attendee) => attendee.getId() === userId);
    }

    equals(trip: Trip): boolean {
        return (
            this.destination === trip.getDestination() &&
            this.startDate.getTime() === trip.getStartDate().getTime() &&
            this.endDate.getTime() === trip.getEndDate().getTime() &&
            this.description === trip.getDescription() &&
            this.organiser.equals(trip.getOrganiser())
        );
    }

    static from({
        id,
        createdAt,
        updatedAt,
        destination,
        startDate,
        endDate,
        description,
        organiser,
        attendees,
    }: TripPrisma & { organiser: UserPrisma; attendees?: UserPrisma[] }) {
        return new Trip({
            id,
            createdAt,
            updatedAt,
            destination,
            startDate,
            endDate,
            description,
            organiser: User.from(organiser),
            attendees: attendees ? attendees.map((user) => User.from(user)) : [],
        });
    }
}
