# Test Callback URL Setup Guide

This guide shows you how to set up a test callback URL for the registration form.

## Option 1: Local Test Server (HTTP - for development only)

### Step 1: Start the Test Webhook Server

The project includes a test webhook server. Start it:

```bash
npm run test-client
```

Or for development with auto-reload:
```bash
npm run test-client:dev
```

This starts a server on **port 3001** that receives webhooks.

### Step 2: Use Localhost URL (HTTP only)

For local testing, you can use:
```
http://localhost:3001/webhook/facebook
```

**Note**: This only works for local testing. Facebook requires HTTPS for production webhooks, but for initial testing you can use HTTP.

## Option 2: HTTPS with ngrok (Recommended for Testing)

For a proper HTTPS callback URL that works with Facebook:

### Step 1: Install ngrok

Download from: https://ngrok.com/download

Or install via package manager:
```bash
# Windows (Chocolatey)
choco install ngrok

# Or download the executable
```

### Step 2: Start the Test Webhook Server

```bash
npm run test-client
```

### Step 3: Start ngrok Tunnel

In a new terminal:
```bash
ngrok http 3001
```

This will give you an HTTPS URL like:
```
https://abc123.ngrok.io
```

### Step 4: Use the ngrok URL in Registration Form

Use this as your callback URL:
```
https://abc123.ngrok.io/webhook/facebook
```

**Important**: 
- The ngrok URL changes each time you restart ngrok (unless you have a paid plan)
- Update your registration if you restart ngrok
- Make sure the test server is running on port 3001

## Option 3: Use Your Own Server

If you have your own server with HTTPS:

1. Deploy a webhook endpoint that accepts POST requests
2. Use your server's HTTPS URL as the callback URL
3. Example: `https://your-api.com/webhooks/facebook`

## Test Server Details

The test webhook server:
- **Port**: 3001 (configurable via `TEST_CLIENT_PORT` env var)
- **Endpoint**: `/webhook/facebook`
- **Secret Token**: `test-secret-token-12345` (configurable via `TEST_CLIENT_SECRET` env var)
- **Health Check**: `http://localhost:3001/health`

### What the Test Server Does

1. Receives webhook payloads from the Facebook Graph API Service
2. Verifies the signature (if secret token matches)
3. Logs all incoming webhooks to the console
4. Returns a 200 OK response

### Example Registration Form Values

When registering a new page, use:

- **Business/Page Name**: `Test Page`
- **Facebook Page ID**: `YOUR_PAGE_ID`
- **Callback URL**: 
  - Local: `http://localhost:3001/webhook/facebook`
  - ngrok: `https://your-ngrok-url.ngrok.io/webhook/facebook`
- **Verify Token**: `test-secret-token-12345` (or leave empty to auto-generate)

## Quick Start Commands

```bash
# Terminal 1: Start main service
npm start

# Terminal 2: Start test webhook server
npm run test-client

# Terminal 3: Start ngrok (if using HTTPS)
ngrok http 3001
```

Then register at: `http://localhost:3000/api/register`

## Verifying It Works

1. Register your page using the test callback URL
2. Complete the OAuth authorization
3. Subscribe the page to webhooks in Facebook Developer Console
4. Create a test post on your Facebook page
5. Check the test webhook server console - you should see the webhook payload

## Troubleshooting

### "Connection refused" or "Can't reach server"
- Make sure the test webhook server is running on port 3001
- Check that ngrok is running if using HTTPS
- Verify the callback URL is correct

### Webhooks not received
- Check that the page is subscribed to webhooks in Facebook Developer Console
- Verify the callback URL in your registration matches the test server endpoint
- Check the main service logs for forwarding errors

### Signature verification fails
- Make sure the verify token in registration matches `TEST_CLIENT_SECRET`
- Or use the auto-generated token from registration in your test server env

