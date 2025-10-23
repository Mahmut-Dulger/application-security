type UserInput = {
    id?: number;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    isOrganiser: boolean;
};

type AuthenticationResponse = {
    token: string;
    id: number;
    firstName: string;
    lastName: string;
    role: 'ORGANISER' | 'CLIENT';
};

type ExperienceInput = {
    name: string;
    description: string;
    date: Date | string;
    location: string;
    organiserId?: number;
};

type Experience = {
    id: number;
    name: string;
    description: string;
    date: Date;
    location: string;
    organiser: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        isOrganiser: boolean;
    };
    attendees: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        isOrganiser: boolean;
    }[];
    createdAt: Date;
    updatedAt: Date;
};

export { UserInput, AuthenticationResponse, ExperienceInput, Experience };
