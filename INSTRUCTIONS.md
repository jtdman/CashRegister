# Cash Register - Instructions

This project calculates change for cash register transactions with configurable currency support and a unique randomization feature.

## Project Structure

```
CashRegister/
├── core/                    # Core calculation engine (Node.js)
│   ├── config/              # Currency configurations
│   │   ├── default.json     # Global defaults
│   │   ├── usd.json         # US Dollar settings
│   │   └── eur.json         # Euro settings
│   └── index.js             # Main logic
├── clients/                 # Client implementations
│   └── node/                # Node.js CLI client
├── tools/                   # Utilities
│   └── generate.js          # Input file generator
├── data/                    # Input files (gitignored)
└── output/                  # Output files (gitignored)
    └── clients/
        └── node/
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
* randomization used
*96.87, 100.00, 3.13: 2 dollars, 1 dime, 15 nickels, 28 pennies
98.39, 100.00, 1.61: 1 dollar, 2 quarters, 1 dime, 1 penny
```

- **First line**: `* randomization used` (if any transactions used random mode)
- **Asterisk prefix**: `*` marks lines that used random denomination selection
- **Format**: `<owed>, <paid>, <change>: <denominations>`

## Configuration Options

### Global Configuration (`core/config/default.json`)

```json
{
  "random_divisor": 3
}
```

- **`random_divisor`**: When the integer part of the owed amount is divisible by this number, use random denomination selection instead of minimum change. This applies to all currencies unless overridden at runtime.

### Currency Configuration

Each currency has its own config file (e.g., `core/config/usd.json`):

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
| `--divisor <n>`       | Override random divisor (default: 3 from `core/config/default.json`) | `--divisor 5`    |
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

1. Create a new config file: `core/config/<code>.json`
2. Define denominations and settings
3. Add to generator's payment denominations
4. Generate input file: `node tools/generate.js <CODE>`

Example for Japanese Yen (`core/config/jpy.json`):

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

## Development

### Project Requirements

- Node.js (ES modules support)
- No external dependencies for core logic

### Running Tests

```bash
# Generate test data
cd tools
node generate.js USD -n 20

# Process with different settings
cd ../clients/node
node cli.js ../../data/sample-usd.txt
node cli.js ../../data/sample-usd.txt --divisor 5
node cli.js ../../data/sample-usd.txt --no-pennies
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
cd tools
node generate.js USD
node generate.js EUR
```

### Issue: Unexpected change calculations

- Verify the currency header in input file: `CURRENCY:USD`
- Check denomination configs in `core/config/`
- Test with `--divisor 0` to disable random mode
