# Auth testing
- Admin: wcollard@yahoo.com / Deadlines2026! (see /app/memory/test_credentials.md)
- Cookies: access_token (15 min), refresh_token (7 days), httpOnly, Secure, SameSite=None
- Mutating requests with a foreign Origin header get 403.
- Steps: POST /api/auth/login -> cookies set; GET /api/auth/me returns user; POST /api/auth/refresh issues new access cookie.
- 5 failed logins for same ip+email -> 429 for 15 minutes.
- No public registration; admin creates users via POST /api/users.
