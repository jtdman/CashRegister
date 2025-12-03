#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Load currency configuration
 * @param {string} code - Currency code
 * @returns {object} Currency config
 */
function loadCurrencyConfig(code) {
  const configPath = join(rootDir, 'core', 'config', `${code.toLowerCase()}.json`);
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

/**
 * Generate a random price in cents
 * @param {number} maxValue - Maximum value in whole currency units
 * @returns {number} Random price in cents
 */
function generateRandomPrice(maxValue) {
  const maxCents = maxValue * 100;
  // Generate random cents from 1 to maxCents
  return Math.floor(Math.random() * maxCents) + 1;
}

/**
 * Find the smallest payment denomination that covers the price
 * @param {number} priceCents - Price in cents
 * @param {Array} paymentDenominations - Available payment denominations in cents
 * @returns {number} Payment amount in cents
 */
function generatePaymentAmount(priceCents, paymentDenominations) {
  // Sort denominations ascending
  const sorted = [...paymentDenominations].sort((a, b) => a - b);

  // Find the smallest denomination that covers the price
  for (const denom of sorted) {
    if (denom >= priceCents) {
      return denom;
    }
  }

  // If price exceeds all denominations, combine them
  // Find combination that covers the price
  const largest = sorted[sorted.length - 1];
  const multiplier = Math.ceil(priceCents / largest);
  return largest * multiplier;
}

/**
 * Format cents as decimal string
 * @param {number} cents - Amount in cents
 * @returns {string} Formatted string (e.g., "12.34")
 */
function formatCents(cents) {
  const dollars = Math.floor(cents / 100);
  const remainingCents = cents % 100;
  return `${dollars}.${remainingCents.toString().padStart(2, '0')}`;
}

/**
 * Generate input file content
 * @param {string} currencyCode - Currency code
 * @param {number} lineCount - Number of transaction lines
 * @param {number} maxValueOverride - Optional max value override
 * @returns {string} File content
 */
function generateInputFile(currencyCode, lineCount = 20, maxValueOverride = null) {
  const config = loadCurrencyConfig(currencyCode);
  const maxValue = maxValueOverride || config.max_value || 101;
  const paymentDenoms = config.payment_denominations || [100, 500, 1000, 2000];

  const lines = [`CURRENCY:${currencyCode.toUpperCase()}`];

  for (let i = 0; i < lineCount; i++) {
    const priceCents = generateRandomPrice(maxValue);
    const paymentCents = generatePaymentAmount(priceCents, paymentDenoms);

    const priceStr = formatCents(priceCents);
    const paymentStr = formatCents(paymentCents);

    lines.push(`${priceStr},${paymentStr}`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Cash Register Input File Generator

Usage: node generate.js <currency> [options]

Arguments:
  currency    Currency code (e.g., USD, EUR)

Options:
  -n, --lines <count>       Number of transaction lines (default: 20)
  -m, --max-value <amount>  Maximum price value (default: from currency config)
  -o, --output <path>       Output file path (default: data/sample-<currency>.txt)
  -h, --help                Show this help message

Examples:
  node generate.js USD
  node generate.js EUR -n 50
  node generate.js USD -m 500 -n 30
  node generate.js USD -o custom-input.txt
`);
    process.exit(0);
  }

  const currencyCode = args[0].toUpperCase();
  let lineCount = 20;
  let maxValue = null;
  let outputPath = null;

  // Parse options
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '-n' || args[i] === '--lines') {
      lineCount = parseInt(args[++i], 10);
    } else if (args[i] === '-m' || args[i] === '--max-value') {
      maxValue = parseInt(args[++i], 10);
    } else if (args[i] === '-o' || args[i] === '--output') {
      outputPath = args[++i];
    }
  }

  // Default output path
  if (!outputPath) {
    outputPath = join(rootDir, 'data', `sample-${currencyCode.toLowerCase()}.txt`);
  }

  // Ensure data directory exists
  const dataDir = join(rootDir, 'data');
  mkdirSync(dataDir, { recursive: true });

  // Generate and write file
  const content = generateInputFile(currencyCode, lineCount, maxValue);
  writeFileSync(outputPath, content);

  console.log(`Generated ${lineCount} transactions for ${currencyCode}`);
  console.log(`Output: ${outputPath}`);
}

main();
