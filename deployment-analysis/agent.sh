#!/bin/bash

# Risk Monitoring Agent Wrapper Script
# Provides easy commands for common monitoring tasks

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
MONITOR_SCRIPT="$SCRIPT_DIR/monitor.py"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_help() {
    echo "🔍 Risk Monitoring Agent - Quick Commands"
    echo "========================================"
    echo ""
    echo "Usage: ./agent.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start [dir] [project_id]  - Start monitoring (default: current dir)"
    echo "  test                      - Run test suite"
    echo "  install                   - Install dependencies"
    echo "  config                    - Show current configuration"
    echo "  help                      - Show this help"
    echo ""
    echo "Examples:"
    echo "  ./agent.sh start                    # Monitor current directory"
    echo "  ./agent.sh start /path/to/project   # Monitor specific directory"
    echo "  ./agent.sh start . my_project       # Monitor with custom project ID"
    echo ""
    echo "Environment Variables:"
    echo "  PROJECT_ID                - Override project identifier"
    echo "  API_URL                   - Override ML backend URL"
}

start_monitoring() {
    local watch_dir="${1:-.}"
    local project_id="$2"
    
    echo -e "${BLUE}🚀 Starting Risk Monitoring Agent${NC}"
    echo "===================================="
    
    # Check if ML backend is running
    echo -e "${YELLOW}🔍 Checking ML backend...${NC}"
    if curl -s http://localhost:8000/ >/dev/null 2>&1; then
        echo -e "${GREEN}✓ ML backend is running${NC}"
    else
        echo -e "${RED}❌ ML backend not responding${NC}"
        echo "   Start it with: cd ../python-ai && python -m app.main"
        echo ""
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Activate virtual environment if it exists
    if [ -d "$SCRIPT_DIR/venv" ]; then
        source "$SCRIPT_DIR/venv/bin/activate"
        echo -e "${GREEN}✓ Activated virtual environment${NC}"
    fi
    
    # Build command
    local cmd="python3 $MONITOR_SCRIPT $watch_dir"
    if [ -n "$project_id" ]; then
        cmd="$cmd $project_id"
    fi
    
    echo -e "${BLUE}📁 Monitoring: $(realpath $watch_dir)${NC}"
    echo "Press Ctrl+C to stop monitoring"
    echo ""
    
    # Execute monitoring
    exec $cmd
}

run_tests() {
    echo -e "${BLUE}🧪 Running Agent Test Suite${NC}"
    echo "=========================="
    
    # Activate virtual environment if it exists
    if [ -d "$SCRIPT_DIR/venv" ]; then
        source "$SCRIPT_DIR/venv/bin/activate"
    fi
    
    python3 "$SCRIPT_DIR/test_agent.py"
}

install_agent() {
    echo -e "${BLUE}📦 Installing Risk Monitoring Agent${NC}"
    echo "===================================="
    
    if [ -f "$SCRIPT_DIR/install.sh" ]; then
        chmod +x "$SCRIPT_DIR/install.sh"
        "$SCRIPT_DIR/install.sh"
    else
        echo -e "${RED}❌ install.sh not found${NC}"
        exit 1
    fi
}

show_config() {
    echo -e "${BLUE}⚙️  Current Configuration${NC}"
    echo "========================"
    
    local config_file="$SCRIPT_DIR/config.json"
    local env_file="$SCRIPT_DIR/.env"
    
    if [ -f "$config_file" ]; then
        echo -e "${GREEN}📋 config.json:${NC}"
        cat "$config_file" | python3 -m json.tool
    else
        echo -e "${YELLOW}⚠️  config.json not found${NC}"
    fi
    
    echo ""
    
    if [ -f "$env_file" ]; then
        echo -e "${GREEN}🔧 .env file:${NC}"
        cat "$env_file"
    else
        echo -e "${YELLOW}⚠️  .env file not found${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}🌍 Environment Variables:${NC}"
    echo "API_URL: ${API_URL:-not set}"
    echo "PROJECT_ID: ${PROJECT_ID:-not set}"
    echo "DEBUG: ${DEBUG:-not set}"
}

# Main command handling
case "${1:-help}" in
    "start")
        start_monitoring "$2" "$3"
        ;;
    "test")
        run_tests
        ;;
    "install")
        install_agent
        ;;
    "config")
        show_config
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac