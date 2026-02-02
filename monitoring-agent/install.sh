#!/bin/bash

echo "� Risk Monitoring Agent Installation"
echo "===================================="

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not found"
    echo "   Please install Python 3.8+ first"
    exit 1
fi

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $python_version"

# Check pip3
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is required but not found"
    echo "   Please install pip3 first"
    exit 1
fi

# Create virtual environment (optional but recommended)
if [ ! -d "venv" ]; then
    echo "🔨 Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📦 Installing dependencies..."
if pip install -r requirements.txt; then
    echo "✓ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Make scripts executable
chmod +x monitor.py

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating environment configuration..."
    cat > .env << EOF
# ML Backend Configuration
API_URL=http://localhost:8000/api
PROJECT_ID=my_project

# Optional: Override default settings
# CORS_ORIGINS=http://localhost:3000
# DEBUG=true
EOF
    echo "✓ Created .env file with default settings"
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "📘 Quick Start:"
echo "   1. Activate virtual environment:"
echo "      source venv/bin/activate"
echo ""
echo "   2. Start ML backend (in another terminal):"
echo "      cd ../python-ai && python -m app.main"
echo ""
echo "   3. Run monitoring agent:"
echo "      python3 monitor.py [watch_directory] [project_id]"
echo ""
echo "📋 Examples:"
echo "   # Monitor current directory"
echo "   python3 monitor.py . my_project"
echo ""
echo "   # Monitor specific project"
echo "   python3 monitor.py /path/to/project my_project"
echo ""
echo "   # Use environment variables"
echo "   PROJECT_ID=my_project python3 monitor.py /path/to/project"
echo ""
echo "💡 Tips:"
echo "   - Edit config.json to customize watch patterns"
echo "   - Edit .env to change ML backend URL"
echo "   - Use Ctrl+C to stop monitoring"
echo ""
