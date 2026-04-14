---
description: Run the full project (Django backend + Next.js frontend)
---

# Run the Full Project

## Prerequisites
- PostgreSQL must be running on localhost:5432
- Database `refurbai_db` must exist (credentials in `backend/.env`)

## Steps

// turbo-all

1. Start the Django backend server:
```
d:\korda_app\G-P-PROJECT\backend\venv\Scripts\python.exe d:\korda_app\G-P-PROJECT\backend\manage.py runserver 8000
```
Run this as a background command (WaitMsBeforeAsync=3000).

2. Start the Next.js frontend dev server:
```
npm run dev
```
Run this from `d:\korda_app\G-P-PROJECT` as a background command (WaitMsBeforeAsync=5000).

3. Both servers should now be running:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://127.0.0.1:8000/api/
