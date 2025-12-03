# Cash Register - .NET Client

.NET command-line client for processing cash register transactions via the REST API.

## Prerequisites

- .NET 8.0 SDK (or later)
- The API server must be running: `cd api && npm start`

## Build

```bash
cd clients/dotnet
dotnet build
```

## Usage

```bash
# Process a USD input file
dotnet run -- ../../data/sample-usd.txt

# Process a EUR input file
dotnet run -- ../../data/sample-eur.txt
```

## Options

| Option | Description |
|--------|-------------|
| `--no-pennies` | Disable pennies, use Swedish rounding to nearest nickel |
| `--half-dollars` | Enable half dollar coins in change |
| `--divisor <n>` | Set the random divisor (default: 3) |
| `-o, --output <path>` | Custom output file path |
| `--api <url>` | API server URL (default: http://localhost:3000) |
| `-h, --help` | Show help message |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CASH_REGISTER_API` | API server URL (overridden by --api) |

## Examples

```bash
# Process without pennies (Swedish rounding)
dotnet run -- ../../data/sample-usd.txt --no-pennies

# Use a different random divisor
dotnet run -- ../../data/sample-usd.txt --divisor 5

# Enable half dollars
dotnet run -- ../../data/sample-usd.txt --half-dollars

# Custom API URL
dotnet run -- ../../data/sample-usd.txt --api http://localhost:8080

# Custom output path
dotnet run -- ../../data/sample-usd.txt -o ./my-output.txt

# Using environment variable
CASH_REGISTER_API=http://localhost:8080 dotnet run -- ../../data/sample-usd.txt
```

## Output

Results are written to `../../output/clients/dotnet/<input-filename>-output.txt` and also printed to stdout.

For example:
- Input: `sample-usd.txt` → Output: `sample-usd-output.txt`
- Input: `my-test.txt` → Output: `my-test-output.txt`

Output format:
```
* randomization used - divisible by 3
*96.87, 100.00, 3.13: 2 dollars, 1 dime, 15 nickels, 28 pennies
98.39, 100.00, 1.61: 1 dollar, 2 quarters, 1 dime, 1 penny
```

- First line shows divisor and whether randomization was used
- Lines with `*` prefix used random denomination selection
- Each line shows: `<owed>, <paid>, <change>: <denominations>`

## Publishing

To create a standalone executable:

```bash
# For Linux
dotnet publish -c Release -r linux-x64 --self-contained

# For macOS
dotnet publish -c Release -r osx-x64 --self-contained

# For Windows
dotnet publish -c Release -r win-x64 --self-contained
```
