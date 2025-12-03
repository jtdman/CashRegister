# Quick Start Guide

Get up and running in 5 minutes.

## Prerequisites

- Node.js (for API server and Node client)
- Python 3 + `requests` library (for Python client)
- .NET 8.0 SDK (for .NET client)
- curl (for Bash client)

## 1. Setup

```bash
# Clone and enter the project
git clone <repo-url>
cd CashRegister

# Install API dependencies
cd api && npm install && cd ..

# Generate sample data
node tools/generate.js USD
node tools/generate.js EUR
```

## 2. Start the API Server

Open a terminal and run:

```bash
cd api && npm start
```

Keep this running. You should see: `Cash Register API listening on port 3000`

## 3. Run the Clients

Open a new terminal and run each client:

### Node Client (no API required)

```bash
node clients/node/cli.js data/sample-usd.txt
```

### Bash Client

```bash
./clients/bash/cash-register.sh data/sample-usd.txt
```

### Python Client

```bash
pip3 install requests  # if not already installed
python3 clients/python/cash_register.py data/sample-usd.txt
```

### .NET Client

```bash
cd clients/dotnet
dotnet build
dotnet run -- ../../data/sample-usd.txt
```

## 4. Run All Clients Automatically

To test all clients at once:

```bash
./scripts/test-all.sh
```

This will start the API (if not running), run each client, and show the results.

## Output

Each client writes output to `output/clients/<client-name>/sample-usd-output.txt`

Sample output:
```
* randomization used - divisible by 3
80.71, 100.00, 19.29: 1 ten, 1 five, 4 dollars, 1 quarter, 4 pennies
*81.79, 100.00, 18.21: 5 dollars, 4 quarters, 76 dimes, 71 nickels, 106 pennies
```

Lines prefixed with `*` used random denomination selection (owed amount divisible by 3).

## Common Options

All clients support these options:

| Option | Description |
|--------|-------------|
| `--no-pennies` | Swedish rounding to nearest nickel |
| `--half-dollars` | Enable half dollar coins |
| `--divisor <n>` | Change random trigger (default: 3) |

Example:
```bash
node clients/node/cli.js data/sample-usd.txt --no-pennies --divisor 5
```

## Next Steps

- See [INSTRUCTIONS.md](INSTRUCTIONS.md) for full documentation
- See individual client READMEs in `clients/*/README.md`
