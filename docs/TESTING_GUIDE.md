# Testing Client Registration Guide

This guide shows you how to test if client registration is working correctly.

## Prerequisites

1. **Register a client page** at `http://localhost:3000/api/register`
2. **Complete OAuth flow** (get access token)
3. **Start test webhook server** (to receive forwarded webhooks):
   ```bash
   npm run test-client
   ```

## Test Endpoints

### 1. Check Registration Status

**GET** `/api/test/status/:pageId`

Check if a page is registered and get its details.

**Example:**
```bash
curl http://localhost:3000/api/test/status/104828644766419
```

**Response (if registered):**
```json
{
  "registered": true,
  "pageId": "104828644766419",
  "businessName": "Test Business",
  "callbackUrl": "http://localhost:3001/webhook/facebook",
  "registrationStatus": "completed",
  "hasAccessToken": true,
  "authorizedAt": "2024-01-01T12:00:00.000Z",
  "completedAt": "2024-01-01T12:00:00.000Z"
}
```

**Response (if not registered):**
```json
{
  "registered": false,
  "message": "Page 104828644766419 is not registered",
  "hint": "Register at /api/register"
}
```

### 2. Simulate Webhook (Test Forwarding)

**POST** `/api/test/webhook/:pageId`

Simulates a Facebook webhook for a new post and tests if it's forwarded to the client's callback URL.

**Example:**
```bash
curl -X POST http://localhost:3000/api/test/webhook/104828644766419
```

**Response (success):**
```json
{
  "success": true,
  "message": "Test webhook sent successfully",
  "pageId": "104828644766419",
  "clientName": "Test Business",
  "callbackUrl": "http://localhost:3001/webhook/facebook",
  "requestId": "test-1234567890",
  "forwardResult": {
    "statusCode": 200,
    "latencyMs": 45,
    "success": true
  },
  "webhookPayload": {
    "object": "page",
    "entry": [...]
  }
}
```

**Response (if not registered):**
```json
{
  "error": "Client not found",
  "message": "No registration found for page ID: 104828644766419",
  "hint": "Register this page first at /api/register"
}
```

## Complete Testing Flow

### Step 1: Register a Client

1. Go to `http://localhost:3000/api/register`
2. Fill out the form:
   - **Business Name**: Test Business
   - **Page ID**: `104828644766419`
   - **Callback URL**: `http://localhost:3001/webhook/facebook`
   - **Verify Token**: (optional, or use `test-secret-token-12345`)
3. Submit and complete OAuth flow

### Step 2: Start Test Webhook Server

In a separate terminal:
```bash
npm run test-client
```

This starts a server on port 3001 that will receive forwarded webhooks.

### Step 3: Check Registration Status

```bash
curl http://localhost:3000/api/test/status/104828644766419
```

Verify:
- `registered: true`
- `hasAccessToken: true`
- `registrationStatus: "completed"`

### Step 4: Test Webhook Forwarding

```bash
curl -X POST http://localhost:3000/api/test/webhook/104828644766419
```

**Expected Results:**

1. **Main Service** (port 3000):
   - Should log: "Simulating webhook for test"
   - Should return success response

2. **Test Webhook Server** (port 3001):
   - Should receive the webhook
   - Should log the full payload
   - Should show signature verification status

3. **Response**:
   - `success: true`
   - `forwardResult.statusCode: 200`
   - `forwardResult.success: true`

### Step 5: Verify Webhook Received

Check the test webhook server console. You should see:
```
================================================================================
[2024-01-01T12:00:00.000Z] Webhook Received
================================================================================
Headers:
  X-Service-Signature: sha256=...
  X-Service-Request-Id: test-1234567890
  X-Facebook-Page-Id: 104828644766419
  Signature Valid: ✓ YES

Payload:
{
  "object": "page",
  "entry": [...]
}
================================================================================
```

## Testing with PowerShell

### Check Status:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/test/status/104828644766419" -Method GET
```

### Test Webhook:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/test/webhook/104828644766419" -Method POST
```

## Testing with Browser

### Check Status:
Open in browser:
```
http://localhost:3000/api/test/status/104828644766419
```

### Test Webhook:
Use a tool like Postman, or use PowerShell/curl as shown above.

## Troubleshooting

### "Client not found"
- Make sure you registered the page first
- Check that the page ID is correct
- Verify the registration completed successfully

### "Test webhook forwarding failed"
- Check that the test webhook server is running on port 3001
- Verify the callback URL in registration matches the test server
- Check server logs for detailed error messages

### Webhook not received at test server
- Make sure test webhook server is running: `npm run test-client`
- Verify callback URL is correct: `http://localhost:3001/webhook/facebook`
- Check network connectivity between services

### Signature verification fails
- Make sure verify token in registration matches test server's `TEST_CLIENT_SECRET`
- Default test server secret: `test-secret-token-12345`
- Or use the auto-generated token from registration

## What Gets Tested

✅ Client registration in database
✅ OAuth token generation
✅ Webhook payload processing
✅ Client config lookup
✅ Webhook forwarding to callback URL
✅ Signature generation
✅ Request/response handling

## Next Steps

After testing with simulated webhooks:

1. **Subscribe page to real webhooks** in Facebook Developer Console
2. **Create a real post** on your Facebook page
3. **Verify real webhooks** are received and forwarded

The test endpoint simulates the exact same flow as real Facebook webhooks, so if tests pass, real webhooks should work too!

