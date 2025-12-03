# Cash Register Tools

Tools for generating input files for the cash register system.

## Generate Input Files

Generate sample transaction files for testing:

```bash
# Generate USD input file (20 transactions, default max value)
node generate.js USD

# Generate EUR input file
node generate.js EUR

# Custom number of transactions
node generate.js USD -n 50

# Override maximum price value
node generate.js USD -m 500

# Combine options
node generate.js USD -n 30 -m 500

# Custom output path
node generate.js USD -o ../data/my-input.txt
```

## Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--lines` | `-n` | Number of transaction lines | 20 |
| `--max-value` | `-m` | Maximum price value | From currency config |
| `--output` | `-o` | Output file path | `data/sample-<currency>.txt` |
| `--help` | `-h` | Show help message | - |

## Output Format

Generated files include a currency header and transaction lines:

```
CURRENCY:USD
12.34,20.00
5.67,10.00
...
```

## Configuration

The generator reads currency configuration from `../core/config/<currency>.json` to determine:

- `max_value`: Maximum price to generate
- `payment_denominations`: Valid payment amounts (e.g., $1, $5, $10, $20)

Payment amounts are automatically selected as the smallest denomination that covers the owed amount.
