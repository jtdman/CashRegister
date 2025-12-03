#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { processFile } from '../../core/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Cash Register - Node CLI

Process transaction files and calculate change.

Usage: node cli.js <input-file> [options]

Arguments:
  input-file    Path to input file with transactions

Options:
  --no-pennies        Disable pennies (Swedish rounding)
  --half-dollars      Enable half dollars
  --divisor <n>       Set random divisor (default: 3)
  -o, --output <path> Custom output file path
  -h, --help          Show this help message

Examples:
  node cli.js ../data/sample-usd.txt
  node cli.js ../data/sample-usd.txt --no-pennies
  node cli.js ../data/sample-eur.txt --divisor 5
`);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const inputPath = args[0];
  const options = {};
  let customOutputPath = null;

  // Parse options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--no-pennies') {
      options.use_pennies = false;
    } else if (arg === '--half-dollars') {
      options.use_half_dollars = true;
    } else if (arg === '--divisor') {
      options.random_divisor = parseInt(args[++i], 10);
    } else if (arg === '-o' || arg === '--output') {
      customOutputPath = args[++i];
    }
  }

  // Read input file
  let content;
  try {
    content = readFileSync(inputPath, 'utf-8');
  } catch (error) {
    console.error(`Error reading input file: ${error.message}`);
    process.exit(1);
  }

  // Process file
  let result;
  try {
    result = processFile(content, options);
  } catch (error) {
    console.error(`Error processing file: ${error.message}`);
    process.exit(1);
  }

  // Determine output path
  const outputDir = join(rootDir, 'output', 'clients', 'node');
  mkdirSync(outputDir, { recursive: true });

  let outputPath;
  if (customOutputPath) {
    outputPath = customOutputPath;
  } else {
    // Use input filename with -output appended
    const inputBasename = basename(inputPath, '.txt');
    const outputFileName = `${inputBasename}-output.txt`;
    outputPath = join(outputDir, outputFileName);
  }

  // Write output
  const lines = [];
  if (result.hasRandom) {
    lines.push('* randomization used');
  }
  lines.push(...result.results);

  const outputContent = lines.join('\n') + '\n';
  writeFileSync(outputPath, outputContent);

  console.log(`Processed ${result.results.length} transactions (${result.currency})`);
  console.log(`Output: ${outputPath}`);

  // Also print to stdout
  console.log('\n--- Results ---');
  result.results.forEach(line => console.log(line));
}

main();
