# MEXC API Documentation

## Authentication

All private endpoints require:
- `X-MEXC-APIKEY` header with API key
- `signature` parameter with HMAC SHA256 signature
- `timestamp` parameter (current time in milliseconds)

### Signature Generation

```python
import hmac
import hashlib

query_string = "symbol=BTCUSDT&side=BUY&type=MARKET&timestamp=1234567890"
signature = hmac.new(secret_key.encode(), query_string.encode(), hashlib.sha256).hexdigest()
```

## Key Endpoints

### Account Information
```
GET/POST /api/v3/account
```
Returns account status and all balances.

### Place Order
```
POST /api/v3/order
```

**Market Buy Parameters:**
- `symbol` (STRING) - Trading pair (e.g., "BTCUSDT")
- `side` (ENUM) - "BUY" or "SELL"
- `type` (ENUM) - "MARKET" for market orders
- `quoteOrderQty` (DECIMAL) - Amount in quote currency (USDT)
- `timestamp` (LONG) - Current timestamp in milliseconds
- `signature` (STRING) - HMAC SHA256 signature

**Response:**
```json
{
  "symbol": "BTCUSDT",
  "orderId": 12345,
  "orderListId": -1,
  "clientOrderId": "abc123",
  "transactTime": 1640995200000,
  "price": "0.00000000",
  "origQty": "0.00000000",
  "executedQty": "0.001",
  "cummulativeQuoteQty": "50.00",
  "status": "FILLED",
  "type": "MARKET",
  "side": "BUY"
}
```

## Error Codes

### API Errors
- `700013` - Invalid content type (use application/x-www-form-urlencoded)
- `700001` - Invalid API key format
- `700002` - Invalid signature
- `700003` - Request timestamp expired (>5 minutes)
- `700004` - IP not whitelisted
- `700005` - Invalid API key permissions

### Trading Errors
- `1001` - Insufficient balance
- `1002` - Trading pair not found
- `1003` - Order amount too small
- `1004` - Order amount too large
- `1005` - Market closed
- `1006` - Rate limit exceeded

### Balance Errors
- `2001` - Account frozen
- `2002` - Asset not supported
- `2003` - Withdrawal not enabled

## Rate Limits

- **General requests**: 1200 requests per minute
- **Order requests**: 100 orders per 10 seconds
- **Weight-based**: Heavy endpoints consume more weight

## Content Types

**IMPORTANT**: Use `application/x-www-form-urlencoded` for POST requests.

❌ Wrong:
```bash
curl -H "Content-Type: application/json" -d '{"symbol":"BTCUSDT"}'
```

✅ Correct:
```bash
curl -H "Content-Type: application/x-www-form-urlencoded" -d "symbol=BTCUSDT&side=BUY"
```

## Testing

Use testnet for development:
- Base URL: `https://api.mexcdemo.com`
- Same endpoints and parameters
- Test credentials required
- No real money involved

## Security Best Practices

1. **Never log API secrets** - Redact in error messages
2. **Validate all inputs** - Prevent injection attacks
3. **Use HTTPS only** - Never plain HTTP
4. **Check timestamps** - Prevent replay attacks
5. **Limit permissions** - Spot trading only, no withdrawal
6. **Monitor usage** - Track API calls and limits
7. **Rotate keys regularly** - Current expires 2026-05-19

## Troubleshooting

### Content-Type Issues
If getting "Invalid content Type" errors:
1. Check header: `Content-Type: application/x-www-form-urlencoded`
2. Ensure data is URL-encoded: `symbol=BTCUSDT&side=BUY`
3. Don't use JSON format for POST data

### Signature Issues
1. Ensure query string is exactly what gets signed
2. Use correct timestamp (milliseconds, not seconds)
3. Include all parameters in signature calculation
4. Check secret key is correct (no extra whitespace)

### Balance Issues
1. Check `free` balance, not `locked`
2. Account for fees (small buffer recommended)
3. Verify USDT specifically (not other stablecoins)