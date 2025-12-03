#!/bin/bash

# Cash Register - Bash Client
# Processes transaction files using the REST API

set -e

# Default settings
API_URL="${CASH_REGISTER_API:-http://localhost:3000}"
OUTPUT_DIR="../../output/clients/bash"

# Colors for output (disabled if not a terminal)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    NC=''
fi

usage() {
    cat << EOF
Cash Register - Bash Client

Usage: $(basename "$0") <input-file> [options]

Arguments:
  input-file          Path to input file with transactions

Options:
  --divisor <n>       Override random divisor (default: 3)
  --no-pennies        Disable pennies, use Swedish rounding
  --half-dollars      Enable half dollar coins
  -o, --output <path> Custom output file path
  --api <url>         API server URL (default: http://localhost:3000)
  -h, --help          Show this help message

Environment:
  CASH_REGISTER_API   API server URL (overridden by --api)

Examples:
  $(basename "$0") ../../data/sample-usd.txt
  $(basename "$0") ../../data/sample-usd.txt --divisor 5
  $(basename "$0") ../../data/sample-usd.txt --no-pennies
  $(basename "$0") ../../data/sample-usd.txt --api http://localhost:8080
EOF
    exit 0
}

error() {
    echo -e "${RED}Error: $1${NC}" >&2
    exit 1
}

warn() {
    echo -e "${YELLOW}Warning: $1${NC}" >&2
}

# Check if API is available
check_api() {
    local health
    health=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health" 2>/dev/null) || true

    if [ "$health" != "200" ]; then
        error "API server not available at ${API_URL}. Start it with: cd api && npm start"
    fi
}

# Parse arguments
INPUT_FILE=""
OUTPUT_PATH=""
DIVISOR=""
NO_PENNIES=""
HALF_DOLLARS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        --divisor)
            DIVISOR="$2"
            shift 2
            ;;
        --no-pennies)
            NO_PENNIES="true"
            shift
            ;;
        --half-dollars)
            HALF_DOLLARS="true"
            shift
            ;;
        -o|--output)
            OUTPUT_PATH="$2"
            shift 2
            ;;
        --api)
            API_URL="$2"
            shift 2
            ;;
        -*)
            error "Unknown option: $1"
            ;;
        *)
            if [ -z "$INPUT_FILE" ]; then
                INPUT_FILE="$1"
            else
                error "Unexpected argument: $1"
            fi
            shift
            ;;
    esac
done

# Validate input
if [ -z "$INPUT_FILE" ]; then
    echo "Error: No input file specified" >&2
    echo "" >&2
    usage
fi

if [ ! -f "$INPUT_FILE" ]; then
    error "Input file not found: $INPUT_FILE"
fi

# Check API availability
check_api

# Build query parameters
QUERY_PARAMS=""
if [ -n "$DIVISOR" ]; then
    QUERY_PARAMS="${QUERY_PARAMS}divisor=${DIVISOR}&"
fi
if [ "$NO_PENNIES" = "true" ]; then
    QUERY_PARAMS="${QUERY_PARAMS}noPennies=true&"
fi
if [ "$HALF_DOLLARS" = "true" ]; then
    QUERY_PARAMS="${QUERY_PARAMS}halfDollars=true&"
fi

# Remove trailing &
QUERY_PARAMS="${QUERY_PARAMS%&}"

# Build URL
URL="${API_URL}/process"
if [ -n "$QUERY_PARAMS" ]; then
    URL="${URL}?${QUERY_PARAMS}"
fi

# Read file content
FILE_CONTENT=$(cat "$INPUT_FILE")

# Make API request
RESPONSE=$(curl -s -X POST "$URL" \
    -H "Content-Type: text/plain" \
    -d "$FILE_CONTENT") || error "Failed to connect to API"

# Check for error response
if echo "$RESPONSE" | grep -q '"error"'; then
    ERROR_MSG=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    error "API error: $ERROR_MSG"
fi

# Parse response
CURRENCY=$(echo "$RESPONSE" | grep -o '"currency":"[^"]*"' | cut -d'"' -f4)
HAS_RANDOM=$(echo "$RESPONSE" | grep -o '"hasRandomization":[^,}]*' | cut -d':' -f2)
DIVISOR=$(echo "$RESPONSE" | grep -o '"divisor":[0-9]*' | cut -d':' -f2)

# Extract results array - parse JSON carefully to handle commas in values
# Replace ","  with newline (comma followed by quote is array separator)
RESULTS=$(echo "$RESPONSE" | \
    sed 's/.*"results":\["//' | \
    sed 's/"\].*$//' | \
    sed 's/","/\n/g')

# Determine output path
if [ -z "$OUTPUT_PATH" ]; then
    # Get script directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    # Ensure output directory exists
    mkdir -p "${SCRIPT_DIR}/${OUTPUT_DIR}"

    # Generate output filename from input filename
    INPUT_BASENAME=$(basename "$INPUT_FILE" .txt)
    OUTPUT_PATH="${SCRIPT_DIR}/${OUTPUT_DIR}/${INPUT_BASENAME}-output.txt"
fi

# Ensure output directory exists for custom paths too
mkdir -p "$(dirname "$OUTPUT_PATH")"

# Build output content
{
    if [ "$HAS_RANDOM" = "true" ]; then
        echo "* randomization used - divisible by ${DIVISOR}"
    else
        echo "* no entries divisible by ${DIVISOR}"
    fi
    echo "$RESULTS"
} > "$OUTPUT_PATH"

# Count transactions
TRANSACTION_COUNT=$(echo "$RESULTS" | wc -l)

# Print summary
echo "Processed ${TRANSACTION_COUNT} transactions (${CURRENCY})"
echo "Output: ${OUTPUT_PATH}"
echo ""
echo "--- Results ---"

if [ "$HAS_RANDOM" = "true" ]; then
    echo "* randomization used - divisible by ${DIVISOR}"
else
    echo "* no entries divisible by ${DIVISOR}"
fi
echo "$RESULTS"
