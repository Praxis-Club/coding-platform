@echo off
echo Starting Coding Platform Setup...
echo.

echo [1/4] Starting Docker services...
docker-compose up -d
timeout /t 5 /nobreak > nul

echo.
echo [2/4] Setting up backend...
cd backend
call npm install
copy .env.example .env
call npx prisma migrate dev --name init
call npx prisma generate
call npm run seed

echo.
echo [3/4] Setting up frontend...
cd ..\frontend
call npm install

echo.
echo [4/4] Setup complete!
echo.
echo To start the application:
echo   Backend:  cd backend  && npm run dev
echo   Frontend: cd frontend && npm run dev
echo.
echo Default credentials:
echo   Admin:     admin@example.com / Admin123!
echo   Candidate: candidate@example.com / Candidate123!
echo.
pause
