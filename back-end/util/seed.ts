// Execute: npx ts-node util/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { addDays, addHours } from 'date-fns';

const prisma = new PrismaClient();

const main = async () => {
    // Clean up existing data in the correct order (due to foreign key constraints)
    await prisma.event.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();

    // Create Organiser Users (Belgian Dutch names)
    const organiser1 = await prisma.user.create({
        data: {
            firstName: 'Liesbeth',
            lastName: 'Van Houten',
            email: 'liesbeth.vanhouten@belgische-reizen.be',
            password: await bcrypt.hash('liesbeth123', 12),
            isOrganiser: true,
        },
    });

    const organiser2 = await prisma.user.create({
        data: {
            firstName: 'Pieter',
            lastName: 'De Vries',
            email: 'pieter.devries@avontuurtochten.be',
            password: await bcrypt.hash('pieter123', 12),
            isOrganiser: true,
        },
    });

    const organiser3 = await prisma.user.create({
        data: {
            firstName: 'Marieke',
            lastName: 'Janssens',
            email: 'marieke.janssens@stadtrips.be',
            password: await bcrypt.hash('marieke123', 12),
            isOrganiser: true,
        },
    });

    // Create Client Users (Belgian Dutch names)
    const client1 = await prisma.user.create({
        data: {
            firstName: 'Jan',
            lastName: 'Peeters',
            email: 'jan.peeters@telenet.be',
            password: await bcrypt.hash('jan123', 12),
            isOrganiser: false,
        },
    });

    const client2 = await prisma.user.create({
        data: {
            firstName: 'Els',
            lastName: 'Van Den Berg',
            email: 'els.vandenberg@skynet.be',
            password: await bcrypt.hash('els123', 12),
            isOrganiser: false,
        },
    });

    const client3 = await prisma.user.create({
        data: {
            firstName: 'Koen',
            lastName: 'Willems',
            email: 'koen.willems@proximus.be',
            password: await bcrypt.hash('koen123', 12),
            isOrganiser: false,
        },
    });

    const client4 = await prisma.user.create({
        data: {
            firstName: 'Sofie',
            lastName: 'Mertens',
            email: 'sofie.mertens@gmail.com',
            password: await bcrypt.hash('sofie123', 12),
            isOrganiser: false,
        },
    });

    const client5 = await prisma.user.create({
        data: {
            firstName: 'Thomas',
            lastName: 'Claes',
            email: 'thomas.claes@outlook.be',
            password: await bcrypt.hash('thomas123', 12),
            isOrganiser: false,
        },
    });

    const client6 = await prisma.user.create({
        data: {
            firstName: 'Annelies',
            lastName: 'Van Damme',
            email: 'annelies.vandamme@hotmail.be',
            password: await bcrypt.hash('annelies123', 12),
            isOrganiser: false,
        },
    });

    // Create Trips (Belgian destinations)
    const trip1 = await prisma.trip.create({
        data: {
            destination: 'Brugge',
            startDate: addDays(new Date(), 10),
            endDate: addDays(new Date(), 12),
            description:
                'Een romantisch weekend in het prachtige Brugge. Bezoek de historische binnenstad, geniet van Belgische chocolade en maak een boottocht door de grachten.',
            organiserId: organiser1.id,
            attendees: {
                connect: [{ id: client1.id }, { id: client2.id }, { id: client3.id }],
            },
        },
    });

    const trip2 = await prisma.trip.create({
        data: {
            destination: 'Ardennen',
            startDate: addDays(new Date(), 20),
            endDate: addDays(new Date(), 25),
            description:
                'Avontuurlijke wandeltocht door de Belgische Ardennen. Ontdek prachtige natuur, bezoek kastelen en geniet van lokale specialiteiten.',
            organiserId: organiser2.id,
            attendees: {
                connect: [{ id: client4.id }, { id: client5.id }],
            },
        },
    });

    const trip3 = await prisma.trip.create({
        data: {
            destination: 'Antwerpen',
            startDate: addDays(new Date(), 15),
            endDate: addDays(new Date(), 17),
            description:
                'Culturele stadsreis naar Antwerpen. Bezoek het MAS museum, de diamantwijk en geniet van de bruisende sfeer in de stad.',
            organiserId: organiser3.id,
            attendees: {
                connect: [{ id: client1.id }, { id: client6.id }],
            },
        },
    });

    // Create Events (Belgian cultural events)
    const event1 = await prisma.event.create({
        data: {
            name: 'Bierproeverij in Leuven',
            description:
                'Proef de beste Belgische bieren onder begeleiding van een bierbrouwer. Leer over de geschiedenis en tradities van het Belgische bier.',
            date: addDays(new Date(), 7),
            location: 'Brouwerij De Hems, Leuven',
            organiserId: organiser1.id,
            attendees: {
                connect: [{ id: client1.id }, { id: client3.id }, { id: client5.id }],
            },
        },
    });

    const event2 = await prisma.event.create({
        data: {
            name: 'Chocolade masterclass in Brussel',
            description:
                'Leer de kunst van het chocolade maken van een echte chocolatier. Maak je eigen pralines en neem ze mee naar huis.',
            date: addDays(new Date(), 14),
            location: 'Chocolaterie Marcolini, Brussel',
            organiserId: organiser2.id,
            attendees: {
                connect: [{ id: client2.id }, { id: client4.id }],
            },
        },
    });

    const event3 = await prisma.event.create({
        data: {
            name: 'Foodfestival in Gent',
            description:
                'Geniet van lokale specialiteiten en internationale keuken op het jaarlijkse foodfestival in het hart van Gent.',
            date: addDays(new Date(), 21),
            location: 'Korenmarkt, Gent',
            organiserId: organiser3.id,
            attendees: {
                connect: [{ id: client3.id }, { id: client6.id }],
            },
        },
    });

    const event4 = await prisma.event.create({
        data: {
            name: 'Culturele avond in Brugge',
            description:
                'Een avond vol muziek, kunst en cultuur in de historische binnenstad van Brugge. Met optredens van lokale artiesten.',
            date: addDays(new Date(), 28),
            location: 'Concertgebouw Brugge',
            organiserId: organiser1.id,
            attendees: {
                connect: [
                    { id: client1.id },
                    { id: client2.id },
                    { id: client4.id },
                    { id: client5.id },
                ],
            },
        },
    });

    console.log('Database has been seeded with Belgian Dutch users, trips, and events! 🇧🇪');
    console.log(`Created ${await prisma.user.count()} users`);
    console.log(`Created ${await prisma.trip.count()} trips`);
    console.log(`Created ${await prisma.event.count()} events`);
};

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
