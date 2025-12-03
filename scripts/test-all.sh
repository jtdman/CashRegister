#!/bin/bash

# Test All Clients
# Runs all cash register clients against sample data

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
API_URL="${CASH_REGISTER_API:-http://localhost:3000}"
API_PID=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

cleanup() {
    if [ -n "$API_PID" ]; then
        print_info "Stopping API server (PID: $API_PID)"
        kill $API_PID 2>/dev/null || true
    fi
}

trap cleanup EXIT

cd "$PROJECT_ROOT"

print_header "Cash Register - Test All Clients"

# Check for sample data
if [ ! -f "data/sample-usd.txt" ]; then
    print_info "Generating sample data..."
    node tools/generate.js USD
    node tools/generate.js EUR
    print_success "Sample data generated"
fi

# Check if API is running
print_info "Checking API server..."
if curl -s "$API_URL/health" > /dev/null 2>&1; then
    print_success "API server already running at $API_URL"
else
    print_info "Starting API server..."
    cd api
    npm install --silent 2>/dev/null
    npm start > /dev/null 2>&1 &
    API_PID=$!
    cd "$PROJECT_ROOT"

    # Wait for API to be ready
    for i in {1..10}; do
        if curl -s "$API_URL/health" > /dev/null 2>&1; then
            print_success "API server started (PID: $API_PID)"
            break
        fi
        sleep 1
    done

    if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
        print_error "Failed to start API server"
        exit 1
    fi
fi

# Test Node client
print_header "1. Node Client"
print_info "Running: node clients/node/cli.js data/sample-usd.txt"
echo ""
if node clients/node/cli.js data/sample-usd.txt; then
    print_success "Node client completed"
else
    print_error "Node client failed"
fi

# Test Bash client
print_header "2. Bash Client"
print_info "Running: ./clients/bash/cash-register.sh data/sample-usd.txt"
echo ""
if ./clients/bash/cash-register.sh data/sample-usd.txt; then
    print_success "Bash client completed"
else
    print_error "Bash client failed"
fi

# Test Python client
print_header "3. Python Client"
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    print_error "Python not found, skipping Python client"
    PYTHON_CMD=""
fi

if [ -n "$PYTHON_CMD" ]; then
    # Check for requests module
    if $PYTHON_CMD -c "import requests" 2>/dev/null; then
        print_info "Running: $PYTHON_CMD clients/python/cash_register.py data/sample-usd.txt"
        echo ""
        if $PYTHON_CMD clients/python/cash_register.py data/sample-usd.txt; then
            print_success "Python client completed"
        else
            print_error "Python client failed"
        fi
    else
        print_error "Python 'requests' module not installed. Run: pip install requests"
    fi
fi

# Test .NET client
print_header "4. .NET Client"
if command -v dotnet &> /dev/null; then
    print_info "Building .NET client..."
    cd clients/dotnet
    if dotnet build --verbosity quiet 2>/dev/null; then
        print_info "Running: dotnet run -- ../../data/sample-usd.txt"
        echo ""
        if dotnet run -- ../../data/sample-usd.txt; then
            print_success ".NET client completed"
        else
            print_error ".NET client failed"
        fi
    else
        print_error ".NET build failed"
    fi
    cd "$PROJECT_ROOT"
else
    print_error ".NET SDK not found, skipping .NET client"
fi

# Summary
print_header "Test Complete"
echo ""
echo "Output files written to:"
echo "  - output/clients/node/sample-usd-output.txt"
echo "  - output/clients/bash/sample-usd-output.txt"
echo "  - output/clients/python/sample-usd-output.txt"
echo "  - output/clients/dotnet/sample-usd-output.txt"
echo ""

if [ -n "$API_PID" ]; then
    print_info "API server will be stopped on exit"
fi
