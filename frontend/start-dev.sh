#!/bin/bash
# ─────────────────────────────────────────────────────────
# Shetkari Krushi Bhandar — Development Startup Script
# ─────────────────────────────────────────────────────────
# Usage: chmod +x start-dev.sh && ./start-dev.sh

set -e

echo ""
echo "🌿  Shetkari Krushi Bhandar — Starting Dev Environment"
echo "────────────────────────────────────────────────────────"

# Backend
echo ""
echo "▶ Starting Backend (FastAPI on :8000)..."
cd backend
if [ ! -d "venv" ]; then
  echo "  Creating virtualenv..."
  python3 -m venv venv
fi
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null || true
pip install -r requirements.txt -q
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Frontend
echo ""
echo "▶ Starting Frontend (Vite on :3000)..."
cd frontend
npm install --silent
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "────────────────────────────────────────────────────────"
echo "✅  Backend:  http://localhost:8000"
echo "✅  Frontend: http://localhost:3000"
echo "📖  API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."
echo "────────────────────────────────────────────────────────"

# Wait for both
wait $BACKEND_PID $FRONTEND_PID
