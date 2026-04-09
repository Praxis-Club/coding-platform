# Coding Assessment Platform

Production-grade coding platform similar to HackerRank/HackerEarth.

## Stack

**Backend:** Node.js, Express, TypeScript, PostgreSQL, Prisma, Redis, JWT
**Frontend:** React, TypeScript, Vite, TailwindCSS, Monaco Editor
**Execution:** Docker containers for isolated code execution

## Quick Start

```bash
# Start infrastructure
docker-compose up -d

# Backend setup
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma generate
npm run seed
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

Backend: http://localhost:3000
Frontend: http://localhost:5173

## Default Credentials

Admin: admin@example.com / Admin123!
Candidate: candidate@example.com / Candidate123!

## Features

✅ Authentication & authorization
✅ Question management (CRUD)
✅ Assessment creation & assignment
✅ Code execution (Python, JavaScript, Java, C++)
✅ Test case evaluation
✅ Admin & candidate dashboards
✅ Monaco code editor
✅ Real-time code execution

## Project Structure

```
backend/src/
├── config/          # DB, Redis, env
├── middleware/      # Auth, validation, errors
├── modules/         # Auth, questions, assessments, submissions, executor
└── utils/           # JWT, logger

frontend/src/
├── components/      # Reusable UI
├── pages/           # Routes
├── context/         # Auth state
└── services/        # API calls
```
