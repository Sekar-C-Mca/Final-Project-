#!/bin/bash
# Simple script to start the ML backend

echo "🚀 Starting ML Backend..."

# Navigate to project
cd "/media/sekar/3c35492e-e643-4f72-ad34-0465e2ee8b25/Final Year Project"

# Activate virtual environment
source venv/bin/activate

# Navigate to ML backend
cd python-ml

# Kill any existing processes on port 8000
pkill -f "uvicorn.*8000" 2>/dev/null || true
sleep 2

# Start the FastAPI server
echo "📡 Starting FastAPI server on port 8000..."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# Wait for server to start
sleep 5

# Test connection
echo "🧪 Testing backend connection..."
if curl -s "http://localhost:8000/api/health" > /dev/null; then
    echo "✅ ML Backend is running successfully!"
    echo "📍 Available at: http://localhost:8000"
    echo "📊 API Docs: http://localhost:8000/docs"
else
    echo "❌ ML Backend failed to start"
    exit 1
fi

echo "🎯 Backend is ready for frontend connections!"