# Cash Register - Node CLI

Node.js command-line client for processing cash register transactions.

## Usage

```bash
# Process a USD input file
node cli.js ../../data/sample-usd.txt

# Process a EUR input file
node cli.js ../../data/sample-eur.txt
```

## Options

| Option | Description |
|--------|-------------|
| `--no-pennies` | Disable pennies, use Swedish rounding to nearest nickel |
| `--half-dollars` | Enable half dollar coins in change |
| `--divisor <n>` | Set the random divisor (default: 3) |
| `-o, --output <path>` | Custom output file path |
| `-h, --help` | Show help message |

## Examples

```bash
# Process without pennies (Swedish rounding)
node cli.js ../../data/sample-usd.txt --no-pennies

# Use a different random divisor
node cli.js ../../data/sample-usd.txt --divisor 5

# Enable half dollars
node cli.js ../../data/sample-usd.txt --half-dollars

# Custom output path
node cli.js ../../data/sample-usd.txt -o ./my-output.txt
```

## Output

Results are written to `../../output/clients/node/<input-filename>-output.txt` and also printed to stdout.

For example:
- Input: `sample-usd.txt` → Output: `sample-usd-output.txt`
- Input: `my-test.txt` → Output: `my-test-output.txt`

Output format:
```
* randomization used
*96.87, 100.00, 3.13: 2 dollars, 1 dime, 15 nickels, 28 pennies
98.39, 100.00, 1.61: 1 dollar, 2 quarters, 1 dime, 1 penny
```

- First line shows `* randomization used` if any transactions used the random mode
- Lines with `*` prefix used random denomination selection
- Each line shows: `<owed>, <paid>, <change>: <denominations>`
