import { Event as EventPrisma, User as UserPrisma } from '@prisma/client';
import { User } from './user';

export class Event {
    private id?: number;
    private createdAt: Date;
    private updatedAt: Date;
    private name: string;
    private description: string;
    private date: Date;
    private location: string;
    private organiser: User;
    private attendees: User[];

    constructor(event: {
        id?: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string;
        date: Date;
        location: string;
        organiser: User;
        attendees: User[];
    }) {
        this.validate(event);

        this.id = event.id;
        this.createdAt = event.createdAt;
        this.updatedAt = event.updatedAt;
        this.name = event.name;
        this.description = event.description;
        this.date = event.date;
        this.location = event.location;
        this.organiser = event.organiser;
        this.attendees = event.attendees;
    }

    validate(event: {
        name: string;
        description: string;
        date: Date;
        location: string;
        organiser: User;
    }) {
        if (!event.name?.trim()) {
            throw new Error('Event name is required');
        }
        if (!event.description?.trim()) {
            throw new Error('Event description is required');
        }
        if (!event.date) {
            throw new Error('Event date is required');
        }
        if (event.date <= new Date()) {
            throw new Error('Event date must be in the future');
        }
        if (!event.location?.trim()) {
            throw new Error('Event location is required');
        }
        if (!event.organiser) {
            throw new Error('Event organiser is required');
        }
        if (!event.organiser.getIsOrganiser()) {
            throw new Error('User must have organiser role to organise events');
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

    getName(): string {
        return this.name;
    }

    getDescription(): string {
        return this.description;
    }

    getDate(): Date {
        return this.date;
    }

    getLocation(): string {
        return this.location;
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

    equals(event: Event): boolean {
        return (
            this.name === event.getName() &&
            this.description === event.getDescription() &&
            this.date.getTime() === event.getDate().getTime() &&
            this.location === event.getLocation() &&
            this.organiser.equals(event.getOrganiser())
        );
    }

    static from({
        id,
        createdAt,
        updatedAt,
        name,
        description,
        date,
        location,
        organiser,
        attendees,
    }: EventPrisma & { organiser: UserPrisma; attendees?: UserPrisma[] }) {
        return new Event({
            id,
            createdAt,
            updatedAt,
            name,
            description,
            date,
            location,
            organiser: User.from(organiser),
            attendees: attendees ? attendees.map((user) => User.from(user)) : [],
        });
    }
}
