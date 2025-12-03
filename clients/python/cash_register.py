#!/usr/bin/env python3
"""
Cash Register - Python Client

Processes transaction files using the REST API.
"""

import argparse
import os
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("Error: requests library required. Install with: pip install requests")
    sys.exit(1)


DEFAULT_API_URL = "http://localhost:3000"


def check_api(api_url: str) -> bool:
    """Check if the API server is available."""
    try:
        response = requests.get(f"{api_url}/health", timeout=5)
        return response.status_code == 200
    except requests.RequestException:
        return False


def process_file(api_url: str, file_path: str, options: dict) -> dict:
    """Process an input file through the API."""
    with open(file_path, "r") as f:
        content = f.read()

    # Build query parameters
    params = {}
    if options.get("divisor") is not None:
        params["divisor"] = options["divisor"]
    if options.get("no_pennies"):
        params["noPennies"] = "true"
    if options.get("half_dollars"):
        params["halfDollars"] = "true"

    response = requests.post(
        f"{api_url}/process",
        params=params,
        data=content,
        headers={"Content-Type": "text/plain"},
        timeout=30,
    )

    if response.status_code != 200:
        error = response.json().get("error", "Unknown error")
        raise Exception(f"API error: {error}")

    return response.json()


def main():
    parser = argparse.ArgumentParser(
        description="Cash Register - Python Client",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cash_register.py ../../data/sample-usd.txt
  python cash_register.py ../../data/sample-usd.txt --divisor 5
  python cash_register.py ../../data/sample-usd.txt --no-pennies
  python cash_register.py ../../data/sample-usd.txt --api http://localhost:8080
        """,
    )

    parser.add_argument("input_file", help="Path to input file with transactions")
    parser.add_argument(
        "--divisor", type=int, help="Override random divisor (default: 3)"
    )
    parser.add_argument(
        "--no-pennies",
        action="store_true",
        help="Disable pennies, use Swedish rounding",
    )
    parser.add_argument(
        "--half-dollars", action="store_true", help="Enable half dollar coins"
    )
    parser.add_argument(
        "-o", "--output", help="Custom output file path"
    )
    parser.add_argument(
        "--api",
        default=os.environ.get("CASH_REGISTER_API", DEFAULT_API_URL),
        help=f"API server URL (default: {DEFAULT_API_URL})",
    )

    args = parser.parse_args()

    # Check input file exists
    if not os.path.isfile(args.input_file):
        print(f"Error: Input file not found: {args.input_file}", file=sys.stderr)
        sys.exit(1)

    # Check API availability
    if not check_api(args.api):
        print(
            f"Error: API server not available at {args.api}. "
            "Start it with: cd api && npm start",
            file=sys.stderr,
        )
        sys.exit(1)

    # Build options
    options = {
        "divisor": args.divisor,
        "no_pennies": args.no_pennies,
        "half_dollars": args.half_dollars,
    }

    # Process file
    try:
        result = process_file(args.api, args.input_file, options)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    # Determine output path
    if args.output:
        output_path = args.output
    else:
        script_dir = Path(__file__).parent
        output_dir = script_dir / ".." / ".." / "output" / "clients" / "python"
        output_dir.mkdir(parents=True, exist_ok=True)

        input_basename = Path(args.input_file).stem
        output_path = output_dir / f"{input_basename}-output.txt"

    # Build output content
    lines = []
    if result.get("hasRandomization"):
        lines.append(f"* randomization used - divisible by {result['divisor']}")
    else:
        lines.append(f"* no entries divisible by {result['divisor']}")
    lines.extend(result["results"])

    # Write output file
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        f.write("\n".join(lines) + "\n")

    # Print summary
    print(f"Processed {len(result['results'])} transactions ({result['currency']})")
    print(f"Output: {output_path}")
    print()
    print("--- Results ---")

    # Print results
    if result.get("hasRandomization"):
        print(f"* randomization used - divisible by {result['divisor']}")
    else:
        print(f"* no entries divisible by {result['divisor']}")

    for line in result["results"]:
        print(line)


if __name__ == "__main__":
    main()
