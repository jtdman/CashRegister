# Cash Register API

REST API server for Cash Register change calculations. This API wraps the core calculation logic and provides HTTP endpoints for multi-language client support.

## Setup

```bash
cd api
npm install
npm start
```

The server runs on port 3000 by default (configurable via `PORT` environment variable).

## Endpoints

### Health Check

```
GET /health
```

Returns: `{ "status": "ok", "service": "cash-register-api" }`

### List Currencies

```
GET /currencies
```

Returns array of available currencies with their denominations.

### Get Currency Configuration

```
GET /currencies/:code
```

Example: `GET /currencies/USD`

Returns configuration for a specific currency including denominations and settings.

### Calculate Single Transaction

```
POST /calculate
Content-Type: application/json

{
  "currency": "USD",
  "owed": "12.34",
  "paid": "20.00",
  "options": {
    "random_divisor": 5,
    "use_pennies": false,
    "use_half_dollars": true
  }
}
```

Returns:
```json
{
  "currency": "USD",
  "owed": "12.34",
  "paid": "20.00",
  "change": "7.66",
  "changeCents": 766,
  "breakdown": "1 five, 2 dollars, 2 quarters, 1 dime, 1 nickel, 1 penny",
  "randomized": false
}
```

### Batch Process Transactions

```
POST /batch
Content-Type: application/json

{
  "currency": "USD",
  "transactions": [
    "12.34,20.00",
    "5.67,10.00"
  ],
  "options": {}
}
```

Returns:
```json
{
  "currency": "USD",
  "hasRandomization": false,
  "results": [
    "12.34, 20.00, 7.66: 1 five, 2 dollars, 2 quarters, 1 dime, 1 nickel, 1 penny",
    "5.67, 10.00, 4.33: 4 dollars, 1 quarter, 1 nickel, 3 pennies"
  ]
}
```

### Process Raw Input File

```
POST /process?divisor=5&noPennies=true
Content-Type: text/plain

CURRENCY:USD
12.34,20.00
5.67,10.00
```

Query parameters:
- `divisor` - Override random divisor
- `noPennies` - Set to "true" to disable pennies (Swedish rounding)
- `halfDollars` - Set to "true" to enable half dollar coins

Returns same format as batch endpoint.

## Examples

### Using curl

```bash
# Health check
curl http://localhost:3000/health

# Get USD configuration
curl http://localhost:3000/currencies/USD

# Single transaction
curl -X POST http://localhost:3000/calculate \
  -H "Content-Type: application/json" \
  -d '{"currency":"USD","owed":"12.34","paid":"20.00"}'

# Batch transactions
curl -X POST http://localhost:3000/batch \
  -H "Content-Type: application/json" \
  -d '{"currency":"USD","transactions":["12.34,20.00","5.67,10.00"]}'

# Process file content
curl -X POST http://localhost:3000/process \
  -H "Content-Type: text/plain" \
  -d $'CURRENCY:USD\n12.34,20.00\n5.67,10.00'
```

### Using Python

```python
import requests

# Single transaction
response = requests.post('http://localhost:3000/calculate', json={
    'currency': 'USD',
    'owed': '12.34',
    'paid': '20.00'
})
print(response.json())
```

### Using JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:3000/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    currency: 'USD',
    owed: '12.34',
    paid: '20.00'
  })
});
const result = await response.json();
console.log(result);
```
