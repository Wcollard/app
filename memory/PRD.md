# PRD — Shared Deadline List (web)

## Original problem statement
"make the following into a web app" — a Python Tkinter + SQLite "Shared color-coded deadline list": click a hyperlink to open it; right-click a deadline to set its color (green = OK, blue = not urgent, yellow = near term important, red = urgent non-extendable); columns Task, Assignee, Matter No, Deadline (with today / in N days / N days overdue), Urgency, Hyperlink, Updated; sortable columns; task search, Matter No filter, urgency filter, clear filters; New/Edit/Delete; double-click to edit; reloads every 5 s / F5; help; backup database. Shared by pointing everyone at the same .db file.

## User choices
- Email + password login (admin creates accounts, no public sign-up)
- Backup = download a file and restore from it
- "Updated by" name comes from the logged-in account

## Architecture
- FastAPI + MongoDB (`users`, `todos`, `login_attempts`), JWT httpOnly cookies (15 min access + 7 day refresh), bcrypt, origin guard, lockout after 5 failed logins per email
- React (CRA + shadcn), dark "docket" theme; polling every 5 s

## Personas
- Admin (wcollard@yahoo.com): manages team accounts, restores backups
- Team member: views/edits the shared list

## Implemented (2026-11-11)
- Login/logout, session refresh, admin seeding
- Task CRUD with original validation (title required, YYYY-MM-DD, safe URL normalization)
- Right-click menu: set urgency, edit, duplicate, copy Matter No, delete; double-click edit
- Search/Matter/urgency filters, stat cards, sortable columns, live sync indicator, F5
- JSON backup download (all users); restore with confirm (admin only)
- Team management (add, reset password, remove)
- Help dialog

## Backlog
- P1: Long-press / row action button for the context menu on touch devices
- P1: Users change their own password
- P2: Import from an existing todos.db SQLite file
- P2: Email reminders for red/overdue items
