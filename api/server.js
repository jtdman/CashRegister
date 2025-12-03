import express from 'express';
import cors from 'cors';
import {
  loadCurrencyConfig,
  calculateChange,
  parseToCents,
  formatCentsAsDecimal,
  processFile,
  getActiveDenominations
} from '../core/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.text());

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cash-register-api' });
});

/**
 * Get available currencies and their configurations
 */
app.get('/currencies', (req, res) => {
  try {
    const currencies = ['USD', 'EUR'];
    const configs = currencies.map(code => {
      const config = loadCurrencyConfig(code);
      return {
        code: config.code,
        name: config.name,
        denominations: getActiveDenominations(config).map(d => ({
          name: d.name,
          plural: d.plural,
          value: d.value
        }))
      };
    });
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get configuration for a specific currency
 */
app.get('/currencies/:code', (req, res) => {
  try {
    const config = loadCurrencyConfig(req.params.code.toUpperCase());
    res.json({
      code: config.code,
      name: config.name,
      random_divisor: config.random_divisor,
      use_pennies: config.use_pennies,
      use_half_dollars: config.use_half_dollars,
      denominations: getActiveDenominations(config).map(d => ({
        name: d.name,
        plural: d.plural,
        value: d.value
      }))
    });
  } catch (error) {
    res.status(404).json({ error: `Currency not found: ${req.params.code}` });
  }
});

/**
 * Calculate change for a single transaction
 *
 * POST /calculate
 * Body: { currency: "USD", owed: "12.34", paid: "20.00", options?: {...} }
 */
app.post('/calculate', (req, res) => {
  try {
    const { currency = 'USD', owed, paid, options = {} } = req.body;

    if (!owed || !paid) {
      return res.status(400).json({ error: 'Both "owed" and "paid" are required' });
    }

    const currencyConfig = loadCurrencyConfig(currency);
    const owedCents = parseToCents(owed);
    const paidCents = parseToCents(paid);

    const result = calculateChange(owedCents, paidCents, currencyConfig, options);

    res.json({
      currency,
      owed,
      paid,
      change: formatCentsAsDecimal(result.changeCents),
      changeCents: result.changeCents,
      breakdown: result.change,
      randomized: result.useRandom
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Process multiple transactions (batch mode)
 *
 * POST /batch
 * Body: { currency: "USD", transactions: ["12.34,20.00", "5.67,10.00"], options?: {...} }
 */
app.post('/batch', (req, res) => {
  try {
    const { currency = 'USD', transactions, options = {} } = req.body;

    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: '"transactions" array is required' });
    }

    // Build content like input file
    const content = `CURRENCY:${currency}\n${transactions.join('\n')}`;
    const result = processFile(content, options);

    res.json({
      currency: result.currency,
      hasRandomization: result.hasRandom,
      divisor: result.divisor,
      results: result.results
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Process raw input file content
 *
 * POST /process
 * Content-Type: text/plain
 * Body: Raw input file content
 */
app.post('/process', (req, res) => {
  try {
    // Get options from query params
    const options = {};
    if (req.query.divisor) options.random_divisor = parseInt(req.query.divisor, 10);
    if (req.query.noPennies === 'true') options.use_pennies = false;
    if (req.query.halfDollars === 'true') options.use_half_dollars = true;

    const content = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Request body must be plain text file content' });
    }

    const result = processFile(content, options);

    res.json({
      currency: result.currency,
      hasRandomization: result.hasRandom,
      divisor: result.divisor,
      results: result.results
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Cash Register API running on http://localhost:${PORT}`);
  console.log('\nEndpoints:');
  console.log('  GET  /health              - Health check');
  console.log('  GET  /currencies          - List available currencies');
  console.log('  GET  /currencies/:code    - Get currency configuration');
  console.log('  POST /calculate           - Calculate change for single transaction');
  console.log('  POST /batch               - Process multiple transactions');
  console.log('  POST /process             - Process raw input file content');
});
