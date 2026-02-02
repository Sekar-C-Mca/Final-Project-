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
    check_directory "$PROJECT_ROOT/python-ai" "Python AI"
    check_directory "$PROJECT_ROOT/monitoring-agent" "Monitoring Agent"
    
    echo ""
    
    # Check Python virtual environment
    if [ -d "$PROJECT_ROOT/python-ai/venv" ]; then
        echo -e "${GREEN}✅ Python virtual environment found${NC}"
    else
        echo -e "${RED}❌ Python virtual environment not found${NC}"
        echo -e "${YELLOW}   Creating virtual environment...${NC}"
        cd "$PROJECT_ROOT/python-ai"
        python3 -m venv venv
        ./venv/bin/pip install -r requirements.txt
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
    
    # Check if using MongoDB Atlas (cloud) by looking at .env
    if grep -q "mongodb+srv" "$PROJECT_ROOT/backend/.env" 2>/dev/null; then
        echo -e "${GREEN}✅ Using MongoDB Atlas (Cloud)${NC}"
        echo -e "${CYAN}   Testing Atlas connection...${NC}"
        
        # Test connectivity to MongoDB Atlas
        if curl -s --connect-timeout 5 "https://cloud.mongodb.com" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Internet connection available for MongoDB Atlas${NC}"
        else
            echo -e "${YELLOW}⚠️  Cannot reach MongoDB Atlas. Check your internet connection.${NC}"
        fi
    else
        # Local MongoDB check
        if systemctl is-active --quiet mongod 2>/dev/null || pgrep mongod > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Local MongoDB is running${NC}"
        else
            echo -e "${YELLOW}⚠️  Local MongoDB not running. Attempting to start...${NC}"
            sudo systemctl start mongod 2>/dev/null || echo -e "${RED}❌ Failed to start MongoDB. Please start manually.${NC}"
        fi
    fi
    echo ""
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
    cd "$PROJECT_ROOT/python-ai"
    if [ -f "./venv/bin/python" ]; then
        ./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../logs/python-backend.log 2>&1 &
        PYTHON_PID=$!
        echo -e "${GREEN}   ✅ Python ML Backend started (PID: $PYTHON_PID)${NC}"
    else
        echo -e "${RED}   ❌ Failed to start Python ML Backend - venv not found${NC}"
        exit 1
    fi
    sleep 3
    
    # Start Express Backend
    echo -e "${BLUE}2. Starting Express Backend (Port 5000)...${NC}"
    cd "$PROJECT_ROOT/backend"
    if [ -f "package.json" ]; then
        npm run dev > ../logs/express-backend.log 2>&1 &
        EXPRESS_PID=$!
        echo -e "${GREEN}   ✅ Express Backend started (PID: $EXPRESS_PID)${NC}"
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
    
    # Setup signal handlers
    trap "echo -e '\n${YELLOW}🛑 Stopping all services...${NC}'; kill $PYTHON_PID $EXPRESS_PID $REACT_PID 2>/dev/null; echo -e '${GREEN}✅ All services stopped${NC}'; exit 0" INT TERM
    
    # Keep script running and wait for services
    echo -e "${CYAN}🔄 Monitoring services... (Press Ctrl+C to stop)${NC}"
    echo ""
    
    while true; do
        sleep 5
        
        # Check if all services are still running
        if ! kill -0 $PYTHON_PID 2>/dev/null; then
            echo -e "${RED}❌ Python ML Backend stopped unexpectedly${NC}"
            break
        fi
        
        if ! kill -0 $EXPRESS_PID 2>/dev/null; then
            echo -e "${RED}❌ Express Backend stopped unexpectedly${NC}"
            break
        fi
        
        if ! kill -0 $REACT_PID 2>/dev/null; then
            echo -e "${RED}❌ React Frontend stopped unexpectedly${NC}"
            break
        fi
    done
}

# Run the main function
main
