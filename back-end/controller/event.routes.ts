/**
 * @swagger
 * components:
 *   schemas:
 *     Experience:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *           format: int64
 *           description: Experience ID.
 *         name:
 *           type: string
 *           description: Experience name.
 *         description:
 *           type: string
 *           description: Experience description.
 *         date:
 *           type: string
 *           format: date-time
 *           description: Experience date and time.
 *         location:
 *           type: string
 *           description: Experience location.
 *         organiser:
 *           $ref: '#/components/schemas/User'
 *         attendees:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation date.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update date.
 *     ExperienceInput:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - date
 *         - location
 *       properties:
 *         name:
 *           type: string
 *           description: Experience name.
 *           example: "Wine Tasting in Brussels"
 *         description:
 *           type: string
 *           description: Experience description.
 *           example: "Join us for an exclusive wine tasting experience featuring Belgian wines."
 *         date:
 *           type: string
 *           format: date-time
 *           description: Experience date and time (must be in the future).
 *           example: "2025-07-15T19:00:00.000Z"
 *         location:
 *           type: string
 *           description: Experience location.
 *           example: "Wine Bar Marcel, Brussels"
 */
import express, { NextFunction, Request, Response } from 'express';
import eventService from '../service/event.service';
import { logger, logSecurityEvent } from '../util/logger';

const eventRouter = express.Router();

/**
 * @swagger
 * /events:
 *   get:
 *     summary: Get all travel experiences
 *     description: Retrieves all available travel experiences. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Experiences
 *     responses:
 *       200:
 *         description: List of experiences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Experience'
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "unauthorized"
 *                 message:
 *                   type: string
 *                   example: "No authorization token was found"
 */
eventRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const events = await eventService.getAllEvents();
        res.status(200).json(events);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /events/organiser/{organiserId}:
 *   get:
 *     summary: Get experiences by organiser
 *     description: Retrieves all experiences created by a specific organiser. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Experiences
 *     parameters:
 *       - in: path
 *         name: organiserId
 *         required: true
 *         description: ID of the organiser
 *         schema:
 *           type: integer
 *           format: int64
 *           example: 10
 *     responses:
 *       200:
 *         description: List of organiser's experiences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Experience'
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Organiser not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "application error"
 *                 message:
 *                   type: string
 *                   example: "User with id: 999 does not exist."
 */
eventRouter.get(
    '/organiser/:organiserId',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const organiserId = Number(req.params.organiserId);
            if (isNaN(organiserId)) {
                return res.status(400).json({ status: 'application error', message: 'Invalid organiserId' });
            }
            const events = await eventService.getEventsByOrganiserId({ organiserId });
            res.status(200).json(events);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Create a new travel experience
 *     description: Creates a new travel experience. Only organisers can create experiences. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Experiences
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExperienceInput'
 *     responses:
 *       201:
 *         description: Experience created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Experience'
 *       400:
 *         description: Bad request - Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "application error"
 *                 message:
 *                   type: string
 *                   example: "Experience date must be in the future"
 *       401:
 *         description: Unauthorized - Authentication required or user is not an organiser
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Authentication required"
 */
eventRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, description, date, location } = req.body;
        const auth = (req as any).auth;

        if (!auth || !auth.userId) {
            logger.warn({ url: req.url }, '🔓 Unauthorized event creation attempt');
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Get user by ID from JWT (preferred over email)
        const userService = require('../service/user.service').default;
        const user = await userService.getUserById({ id: auth.userId });

        if (!user || !user.getIsOrganiser()) {
            logSecurityEvent('PRIVILEGE_ESCALATION', {
                userId: auth.userId,
                reason: 'Non-organiser attempted to create experience',
            });
            return res.status(401).json({ message: 'Only organisers can create experiences' });
        }

        logger.info(
            { userId: auth.userId, eventName: name, organiser: user.getFullName() },
            '✨ Creating new experience'
        );

        const event = await eventService.createEvent({
            name,
            description,
            date,
            location,
            organiserId: user.getId(),
        });

        logger.info({ eventId: event.getId(), organiser: user.getId() }, '✅ Experience created');
        res.status(201).json(event);
    } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, '❌ Error creating experience');
        next(error);
    }
});

export { eventRouter };
