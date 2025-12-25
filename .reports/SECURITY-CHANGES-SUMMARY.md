# Quick Reference: Security Changes Applied

## 8 Critical Security Fixes Implemented ✅

### 1. **JWT Now Contains User ID**
- **Before**: JWT payload = `{ email, isOrganiser }`  
- **After**: JWT payload = `{ userId, email, isOrganiser }`
- **Prevents**: IDOR attacks, email-based spoofing
- **File**: `back-end/util/jwt.ts`

### 2. **User Lookup Uses ID Instead of Email**
- New method: `getUserById({ id: number })`
- Event creation now uses `auth.userId` from JWT
- **Prevents**: Email-based authorization bypass
- **Files**: `back-end/service/user.service.ts`, `back-end/controller/event.routes.ts`

### 3. **Login Rate Limiting (5 attempts / 15 minutes)**
```typescript
POST /users/login // Limited to 5 attempts per IP per 15 minutes
```
- **Prevents**: Brute force attacks
- **Dependencies**: `express-rate-limit` (newly added)
- **File**: `back-end/controller/user.routes.ts`

### 4. **Logout Endpoint with Token Blacklisting**
```typescript
POST /users/logout // Invalidates JWT token immediately
```
- User tokens are blacklisted upon logout
- Blacklisted tokens rejected on all subsequent requests
- **File**: `back-end/controller/user.routes.ts`, `back-end/app.ts`

### 5. **OWASP Password Requirements**
- ✅ Minimum 12 characters (was 6)
- ✅ At least 1 uppercase letter
- ✅ At least 1 number  
- ✅ At least 1 special character (!@#$%^&* etc.)
- **File**: `back-end/model/user.ts`

### 6. **Dynamic CORS Configuration**
```bash
# Environment variable (comma-separated for multiple origins)
ALLOWED_ORIGINS=https://app.example.com,https://api.example.com
```
- No hardcoded origins
- **File**: `back-end/app.ts`

### 7. **Token Blacklist Middleware**
- All requests check blacklist before JWT validation
- Logged-out tokens (in blacklist) are rejected immediately
- **File**: `back-end/app.ts`

### 8. **Assessment Documentation**
- `ACCESS-CONTROL-ASSESSMENT.md` - Full security analysis
- `SECURITY-IMPROVEMENTS.md` - Implementation details & testing guide
- **Location**: `.reports/` and root directory

---

## Impact Summary

| Issue | Before | After | Risk Reduction |
|-------|--------|-------|---|
| **User ID in JWT** | ❌ Missing | ✅ Added | HIGH → LOW |
| **Brute Force** | ❌ Unprotected | ✅ Rate Limited | HIGH → LOW |
| **Logout Mechanism** | ❌ None | ✅ Token Blacklist | MEDIUM → LOW |
| **Password Strength** | ⚠️ 6 chars | ✅ OWASP | MEDIUM → LOW |
| **CORS Config** | ⚠️ Hardcoded | ✅ Dynamic | LOW → NONE |
| **IDOR Risk** | ⚠️ Email-based | ✅ ID-based | MEDIUM → LOW |

---

## Testing Commands

### Test Rate Limiting
```bash
# Run 6+ times to trigger limit
for i in {1..6}; do
  curl -X POST http://localhost:3000/users/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"WrongPass123!"}'
  echo "Attempt $i"
done
```

### Test Logout
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"YourPass123!"}' | jq -r '.token')

# Check token works
curl -X GET http://localhost:3000/events \
  -H "Authorization: Bearer $TOKEN"

# Logout
curl -X POST http://localhost:3000/users/logout \
  -H "Authorization: Bearer $TOKEN"

# Try to use token again (should fail with "Token has been revoked")
curl -X GET http://localhost:3000/events \
  -H "Authorization: Bearer $TOKEN"
```

### Test Password Requirements
```bash
# Missing uppercase - will fail
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123!"}'

# Valid password
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"ValidPass123!"}'
```

### Verify JWT Contains userId
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"YourPass123!"}' | jq -r '.token')

# Decode and view JWT payload
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq .
# Output should show: { "userId": X, "email": "...", "isOrganiser": ..., ... }
```

---

## Installation & Deployment

### Backend Dependencies
```bash
cd back-end
npm install express-rate-limit
npm install --save-dev @types/express-rate-limit  # Optional, for TypeScript types
```

### Environment Variables
```bash
# .env file
JWT_SECRET=your-production-secret-key
JWT_EXPIRES_HOURS=24
APP_PORT=3000

# CORS configuration (new)
ALLOWED_ORIGINS=https://yourfrontend.com,https://www.yourfrontend.com

# Rate limiting (hardcoded, edit in user.routes.ts if needed)
# Currently: 5 attempts per 15 minutes per IP
```

### Deployment Checklist
- [ ] Add `express-rate-limit` to production dependencies
- [ ] Set `ALLOWED_ORIGINS` environment variable
- [ ] Update password policy documentation for users
- [ ] Update API documentation to include `/users/logout` endpoint
- [ ] **IMPORTANT**: For multi-instance deployments, replace in-memory token blacklist with Redis
- [ ] Test rate limiting and logout in staging
- [ ] Update frontend to use new logout endpoint
- [ ] Monitor login rate limit hits for suspicious patterns

---

## Production Considerations

### Token Blacklist Scaling
Current implementation uses in-memory Set (suitable for single instance):
```typescript
const tokenBlacklist = new Set<string>();
```

**For production clusters**, implement Redis-based blacklist:
```typescript
// Use redis-cli to check/manage blacklist
redis-cli > GET "token:blacklist"
redis-cli > SADD "token:blacklist" "jwt_token_here"
```

### Performance Notes
- Rate limiting: ~1ms per request (checks IP in memory)
- Token blacklist: O(1) lookup per request
- Password validation: ~100ms per login (bcrypt hash computation)

### Monitoring
Track these metrics:
- Rate limit hits (brute force detection)
- Token blacklist growth (logout patterns)
- Password validation failures (weak password attempts)
- Login success/failure ratio (attack detection)

---

## Rollback Instructions
If needed to revert changes:
```bash
git revert e44b0b1  # Reverts all security improvements
```

---

## Questions or Issues?

Refer to:
- `SECURITY-IMPROVEMENTS.md` - Detailed implementation guide
- `ACCESS-CONTROL-ASSESSMENT.md` - Full security analysis
- Code comments in modified files
