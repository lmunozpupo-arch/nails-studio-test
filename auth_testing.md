# Auth-Gated App Testing Playbook

SalonApp uses TWO auth mechanisms:
1. JWT custom auth: POST /api/auth/login {email, password} -> {token, user}. Header: `Authorization: Bearer <token>`.
2. Emergent Google Auth: session_token httpOnly cookie. Backend: POST /api/auth/session {session_id} exchanges with Emergent, sets cookie. GET /api/auth/me works with cookie OR Bearer token.

## Step 1: JWT login (preferred for testing)
```
curl -X POST "$API/api/auth/login" -H "Content-Type: application/json" -d '{"email":"lmunozpupo@gmail.com","password":"NaislAdmin2024!"}'
```
Use returned token as `Authorization: Bearer <token>` for all endpoints.

## Step 2: Google session test (optional)
```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({ user_id: userId, email: 'test.user.' + Date.now() + '@example.com', name: 'Test User', picture: '', role: 'admin', auth_provider: 'google', created_at: new Date().toISOString() });
db.user_sessions.insertOne({ user_id: userId, session_token: sessionToken, expires_at: new Date(Date.now() + 7*24*60*60*1000), created_at: new Date().toISOString() });
print('Session token: ' + sessionToken);
"
```
Then: curl -X GET "$API/api/auth/me" -H "Authorization: Bearer <sessionToken>"

Browser: set cookie `session_token` (httpOnly, secure, sameSite=None) on the app domain, then load app.

## Checklist
- Users have custom `user_id` (uuid), queries use {"_id": 0} projection
- Session user_id matches user.user_id
- /api/auth/me returns user data with both JWT and cookie auth
- Dashboard loads without redirect
