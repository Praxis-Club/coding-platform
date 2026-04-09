# How to Run the Coding Platform

## Prerequisites
- Node.js 20+ installed
- Docker Desktop installed and running
- Git Bash or PowerShell

## Step 1: Start Database & Redis
```bash
docker-compose up -d
```
Wait 10 seconds for services to start.

## Step 2: Setup Backend
```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run seed
npm run dev
```

Backend will start at http://localhost:3000

## Step 3: Setup Frontend (New Terminal)
```bash
cd frontend
npm install
npm run dev
```

Frontend will start at http://localhost:5173

## Step 4: Login
Open http://localhost:5173 in browser

**Admin Login:**
- Email: admin@example.com
- Password: Admin123!

**Candidate Login:**
- Email: candidate@example.com
- Password: Candidate123!

## Troubleshooting

**Port 3000 already in use:**
```bash
npx kill-port 3000
```

**Port 5173 already in use:**
```bash
npx kill-port 5173
```

**Docker not starting:**
- Open Docker Desktop
- Wait for it to fully start
- Run `docker-compose up -d` again

**Database errors:**
```bash
cd backend
npx prisma migrate reset
npm run seed
```

**Module not found errors:**
```bash
# In backend folder
npm install

# In frontend folder
npm install
```

## Quick Test

After login, you can:
1. Admin: Create questions, create assessments, assign to users
2. Candidate: View assessments, solve problems, submit code

## Stop Everything
```bash
# Stop backend: Ctrl+C in backend terminal
# Stop frontend: Ctrl+C in frontend terminal
# Stop Docker:
docker-compose down
```
