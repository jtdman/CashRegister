import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load the default configuration
 * @returns {object} Default configuration
 */
export function loadDefaultConfig() {
  const configPath = join(__dirname, '..', 'config', 'default.json');
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

/**
 * Load a currency configuration by code, merged with defaults
 * @param {string} code - Currency code (e.g., 'USD', 'EUR')
 * @returns {object} Currency configuration merged with defaults
 */
export function loadCurrencyConfig(code) {
  const defaults = loadDefaultConfig();
  const configPath = join(__dirname, '..', 'config', `${code.toLowerCase()}.json`);
  const currencyConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

  // Merge defaults with currency config (currency config takes precedence)
  return { ...defaults, ...currencyConfig };
}

/**
 * Get active denominations based on config flags
 * @param {object} currencyConfig - Currency configuration
 * @returns {Array} Active denominations sorted by value descending
 */
export function getActiveDenominations(currencyConfig) {
  return currencyConfig.denominations
    .filter(denom => {
      if (!denom.flag) return true;
      return currencyConfig[denom.flag] === true;
    })
    .sort((a, b) => b.value - a.value);
}

/**
 * Apply Swedish rounding to a cents value
 * Rounds to nearest 5 cents
 * @param {number} cents - Amount in cents
 * @returns {number} Rounded amount in cents
 */
export function swedishRound(cents) {
  const remainder = cents % 5;
  if (remainder === 0) return cents;
  if (remainder <= 2) {
    return cents - remainder;
  }
  return cents + (5 - remainder);
}

/**
 * Calculate change using minimum denominations (greedy algorithm)
 * @param {number} cents - Change amount in cents
 * @param {Array} denominations - Active denominations
 * @returns {Array} Array of { denomination, count } objects
 */
export function calculateMinimumChange(cents, denominations) {
  const result = [];
  let remaining = cents;

  for (const denom of denominations) {
    if (remaining >= denom.value) {
      const count = Math.floor(remaining / denom.value);
      result.push({ denomination: denom, count });
      remaining -= count * denom.value;
    }
  }

  return result;
}

/**
 * Calculate change using random denominations
 * @param {number} cents - Change amount in cents
 * @param {Array} denominations - Active denominations
 * @returns {Array} Array of { denomination, count } objects
 */
export function calculateRandomChange(cents, denominations) {
  const result = [];
  let remaining = cents;

  // Shuffle the order we consider denominations, but still need valid solution
  // Strategy: randomly decide how many of each denomination to use
  const shuffled = [...denominations].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffled.length; i++) {
    const denom = shuffled[i];
    if (remaining >= denom.value) {
      const maxCount = Math.floor(remaining / denom.value);

      // For the last denomination or small values, use what's needed
      const isLast = i === shuffled.length - 1;
      const count = isLast ? maxCount : Math.floor(Math.random() * (maxCount + 1));

      if (count > 0) {
        result.push({ denomination: denom, count });
        remaining -= count * denom.value;
      }
    }
  }

  // If we have remaining cents, we need to fill with smallest denomination
  if (remaining > 0) {
    const smallest = denominations[denominations.length - 1];
    if (remaining % smallest.value === 0) {
      const existingSmallest = result.find(r => r.denomination.value === smallest.value);
      if (existingSmallest) {
        existingSmallest.count += remaining / smallest.value;
      } else {
        result.push({ denomination: smallest, count: remaining / smallest.value });
      }
    }
  }

  // Sort result by denomination value descending for consistent output
  return result
    .filter(r => r.count > 0)
    .sort((a, b) => b.denomination.value - a.denomination.value);
}

/**
 * Format change result as string
 * @param {Array} changeResult - Array of { denomination, count } objects
 * @returns {string} Formatted string like "1 dollar, 2 quarters, 1 nickel"
 */
export function formatChange(changeResult) {
  if (changeResult.length === 0) {
    return 'no change';
  }

  return changeResult
    .map(({ denomination, count }) => {
      const name = count === 1 ? denomination.name : denomination.plural;
      return `${count} ${name}`;
    })
    .join(', ');
}

/**
 * Parse a currency amount string to cents
 * @param {string} amount - Amount string (e.g., "2.13")
 * @returns {number} Amount in cents
 */
export function parseToCents(amount) {
  const cleaned = amount.trim();
  const parts = cleaned.split('.');

  if (parts.length === 1) {
    return parseInt(parts[0], 10) * 100;
  }

  const dollars = parseInt(parts[0], 10);
  let cents = parts[1];

  // Handle cases like "2.5" meaning "2.50"
  if (cents.length === 1) {
    cents = cents + '0';
  }

  return dollars * 100 + parseInt(cents, 10);
}

/**
 * Calculate change for a transaction
 * @param {number} owedCents - Amount owed in cents
 * @param {number} paidCents - Amount paid in cents
 * @param {object} currencyConfig - Currency configuration
 * @param {object} options - Override options
 * @returns {object} { change: string, changeCents: number, useRandom: boolean }
 */
export function calculateChange(owedCents, paidCents, currencyConfig, options = {}) {
  const config = { ...currencyConfig, ...options };
  let changeCents = paidCents - owedCents;

  if (changeCents < 0) {
    throw new Error('Paid amount is less than owed amount');
  }

  if (changeCents === 0) {
    return { change: 'no change', changeCents: 0, useRandom: false };
  }

  // Apply Swedish rounding if pennies are disabled
  if (config.use_pennies === false) {
    changeCents = swedishRound(changeCents);
  }

  const denominations = getActiveDenominations(config);
  const divisor = config.random_divisor || 3;

  // Check if integer part of owed amount is divisible by the divisor
  const owedDollars = Math.floor(owedCents / 100);
  const useRandom = owedDollars > 0 && owedDollars % divisor === 0;

  const changeResult = useRandom
    ? calculateRandomChange(changeCents, denominations)
    : calculateMinimumChange(changeCents, denominations);

  return {
    change: formatChange(changeResult),
    changeCents,
    useRandom
  };
}

/**
 * Format cents as decimal string
 * @param {number} cents - Amount in cents
 * @returns {string} Formatted string (e.g., "12.34")
 */
export function formatCentsAsDecimal(cents) {
  const dollars = Math.floor(cents / 100);
  const remainingCents = cents % 100;
  return `${dollars}.${remainingCents.toString().padStart(2, '0')}`;
}

/**
 * Process a single transaction line
 * @param {string} line - Transaction line (e.g., "2.13,3.00")
 * @param {object} currencyConfig - Currency configuration
 * @param {object} options - Override options
 * @returns {object} { line: string, useRandom: boolean }
 */
export function processTransaction(line, currencyConfig, options = {}) {
  const [owedStr, paidStr] = line.split(',').map(s => s.trim());
  const owedCents = parseToCents(owedStr);
  const paidCents = parseToCents(paidStr);
  const result = calculateChange(owedCents, paidCents, currencyConfig, options);

  const changeStr = formatCentsAsDecimal(result.changeCents);
  const prefix = result.useRandom ? '*' : '';

  return {
    line: `${prefix}${owedStr}, ${paidStr}, ${changeStr}: ${result.change}`,
    useRandom: result.useRandom
  };
}

/**
 * Parse input file content and extract currency and transactions
 * @param {string} content - File content
 * @returns {object} { currency: string, lines: string[] }
 */
export function parseInputFile(content) {
  const lines = content.trim().split('\n').filter(line => line.trim());

  let currency = 'USD';
  const transactionLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toUpperCase().startsWith('CURRENCY:')) {
      currency = trimmed.split(':')[1].trim().toUpperCase();
    } else if (trimmed) {
      transactionLines.push(trimmed);
    }
  }

  return { currency, lines: transactionLines };
}

/**
 * Process an entire input file
 * @param {string} content - File content
 * @param {object} options - Override options
 * @returns {object} { currency: string, results: string[], hasRandom: boolean, divisor: number }
 */
export function processFile(content, options = {}) {
  const { currency, lines } = parseInputFile(content);
  const currencyConfig = loadCurrencyConfig(currency);
  const config = { ...currencyConfig, ...options };
  const divisor = config.random_divisor || 3;

  const processed = lines.map(line => processTransaction(line, currencyConfig, options));
  const hasRandom = processed.some(p => p.useRandom);

  return {
    currency,
    results: processed.map(p => p.line),
    hasRandom,
    divisor
  };
}
