# Access Control Assessment

## Executive Summary
Your application implements a **Role-Based Access Control (RBAC)** model with JWT authentication. The system features two distinct roles (CLIENT and ORGANISER) with token-based authorization. While the basic framework is sound, there are critical security vulnerabilities in the current implementation, primarily related to Insecure Direct Object Reference (IDOR) attacks, missing resource ownership validation, and insufficient horizontal access control checks.

---

## 1. Current Access Control Model

### Authentication Model
- **Mechanism**: JWT (JSON Web Tokens) using HS256 algorithm
- **Token Generation**: Issued upon successful login with bcrypt password validation
- **Token Payload**: `{ email, isOrganiser }`
- **Token Expiration**: Configurable (set via JWT_EXPIRES_HOURS environment variable)
- **Validation**: express-jwt middleware on all protected routes

### Authorization Model: RBAC with Two Roles

| Role | `isOrganiser` Flag | Capabilities |
|------|------------------|--------------|
| **CLIENT** | `false` | • View all trips (public)<br>• View all experiences (requires auth)<br>• View experiences by organiser<br>• Cannot create, update, or delete trips/experiences |
| **ORGANISER** | `true` | • All CLIENT capabilities<br>• Create new experiences (with validation)<br>• Create trips (implied but not visible in routes)<br>• Can only create events with date validations |

### Protected Routes
Routes requiring JWT authentication:
- `POST /events` - Create experience (ORGANISER only)
- `GET /events` - List all experiences (authenticated users)
- `GET /events/organiser/:organiserId` - List organiser's experiences (authenticated users)

Routes without authentication required:
- `GET /trips` - List all trips (public)
- `GET /trips/:id` - Get specific trip (public)
- `POST /users/login` - User authentication (public)

---

## 2. Privilege Escalation Prevention Analysis

### ✅ **Strengths**
1. **Role Immutability**: The `isOrganiser` flag is part of the JWT payload and cannot be modified client-side—the server validates it on every request.
2. **Service-Level Validation**: The `createEvent()` service explicitly checks `organiser.getIsOrganiser()` before allowing event creation:
   ```typescript
   if (!organiser.getIsOrganiser()) throw new Error('Only organisers can create experiences');
   ```
3. **Database Integrity**: User roles are stored in the database (Prisma model) and fetched server-side, preventing tampering.

### ❌ **Critical Vulnerability: Privilege Escalation via Email Spoofing**
The application uses only the `email` claim from JWT to identify users:

```typescript
// In event.routes.ts - POST /events
const auth = (req as any).auth;  // Contains: { email, isOrganiser }
const user = await userService.getUserByEmail({ email: auth.email });
```

**Attack Scenario**:
1. Attacker with email `attacker@example.com` creates an account (CLIENT role)
2. Attacker obtains JWT: `{ email: "attacker@example.com", isOrganiser: false }`
3. Attacker cannot directly forge `isOrganiser: true` (it would fail JWT signature validation)
4. **BUT**: If the application later adds endpoints that use only `email` to look up user role (without validating the JWT signature), this is exploitable

**Root Cause**: Missing `userId` in JWT payload. Email-based identification is unreliable because:
- Emails can change
- Email lookups are slower than ID lookups
- Email is not guaranteed unique in all systems
- If JWT validation is bypassed (via misconfiguration), email-based attacks are possible

### ⚠️ **Moderate Risk: Trust in Email During Event Creation**
The create event endpoint trusts the JWT's email claim to fetch the user and verify organiser status. While the JWT is signed, this creates implicit dependency on a single claim.

---

## 3. Horizontal Access Control Analysis

### ✅ **Current Implementation**
```typescript
// Trip routes - Public access
tripRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    const trip = await tripService.getTripById({ id });
    // No ownership check - this is intentional (trips are public)
});

// Event routes - Public access (after auth)
eventRouter.get('/organiser/:organiserId', async (req: Request, res: Response, next: NextFunction) => {
    const organiserId = Number(req.params.organiserId);
    const events = await eventService.getEventsByOrganiserId({ organiserId });
    // Public listing by organiser - expected behavior
});
```

### ❌ **CRITICAL: Potential IDOR Vulnerability**
**The application does not implement ownership validation for user-specific resources.** 

Currently exposed:
- **No user profile endpoints** to view/edit user data (this is fine - mitigates IDOR for users)
- **Trip/Event data is public** by design (trips are viewable by anyone, events viewable by authenticated users)

**However, if the application adds these endpoints in the future, it WILL have IDOR vulnerabilities**:

```typescript
// Example: Hypothetical future endpoint that WOULD have IDOR
GET /users/:userId/profile  // Missing check: Is requesting user the same as :userId?
GET /users/:userId/trips    // Missing check: Does the user own these trips?
PUT /users/:userId/profile  // Missing check: Only user should update own profile
DELETE /events/:eventId     // Missing check: Only organiser should delete own event
```

**Example Attack**:
```bash
# User A (id=1) logs in, gets JWT with email="userA@example.com"
GET /users/2/profile  # User A can now view User B's profile (IDOR)
```

### ✅ **What PREVENTS wider IDOR attacks**:
1. **Limited exposed endpoints** - Only trips and events are public/semi-public
2. **Public data model** - Trips and events are meant to be viewable (no ownership expectation)
3. **No user profile endpoints** visible in current code

---

## 4. Multi-Step Process Protection

### ✅ **Identified Multi-Step Process: Experience Creation**

The application validates a multi-step process during event creation:

```typescript
const createEvent = async ({
    name, description, date, location, organiserId
}): Promise<Event> => {
    // Step 1: Verify organiser exists
    const organiser = await userDB.getUserById({ id: organiserId });
    if (!organiser) throw new Error('Organiser not found');
    
    // Step 2: Verify user has ORGANISER role
    if (!organiser.getIsOrganiser()) throw new Error('Only organisers can create experiences');
    
    // Step 3: Validate date is in future
    const eventDate = new Date(date);
    if (eventDate <= new Date()) throw new Error('Experience date must be in the future');
    
    // Step 4: Check for duplicate events on same day
    const existingEvents = await eventDB.getEventsByOrganiserId({ organiserId });
    const sameDayEvent = existingEvents.find(ev => {
        const evDate = new Date(ev.getDate());
        return evDate.getFullYear() === eventDate.getFullYear() &&
               evDate.getMonth() === eventDate.getMonth() &&
               evDate.getDate() === eventDate.getDate();
    });
    if (sameDayEvent) throw new Error('You already have an experience on this day');
    
    // Step 5: Create event
    return eventDB.createEvent({ name, description, date: eventDate, location, organiserId });
};
```

**Protections Against Step Skipping**:
- ✅ **Server-side validation** - All checks happen server-side in service layer (cannot be bypassed by client)
- ✅ **Sequential checks** - Each step is validated before proceeding
- ✅ **Atomic operation** - Event is only created after all validations pass
- ✅ **No client-side enforcement** - No reliance on frontend validations

**Potential weakness**: No transaction wrapping if multiple events could be created concurrently (race condition on same-day duplicate check), but low risk in practice.

---

## 5. Security Vulnerabilities Summary

### Critical Issues

| Vulnerability | Severity | Impact | Location |
|---|---|---|---|
| **Missing `userId` in JWT** | HIGH | IDOR attacks if email-based lookups become common | `util/jwt.ts` |
| **Email-based user identification** | HIGH | Assumes email uniqueness and immutability | `controller/event.routes.ts` POST /events |
| **No IDOR protection for future endpoints** | HIGH | Any new user-specific endpoints will be vulnerable | All controllers |

### Moderate Issues

| Vulnerability | Severity | Impact | Location |
|---|---|---|---|
| **CORS origin hardcoded** | MEDIUM | Cannot easily configure for different environments | `app.ts` line 52: `origin: 'http://localhost:8080'` |
| **No rate limiting on login** | MEDIUM | Brute force attacks on authentication | `controller/user.routes.ts` POST /login |
| **No logout mechanism** | MEDIUM | Tokens are valid until expiration; cannot revoke | N/A (no logout endpoint) |

### Low Issues

| Vulnerability | Severity | Impact | Location |
|---|---|---|---|
| **Password minimum 6 characters** | LOW | Weak password requirements per OWASP | `model/user.ts` |
| **Same-day event duplicate check** | LOW | Race condition possible with concurrent requests | `service/event.service.ts` createEvent |

---

## 6. Recommendations

### Immediate Actions (Critical)

1. **Add `userId` to JWT payload**
   ```typescript
   // In util/jwt.ts
   jwt.sign(
       { userId: user.getId(), email, isOrganiser },  // Add userId
       JWT_SECRET!,
       { expiresIn: `${JWT_EXPIRES_HOURS}h`, issuer: 'travel_booking_app' }
   );
   ```

2. **Update all user lookups to use `userId`**
   ```typescript
   // In event.routes.ts POST /events (instead of email lookup)
   const userId = (req as any).auth.userId;
   const user = await userService.getUserById({ id: userId });
   // Pass userId to createEvent instead of fetching by email
   ```

3. **Implement centralized authorization middleware** for protected resources
   ```typescript
   // Middleware to prevent IDOR on user-specific endpoints
   const authorizeResourceOwner = (userIdParam: string) => {
       return (req: Request, res: Response, next: NextFunction) => {
           const requestedUserId = Number(req.params[userIdParam]);
           const authUserId = (req as any).auth.userId;
           if (requestedUserId !== authUserId) {
               return res.status(403).json({ message: 'Forbidden: Cannot access other users resources' });
           }
           next();
       };
   };
   ```

### Short-term Actions (High)

4. **Implement rate limiting on login endpoint**
   ```typescript
   import rateLimit from 'express-rate-limit';
   
   const loginLimiter = rateLimit({
       windowMs: 15 * 60 * 1000,  // 15 minutes
       max: 5  // 5 attempts per IP
   });
   
   userRouter.post('/login', loginLimiter, async (req, res) => { ... });
   ```

5. **Add logout endpoint with token blacklisting** (if supported)
   ```typescript
   const tokenBlacklist = new Set<string>();
   
   userRouter.post('/logout', (req: Request, res: Response) => {
       const token = req.headers.authorization?.split(' ')[1];
       if (token) tokenBlacklist.add(token);
       res.json({ message: 'Logged out successfully' });
   });
   ```

6. **Increase password requirements to OWASP standards**
   ```typescript
   // In model/user.ts - minimum 12 characters, complexity requirements
   if (password.length < 12) throw new Error('Password must be at least 12 characters');
   if (!/[A-Z]/.test(password)) throw new Error('Password must contain uppercase');
   if (!/[0-9]/.test(password)) throw new Error('Password must contain numbers');
   if (!/[!@#$%^&*]/.test(password)) throw new Error('Password must contain special characters');
   ```

### Medium-term Actions (Medium)

7. **Configure CORS dynamically**
   ```typescript
   const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8080'];
   app.use(cors({ origin: allowedOrigins }));
   ```

8. **Implement resource ownership validation for all new endpoints**
   - Before returning any user-specific data, verify requester owns the resource
   - Follow pattern: `if (resource.userId !== req.auth.userId) throw UnauthorizedError()`

---

## 7. Conclusion

Your application has a **solid RBAC foundation** with proper JWT validation and role-based checks preventing privilege escalation. The multi-step event creation process is correctly protected against bypassing.

However, the **critical missing `userId` in JWT tokens** creates a latent vulnerability that becomes dangerous as the application grows with more user-specific endpoints. The email-based user identification is a code smell that should be replaced with IDs.

**Risk Level**: 🟡 **MEDIUM** (currently mitigated by limited endpoint exposure, but HIGH risk with future expansion)

**Time to Remediate Critical Issues**: 2-4 hours (adding `userId` to JWT + updating 3-4 lookup locations)
