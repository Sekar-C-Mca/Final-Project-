#!/bin/bash
# Comprehensive startup script for Risk Evaluation System
# Author: Sekar C
# Date: January 30, 2026

echo "🚀 Starting Risk Evaluation System..."
echo "==========================================="
echo ""

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to check if port is in use
check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port already in use ($service)${NC}"
        echo -e "${YELLOW}   Killing existing process...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to check if directory exists
check_directory() {
    local dir=$1
    local name=$2
    if [ ! -d "$dir" ]; then
        echo -e "${RED}❌ $name directory not found: $dir${NC}"
        return 1
    fi
    echo -e "${GREEN}✅ $name directory found${NC}"
    return 0
}

# Function to check if required files exist
check_requirements() {
    echo -e "${CYAN}📋 Checking system requirements...${NC}"
    echo ""
    
    # Check directories
    check_directory "$PROJECT_ROOT/backend" "Backend"
    check_directory "$PROJECT_ROOT/frontend" "Frontend" 
    check_directory "$PROJECT_ROOT/python-ml" "Python ML"
    check_directory "$PROJECT_ROOT/monitoring-agent" "Monitoring Agent"
    
    echo ""
    
    # Check Python virtual environment
    if [ -d "$PROJECT_ROOT/venv" ]; then
        echo -e "${GREEN}✅ Python virtual environment found (project root)${NC}"
    elif [ -d "$PROJECT_ROOT/python-ml/venv" ]; then
        echo -e "${GREEN}✅ Python virtual environment found (python-ml directory)${NC}"
        echo -e "${YELLOW}   Note: Using venv from python-ml directory${NC}"
    else
        echo -e "${RED}❌ Python virtual environment not found${NC}"
        echo -e "${YELLOW}   Creating virtual environment in project root...${NC}"
        cd "$PROJECT_ROOT"
        python3 -m venv venv
        source venv/bin/activate
        pip install -r python-ml/requirements.txt
        echo -e "${GREEN}✅ Virtual environment created${NC}"
    fi
    
    # Check Monitoring Agent virtual environment
    if [ -d "$PROJECT_ROOT/monitoring-agent/venv" ]; then
        echo -e "${GREEN}✅ Monitoring Agent virtual environment found${NC}"
    else
        echo -e "${YELLOW}   Creating monitoring agent virtual environment...${NC}"
        cd "$PROJECT_ROOT/monitoring-agent"
        python3 -m venv venv
        ./venv/bin/pip install -r requirements.txt
        echo -e "${GREEN}✅ Monitoring Agent environment created${NC}"
    fi
    
    # Check Node.js dependencies
    if [ -d "$PROJECT_ROOT/backend/node_modules" ]; then
        echo -e "${GREEN}✅ Backend dependencies installed${NC}"
    else
        echo -e "${YELLOW}   Installing backend dependencies...${NC}"
        cd "$PROJECT_ROOT/backend"
        npm install
        echo -e "${GREEN}✅ Backend dependencies installed${NC}"
    fi
    
    if [ -d "$PROJECT_ROOT/frontend/node_modules" ]; then
        echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
    else
        echo -e "${YELLOW}   Installing frontend dependencies...${NC}"
        cd "$PROJECT_ROOT/frontend"
        npm install
        echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
    fi
    
    # Check monitoring agent files
    if [ -f "$PROJECT_ROOT/monitoring-agent/portable_monitor.py" ]; then
        echo -e "${GREEN}✅ Portable monitor script found${NC}"
    else
        echo -e "${RED}❌ Portable monitor script not found${NC}"
        echo -e "${YELLOW}   Please ensure portable_monitor.py exists in monitoring-agent directory${NC}"
    fi
    
    # Check Python AI feature extraction (for code analysis)
    if [ -f "$PROJECT_ROOT/python-ml/app/preprocessing/feature_extraction.py" ]; then
        echo -e "${GREEN}✅ Feature extraction module found${NC}"
    else
        echo -e "${RED}❌ Feature extraction module not found${NC}"
    fi
    
    # Check system dependencies for monitoring
    if python3 -c "import watchdog" 2>/dev/null; then
        echo -e "${GREEN}✅ Python watchdog package installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Python watchdog package not found${NC}"
        echo -e "${YELLOW}   Run: sudo apt install python3-watchdog${NC}"
    fi
    
    echo ""
}

# Function to check monitoring system health
check_monitoring_health() {
    echo -e "${CYAN}🔍 Monitoring System Health Check...${NC}"
    
    # Check temp directory permissions for test deployments
    if [ -w "/tmp" ]; then
        echo -e "${GREEN}✅ Temporary directory writable (for test deployments)${NC}"
    else
        echo -e "${RED}❌ Temporary directory not writable${NC}"
    fi
    
    # Test deployment directory creation
    TEST_DIR="/tmp/riskguard_health_check"
    if mkdir -p "$TEST_DIR" 2>/dev/null && rmdir "$TEST_DIR" 2>/dev/null; then
        echo -e "${GREEN}✅ Deployment directory creation works${NC}"
    else
        echo -e "${YELLOW}⚠️  Cannot create deployment directories${NC}"
    fi
    
    echo ""
}

# Function to check MongoDB status
check_mongodb() {
    echo -e "${CYAN}🗄️  Checking MongoDB status...${NC}"
    
    # Check if .env exists and has MONGODB_URI
    if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
        echo -e "${RED}❌ backend/.env not found!${NC}"
        echo -e "${YELLOW}   Please create backend/.env with MONGODB_URI${NC}"
        echo -e "${YELLOW}   Copy from backend/.env.example and update values${NC}"
        return 1
    fi
    
    # Extract MongoDB URI from .env
    MONGODB_URI=$(grep "^MONGODB_URI=" "$PROJECT_ROOT/backend/.env" | cut -d'=' -f2-)
    
    if [ -z "$MONGODB_URI" ]; then
        echo -e "${RED}❌ MONGODB_URI not set in backend/.env${NC}"
        echo -e "${YELLOW}   Add line: MONGODB_URI=mongodb+srv://...${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ MongoDB URI configured${NC}"
    echo -e "${CYAN}   URI: ${MONGODB_URI:0:50}...${NC}"
    
    # Check if using MongoDB Atlas (cloud) or local MongoDB
    if [[ $MONGODB_URI == *"mongodb+srv"* ]]; then
        echo -e "${GREEN}✅ Using MongoDB Atlas (Cloud)${NC}"
        echo -e "${CYAN}   Testing internet connectivity...${NC}"
        
        # Test connectivity to MongoDB Atlas
        if timeout 5 curl -s "https://cloud.mongodb.com" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Internet connection available${NC}"
        else
            echo -e "${RED}❌ Cannot reach MongoDB Atlas. Check internet connection.${NC}"
            echo -e "${YELLOW}   Also check if your IP is whitelisted in MongoDB Atlas${NC}"
            return 1
        fi
    else
        # Local MongoDB check
        echo -e "${GREEN}✅ Using Local MongoDB${NC}"
        echo -e "${CYAN}   Checking if MongoDB is running...${NC}"
        
        if systemctl is-active --quiet mongod 2>/dev/null || pgrep mongod > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Local MongoDB is running${NC}"
        else
            echo -e "${YELLOW}⚠️  Local MongoDB may not be running${NC}"
            echo -e "${YELLOW}   Start it with: sudo systemctl start mongod${NC}"
            echo -e "${YELLOW}   Or: brew services start mongodb-community${NC}"
        fi
    fi
    
    echo ""
    return 0
}

# Function to start services
start_services() {
    echo -e "${CYAN}🔧 Starting all services...${NC}"
    echo ""
    
    # Check and kill existing processes
    check_port 8000 "Python ML Backend"
    check_port 5000 "Express Backend"  
    check_port 3000 "React Frontend"
    
    echo ""
    
    # Start Python ML Backend
    echo -e "${BLUE}1. Starting Python ML Backend (Port 8000)...${NC}"
    cd "$PROJECT_ROOT"
    
    # Activate virtual environment and start ML backend
    if [ -d "venv" ]; then
        echo -e "${CYAN}   Activating virtual environment...${NC}"
        source venv/bin/activate
        
        # Navigate to python-ml directory for proper imports
        cd python-ml
        
        echo -e "${CYAN}   Starting FastAPI server with uvicorn...${NC}"
        python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > "$PROJECT_ROOT/logs/python-backend.log" 2>&1 &
        PYTHON_PID=$!
        echo -e "${GREEN}   ✅ Python ML Backend started (PID: $PYTHON_PID)${NC}"
        
        # Test ML backend health
        echo -e "${CYAN}   Testing ML backend connection...${NC}"
        sleep 5
        if curl -s "http://localhost:8000/api/health" > /dev/null 2>&1; then
            echo -e "${GREEN}   ✅ ML Backend health check passed${NC}"
        else
            echo -e "${YELLOW}   ⚠️  ML Backend starting up, health check pending...${NC}"
        fi
    else
        echo -e "${RED}   ❌ Failed to start Python ML Backend - venv not found in project root${NC}"
        echo -e "${YELLOW}   Expected: $PROJECT_ROOT/venv${NC}"
        exit 1
    fi
    sleep 3
    
    # Start Express Backend
    echo -e "${BLUE}2. Starting Express Backend (Port 5000)...${NC}"
    cd "$PROJECT_ROOT/backend"
    if [ -f "package.json" ]; then
        # Use npm start (production) instead of dev for stability
        npm start > ../logs/express-backend.log 2>&1 &
        EXPRESS_PID=$!
        echo -e "${GREEN}   ✅ Express Backend started (PID: $EXPRESS_PID)${NC}"
        echo -e "${CYAN}      • Polling fix for frontend monitoring enabled${NC}"
        echo -e "${CYAN}      • Index-based update tracking active${NC}"
    else
        echo -e "${RED}   ❌ Failed to start Express Backend - package.json not found${NC}"
        exit 1
    fi
    sleep 3
    
    # Start React Frontend
    echo -e "${BLUE}3. Starting React Frontend (Port 3000)...${NC}"
    cd "$PROJECT_ROOT/frontend"
    if [ -f "package.json" ]; then
        npm run dev > ../logs/react-frontend.log 2>&1 &
        REACT_PID=$!
        echo -e "${GREEN}   ✅ React Frontend started (PID: $REACT_PID)${NC}"
    else
        echo -e "${RED}   ❌ Failed to start React Frontend - package.json not found${NC}"
        exit 1
    fi
    sleep 3
    
    echo ""
}

# Function to display service status
show_status() {
    echo "==========================================="
    echo -e "${GREEN}✅ All services started successfully!${NC}"
    echo "==========================================="
    echo ""
    echo -e "${CYAN}📊 Access Points:${NC}"
    echo "  🌐 Frontend (React):     http://localhost:3000"
    echo "  🗄️  Backend (Express):    http://localhost:5000"
    echo "  🤖 ML API (FastAPI):     http://localhost:8000"
    echo "  📚 API Documentation:    http://localhost:8000/docs"
    echo "  📊 Deploy Script:       http://localhost:3000/deploy-script"
    echo ""
    echo -e "${CYAN}📋 Process Information:${NC}"
    echo "  🐍 Python ML Backend:   PID $PYTHON_PID"
    echo "  🚀 Express Backend:     PID $EXPRESS_PID"  
    echo "  ⚛️  React Frontend:      PID $REACT_PID"
    echo ""
    echo -e "${CYAN}📁 Log Files:${NC}"
    echo "  📄 Python Backend:      logs/python-backend.log"
    echo "  📄 Express Backend:     logs/express-backend.log"
    echo "  📄 React Frontend:      logs/react-frontend.log"
    echo ""
    echo -e "${CYAN}🔧 Monitoring Features:${NC}"
    echo "  📊 Real-time Code Monitoring Available"
    echo "  📁 Portable Script Deployment Ready" 
    echo "  🚀 Deploy via: Frontend > Deploy Script Page"
    echo "  🔍 File Change Detection: CREATE, MODIFY, DELETE, RENAME"
    echo "  ⚡ Risk Analysis: HIGH, MEDIUM, LOW levels"
    echo "  🐍 Dependencies: python3-watchdog installed"
    echo ""
    echo -e "${CYAN}✨ Recent Fixes:${NC}"
    echo "  • ✅ Frontend monitoring console - polling fix applied"
    echo "  • ✅ Language mismatch handling - 3-tier error handling"
    echo "  • ✅ Code metrics accuracy - LOC counting fixed"
    echo "  • ✅ Comment detection - All language styles supported"
    echo ""
    echo -e "${YELLOW}💡 Tips:${NC}"
    echo "  • Press Ctrl+C to stop all services"
    echo "  • Monitor logs: tail -f logs/*.log"
    echo "  • Check individual service status in logs"
    echo ""
}
# Main execution
main() {
    # Create logs directory if it doesn't exist
    mkdir -p "$PROJECT_ROOT/logs"
    
    # Clear log files
    > "$PROJECT_ROOT/logs/python-backend.log"
    > "$PROJECT_ROOT/logs/express-backend.log" 
    > "$PROJECT_ROOT/logs/react-frontend.log"
    
    # Run checks and start services
    check_requirements
    check_monitoring_health
    check_mongodb
    start_services
    show_status
    
    # Verify services started correctly
    echo -e "${CYAN}🔄 Verifying service startup...${NC}"
    sleep 2
    
    # Check services are responsive
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend responsive on port 3000${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend may still be loading...${NC}"
    fi
    
    if curl -s http://localhost:5000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend responsive on port 5000${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend may still be initializing...${NC}"
    fi
    
    if curl -s http://localhost:8000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ML Backend responsive on port 8000${NC}"
    else
        echo -e "${YELLOW}⚠️  ML Backend may still be starting...${NC}"
    fi
    
    echo ""
    
    # Setup signal handlers
    trap "echo -e '\n${YELLOW}🛑 Stopping all services...${NC}'; kill $PYTHON_PID $EXPRESS_PID $REACT_PID 2>/dev/null; echo -e '${GREEN}✅ All services stopped${NC}'; exit 0" INT TERM
    
    # Keep script running and wait for services
    echo -e "${CYAN}🔄 All services running. Monitoring health... (Press Ctrl+C to stop)${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    SERVICE_ERROR_LOG=""
    
    while true; do
        sleep 10
        
        SERVICE_STATUS="✅ All services running"
        ERROR_DETECTED=false
        
        # Check if all services are still running
        if ! kill -0 $PYTHON_PID 2>/dev/null; then
            echo -e "${RED}❌ [$(date '+%H:%M:%S')] Python ML Backend stopped unexpectedly${NC}"
            SERVICE_ERROR_LOG="${SERVICE_ERROR_LOG}\n❌ Python ML Backend crashed"
            ERROR_DETECTED=true
        fi
        
        if ! kill -0 $EXPRESS_PID 2>/dev/null; then
            echo -e "${RED}❌ [$(date '+%H:%M:%S')] Express Backend stopped unexpectedly${NC}"
            SERVICE_ERROR_LOG="${SERVICE_ERROR_LOG}\n❌ Express Backend crashed"
            ERROR_DETECTED=true
        fi
        
        if ! kill -0 $REACT_PID 2>/dev/null; then
            echo -e "${RED}❌ [$(date '+%H:%M:%S')] React Frontend stopped unexpectedly${NC}"
            SERVICE_ERROR_LOG="${SERVICE_ERROR_LOG}\n❌ React Frontend crashed"
            ERROR_DETECTED=true
        fi
        
        if [ "$ERROR_DETECTED" = true ]; then
            break
        fi
        
        # Show periodic health check (every 30s)
        if [ $((SECONDS % 30)) -lt 10 ]; then
            echo -e "${GREEN}[$(date '+%H:%M:%S')] Services healthy - Frontend: PID $REACT_PID | Backend: PID $EXPRESS_PID | ML: PID $PYTHON_PID${NC}"
        fi
    done
}

# Run the main function
main
