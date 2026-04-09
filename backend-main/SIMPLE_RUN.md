# Simple Run (Without Docker)

## Option 1: Use Online Database (Easiest)

### Step 1: Get Free PostgreSQL Database
1. Go to https://neon.tech or https://supabase.com
2. Create free account
3. Create a new database
4. Copy the connection string (looks like: postgresql://user:pass@host/db)

### Step 2: Update Backend .env
Open `backend/.env` and replace DATABASE_URL with your connection string:
```
DATABASE_URL="your-connection-string-here"
REDIS_URL="redis://localhost:6379"
```

### Step 3: Run Backend
```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
npm run seed
npm run dev
```

### Step 4: Run Frontend (New Terminal)
```bash
cd frontend
npm install
npm run dev
```

### Step 5: Open Browser
Go to http://localhost:5173
Login: admin@example.com / Admin123!

---

## Option 2: Install PostgreSQL Locally

### Step 1: Install PostgreSQL
Download from: https://www.postgresql.org/download/windows/
- During install, set password as "password"
- Port: 5432

### Step 2: Update .env (if needed)
File is already configured for local PostgreSQL

### Step 3: Run Backend
```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
npm run seed
npm run dev
```

### Step 4: Run Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Quick Test Without Database

If you just want to test the frontend:

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173
(Backend features won't work without database)
