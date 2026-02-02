#!/bin/bash

# Project-specific monitoring script
PROJECT_NAME="frontend_app"
PROJECT_PATH="/media/sekar/3c35492e-e643-4f72-ad34-0465e2ee8b25/Final Year Project/frontend"
AGENT_DIR="/media/sekar/3c35492e-e643-4f72-ad34-0465e2ee8b25/Final Year Project/monitoring-agent"

echo "🚀 Starting Risk Monitoring for $PROJECT_NAME"
echo "============================================="

# Check if ML backend is running
echo "🔍 Checking ML backend..."
if curl -s http://localhost:8000/ >/dev/null 2>&1; then
    echo "✅ ML backend is running"
else
    echo "⚠️  ML backend not detected"
    echo "   Start it with: cd /media/sekar/3c35492e-e643-4f72-ad34-0465e2ee8b25/Final Year Project/python-ai && source venv/bin/activate && python -m app.main"
    echo ""
    read -p "Continue monitoring anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Monitoring cancelled"
        exit 1
    fi
fi

# Load environment
if [ -f "$AGENT_DIR/.env_$PROJECT_NAME" ]; then
    export $(cat "$AGENT_DIR/.env_$PROJECT_NAME" | grep -v '^#' | xargs)
fi

# Activate virtual environment
if [ -d "$AGENT_DIR/venv" ]; then
    source "$AGENT_DIR/venv/bin/activate"
    echo "✅ Virtual environment activated"
fi

# Start monitoring
echo ""
echo "👁️  Starting monitoring..."
echo "   Project: $PROJECT_PATH"
echo "   Config: $AGENT_DIR/config_$PROJECT_NAME.json"
echo ""

cd "$AGENT_DIR"
python3 monitor.py "$PROJECT_PATH" "$PROJECT_NAME"
