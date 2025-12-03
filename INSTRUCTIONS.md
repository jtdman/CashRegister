# Cash Register - Instructions

This project calculates change for cash register transactions with configurable currency support and a unique randomization feature.

## Project Structure

```
CashRegister/
├── config/                  # Shared currency configurations
│   ├── default.json         # Global defaults
│   ├── usd.json             # US Dollar settings
│   └── eur.json             # Euro settings
├── core/                    # Core calculation engine (Node.js)
│   └── index.js             # Main logic
├── api/                     # REST API server
│   ├── server.js            # Express server
│   └── package.json         # API dependencies
├── clients/                 # Client implementations
│   ├── node/                # Node.js CLI client
│   ├── bash/                # Bash CLI client (uses API)
│   ├── python/              # Python CLI client (uses API)
│   └── dotnet/              # .NET CLI client (uses API)
├── tools/                   # Utilities
│   └── generate.js          # Input file generator
├── data/                    # Input files (gitignored)
└── output/                  # Output files (gitignored)
    └── clients/
        ├── node/
        ├── bash/
        ├── python/
        └── dotnet/
```

## Quick Start

### 1. Generate Sample Data

Generate sample transaction files for testing.

**From the project root:**

```bash
node tools/generate.js USD
node tools/generate.js EUR -n 50
```

**Or from the tools directory:**

```bash
cd tools

# Generate USD sample data (20 transactions, max $101)
node generate.js USD

# Generate EUR sample data
node generate.js EUR

# Custom: 50 transactions
node generate.js USD -n 50

# Override max value (e.g., prices up to $500)
node generate.js USD -m 500

# Combine options
node generate.js USD -n 100 -m 1000

# Custom output filename
node generate.js USD -o ../data/my-test-data.txt
```

**Generator Options:**

- `-n, --lines <count>` - Number of transactions (default: 20)
- `-m, --max-value <amount>` - Maximum price (default: from currency config)
- `-o, --output <path>` - Custom output path (default: `data/sample-<currency>.txt`)

This creates files in `data/`:

- `data/sample-usd.txt`
- `data/sample-eur.txt`
- Or custom path if specified with `-o`

### 2. Run the Node Client

Process the generated data files.

**From the project root:**

```bash
# Basic usage
node clients/node/cli.js data/sample-usd.txt

# With options (override divisor, disable pennies, etc.)
node clients/node/cli.js data/sample-usd.txt --divisor 5 --no-pennies
```

**Or from the clients/node directory:**

```bash
cd clients/node
node cli.js ../../data/sample-usd.txt

# With custom divisor (randomize when owed amount divisible by 5)
node cli.js ../../data/sample-usd.txt --divisor 5
```

Output will be written to `output/clients/node/<input-filename>-output.txt` and displayed in the terminal.

For example:
- `sample-usd.txt` → `output/clients/node/sample-usd-output.txt`
- `my-test.txt` → `output/clients/node/my-test-output.txt`

**Common options:**
- `--divisor <n>` - Change random mode trigger (default: 3)
- `--no-pennies` - Use Swedish rounding (USD only)
- `--half-dollars` - Enable half dollar coins (USD only)

### 3. Run the API Server

For multi-language client support, use the REST API.

```bash
cd api
npm install
npm start
```

The API runs on http://localhost:3000. See [api/README.md](api/README.md) for full endpoint documentation.

**Quick examples:**

```bash
# Health check
curl http://localhost:3000/health

# Calculate single transaction
curl -X POST http://localhost:3000/calculate \
  -H "Content-Type: application/json" \
  -d '{"currency":"USD","owed":"12.34","paid":"20.00"}'

# Batch process transactions
curl -X POST http://localhost:3000/batch \
  -H "Content-Type: application/json" \
  -d '{"currency":"USD","transactions":["12.34,20.00","5.67,10.00"]}'
```

### 4. Run the Bash Client

The bash client uses the API server. Make sure the API is running first.

**From the clients/bash directory:**

```bash
cd clients/bash

# Process a USD input file
./cash-register.sh ../../data/sample-usd.txt

# With options
./cash-register.sh ../../data/sample-usd.txt --divisor 5 --no-pennies
```

Output will be written to `output/clients/bash/<input-filename>-output.txt`.

See [clients/bash/README.md](clients/bash/README.md) for full documentation.

### 5. Run the Python Client

The Python client uses the API server. Make sure the API is running first.

**Prerequisites:** `pip install requests`

**From the clients/python directory:**

```bash
cd clients/python

# Process a USD input file
python cash_register.py ../../data/sample-usd.txt

# With options
python cash_register.py ../../data/sample-usd.txt --divisor 5 --no-pennies
```

Output will be written to `output/clients/python/<input-filename>-output.txt`.

See [clients/python/README.md](clients/python/README.md) for full documentation.

### 6. Run the .NET Client

The .NET client uses the API server. Make sure the API is running first.

**Prerequisites:** .NET 8.0 SDK

**From the clients/dotnet directory:**

```bash
cd clients/dotnet

# Build the project
dotnet build

# Process a USD input file
dotnet run -- ../../data/sample-usd.txt

# With options
dotnet run -- ../../data/sample-usd.txt --divisor 5 --no-pennies
```

Output will be written to `output/clients/dotnet/<input-filename>-output.txt`.

See [clients/dotnet/README.md](clients/dotnet/README.md) for full documentation.

## Input File Format

Input files must include a currency header followed by transaction lines:

```
CURRENCY:USD
12.34,20.00
5.67,10.00
```

- **Header**: `CURRENCY:<CODE>` (e.g., `CURRENCY:USD`, `CURRENCY:EUR`)
- **Transactions**: `<owed>,<paid>` (one per line)

## Output File Format

Output files show the change calculation for each transaction:

```
* randomization used - divisible by 3
*96.87, 100.00, 3.13: 2 dollars, 1 dime, 15 nickels, 28 pennies
98.39, 100.00, 1.61: 1 dollar, 2 quarters, 1 dime, 1 penny
```

Or when no entries match the divisor:

```
* no entries divisible by 5
12.34, 20.00, 7.66: 1 five, 2 dollars, 2 quarters, 1 dime, 1 nickel, 1 penny
```

- **First line**: Shows divisor and whether randomization was used
- **Asterisk prefix**: `*` marks lines that used random denomination selection
- **Format**: `<owed>, <paid>, <change>: <denominations>`

## Configuration Options

### Global Configuration (`config/default.json`)

```json
{
  "random_divisor": 3
}
```

- **`random_divisor`**: When the integer part of the owed amount is divisible by this number, use random denomination selection instead of minimum change. This applies to all currencies unless overridden at runtime.

### Currency Configuration

Each currency has its own config file (e.g., `config/usd.json`):

```json
{
  "code": "USD",
  "name": "US Dollar",
  "max_value": 101,
  "use_pennies": true,
  "use_half_dollars": false,
  "denominations": [...],
  "payment_denominations": [100, 500, 1000, 2000, 5000, 10000]
}
```

#### Key Settings

| Setting                 | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `max_value`             | Maximum price for generator (in currency units) |
| `use_pennies`           | Enable/disable pennies (USD only)               |
| `use_half_dollars`      | Enable/disable half dollar coins (USD only)     |
| `denominations`         | Array of available denominations                |
| `payment_denominations` | Valid payment amounts for generator (in cents)  |

### Denomination Configuration

Each denomination has:

- `name`: Singular form
- `plural`: Plural form
- `value`: Value in cents
- `flag` (optional): Configuration flag to toggle availability

Example:

```json
{ "name": "penny", "plural": "pennies", "value": 1, "flag": "use_pennies" }
```

## Command-Line Options (Node Client)

### Basic Usage

```bash
node cli.js <input-file> [options]
```

### Available Options

| Option                | Description                                                      | Example          |
| --------------------- | ---------------------------------------------------------------- | ---------------- |
| `--no-pennies`        | Disable pennies, use Swedish rounding                            | `--no-pennies`   |
| `--half-dollars`      | Enable half dollar coins                                         | `--half-dollars` |
| `--divisor <n>`       | Override random divisor (default: 3 from `config/default.json`) | `--divisor 5`    |
| `-o, --output <path>` | Custom output file path                                          | `-o results.txt` |
| `-h, --help`          | Show help message                                                | `--help`         |

**Note:** The `--divisor` option overrides the global default (3) for the current run only. When the integer part of the owed amount is divisible by this number, random denomination mode is used instead of minimum change.

### Examples

```bash
# Swedish rounding (no pennies)
node cli.js ../../data/sample-usd.txt --no-pennies

# Change random divisor to 5 (randomize when owed amount divisible by 5)
node cli.js ../../data/sample-usd.txt --divisor 5

# Enable half dollars
node cli.js ../../data/sample-usd.txt --half-dollars

# Combine multiple options
node cli.js ../../data/sample-usd.txt --no-pennies --divisor 7

# Custom output file
node cli.js ../../data/sample-usd.txt -o my-results.txt
```

## API Endpoints

The REST API provides HTTP access to the core calculation logic. See [api/README.md](api/README.md) for complete documentation.

| Endpoint              | Method | Description                           |
| --------------------- | ------ | ------------------------------------- |
| `/health`             | GET    | Health check                          |
| `/currencies`         | GET    | List available currencies             |
| `/currencies/:code`   | GET    | Get currency configuration            |
| `/calculate`          | POST   | Calculate change for single transaction |
| `/batch`              | POST   | Process multiple transactions         |
| `/process`            | POST   | Process raw input file content        |

## Special Features

### Random Denomination Mode

When the **integer part** of the owed amount is divisible by the configured divisor (default: 3), the system uses random denomination selection instead of the standard minimum change algorithm.

**Examples with divisor = 3:**

- `$3.50` → Random mode (3 ÷ 3 = 1) ✓
- `$6.17` → Random mode (6 ÷ 3 = 2) ✓
- `$9.99` → Random mode (9 ÷ 3 = 3) ✓
- `$4.50` → Minimum change (4 ÷ 3 = 1.33) ✗
- `$98.39` → Minimum change (98 ÷ 3 = 32.67) ✗

### Swedish Rounding

When `use_pennies: false` or `--no-pennies` flag is used, change is rounded to the nearest nickel:

- `$0.01 - $0.02` → `$0.00` (round down)
- `$0.03 - $0.07` → `$0.05` (round to nickel)
- `$0.08 - $0.12` → `$0.10` (round to dime)

## Adding New Currencies

1. Create a new config file: `config/<code>.json`
2. Define denominations and settings
3. Add to generator's payment denominations
4. Generate input file: `node tools/generate.js <CODE>`

Example for Japanese Yen (`config/jpy.json`):

```json
{
  "code": "JPY",
  "name": "Japanese Yen",
  "max_value": 10000,
  "denominations": [
    { "name": "¥10000", "plural": "¥10000", "value": 10000 },
    { "name": "¥5000", "plural": "¥5000", "value": 5000 },
    { "name": "¥1000", "plural": "¥1000", "value": 1000 },
    { "name": "¥500", "plural": "¥500", "value": 500 },
    { "name": "¥100", "plural": "¥100", "value": 100 },
    { "name": "¥50", "plural": "¥50", "value": 50 },
    { "name": "¥10", "plural": "¥10", "value": 10 },
    { "name": "¥5", "plural": "¥5", "value": 5 },
    { "name": "¥1", "plural": "¥1", "value": 1 }
  ],
  "payment_denominations": [1000, 2000, 5000, 10000]
}
```

## Multi-Language Client Support

The API server enables clients written in any language to use the core calculation logic:

### Python Example

```python
import requests

response = requests.post('http://localhost:3000/calculate', json={
    'currency': 'USD',
    'owed': '12.34',
    'paid': '20.00'
})
result = response.json()
print(f"Change: {result['change']} - {result['breakdown']}")
```

### .NET Example

```csharp
using var client = new HttpClient();
var response = await client.PostAsJsonAsync("http://localhost:3000/calculate", new {
    currency = "USD",
    owed = "12.34",
    paid = "20.00"
});
var result = await response.Content.ReadFromJsonAsync<CalculateResult>();
```

### Bash/curl Example

```bash
curl -X POST http://localhost:3000/calculate \
  -H "Content-Type: application/json" \
  -d '{"currency":"USD","owed":"12.34","paid":"20.00"}'
```

## Development

### Project Requirements

- Node.js (ES modules support)
- No external dependencies for core logic
- Express + cors for API server

### Running Tests

```bash
# Generate test data
node tools/generate.js USD -n 20

# Process with Node client
node clients/node/cli.js data/sample-usd.txt
node clients/node/cli.js data/sample-usd.txt --divisor 5
node clients/node/cli.js data/sample-usd.txt --no-pennies

# Test API
cd api && npm start &
curl http://localhost:3000/health
curl -X POST http://localhost:3000/calculate \
  -H "Content-Type: application/json" \
  -d '{"currency":"USD","owed":"12.34","paid":"20.00"}'
```

## Troubleshooting

### Issue: "Cannot find module"

Make sure you're in the correct directory:

```bash
cd clients/node
node cli.js ../../data/sample-usd.txt
```

### Issue: "Error reading input file"

Generate sample data first:

```bash
node tools/generate.js USD
node tools/generate.js EUR
```

### Issue: Unexpected change calculations

- Verify the currency header in input file: `CURRENCY:USD`
- Check denomination configs in `config/`
- Test with `--divisor 0` to disable random mode

### Issue: API not starting

```bash
cd api
npm install
npm start
```

Make sure port 3000 is available, or set a custom port:

```bash
PORT=8080 npm start
```
