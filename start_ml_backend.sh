#!/bin/bash
# ML Backend startup with Calibrated Confidence Scoring

echo "=================================================="
echo "🚀 Starting ML Backend with Calibrated Confidence"
echo "=================================================="
echo ""

PROJECT_ROOT="/media/sekar/3c35492e-e643-4f72-ad34-0465e2ee8b25/Final Year Project"

# Navigate to project
cd "$PROJECT_ROOT"

# Activate virtual environment
echo "1️⃣  Activating Python environment..."
source venv/bin/activate
echo "✅ Environment activated"
echo ""

# Check calibration module
echo "2️⃣  Verifying calibrated confidence module..."
if [ -f "python-ml/app/models/calibration.py" ]; then
    echo "✅ calibration.py found"
else
    echo "⚠️  calibration.py not found - using basic confidence scoring"
fi
echo ""

# Check for trained models
echo "3️⃣  Checking for trained models..."
MODEL_DIR="python-ml/app/models/saved_models"
if [ ! -d "$MODEL_DIR" ]; then
    echo "ℹ️  Creating models directory..."
    mkdir -p "$MODEL_DIR"
    echo "✅ Directory created"
else
    MODEL_COUNT=$(ls -1 "$MODEL_DIR"/*_model.pkl 2>/dev/null | wc -l)
    if [ $MODEL_COUNT -gt 0 ]; then
        echo "✅ Found $MODEL_COUNT trained model(s)"
    else
        echo "⚠️  No trained models found"
        echo "   Tip: Train models using /api/ml/retrain endpoint"
    fi
fi
echo ""

# Navigate to ML backend
cd python-ml

# Kill any existing processes on port 8000
echo "4️⃣  Cleaning up old processes..."
pkill -f "uvicorn.*8000" 2>/dev/null || true
sleep 2
echo "✅ Port 8000 cleared"
echo ""

# Start the FastAPI server
echo "5️⃣  Starting FastAPI server on port 8000..."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
FASTAPI_PID=$!
echo "📡 FastAPI started (PID: $FASTAPI_PID)"
echo ""

# Wait for server to start
sleep 5

# Test connection
echo "6️⃣  Testing backend connection..."
if curl -s "http://localhost:8000/api/health" > /dev/null; then
    echo "✅ ML Backend is running successfully!"
    echo ""
    echo "=================================================="
    echo "📊 API ENDPOINTS"
    echo "=================================================="
    echo "🔗 Base URL: http://localhost:8000"
    echo "📚 API Docs: http://localhost:8000/docs"
    echo "🏥 Health Check: http://localhost:8000/api/health"
    echo ""
    echo "🤖 ML ENDPOINTS:"
    echo "   POST /api/ml/predict - Get prediction with calibrated confidence"
    echo "   POST /api/ml/retrain - Train model on algorithm"
    echo "   GET /api/ml/algorithms - List available algorithms"
    echo "   GET /api/ml/model-info - Get current model information"
    echo ""
    echo "📋 CONFIDENCE SCORING:"
    echo "   ✅ Response includes:"
    echo "      - confidence_score (0-1, calibrated)"
    echo "      - confidence_level (Very High/High/Medium/Low)"
    echo "      - model_agreement (voting percentage)"
    echo "      - prediction_type (ensemble_voting/single_model)"
    echo ""
    echo "=================================================="
    echo "✅ Backend Ready!"
    echo "=================================================="
else
    echo "❌ ML Backend failed to start"
    echo "Check logs above for errors"
    exit 1
fi

# Keep script running
echo ""
echo "Press Ctrl+C to stop the backend"
wait $FASTAPI_PID