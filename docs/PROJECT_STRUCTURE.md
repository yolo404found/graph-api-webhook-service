# Project Structure

This document describes the organization of the Facebook Graph API Service project.

## Directory Structure

```
facebook-graph-api-service/
├── docs/                    # Documentation files
│   ├── CLIENT_ONBOARDING_FLOW.md
│   ├── FACEBOOK_APP_SETUP.md
│   ├── OAUTH_VS_WEBHOOK_URLS.md
│   ├── REGISTRATION_GUIDE.md
│   ├── TEST_CALLBACK_SETUP.md
│   └── TESTING_GUIDE.md
├── scripts/                 # Utility scripts (legacy/optional)
│   ├── check-subscribed-apps.js
│   ├── exchange-code.js
│   ├── generate-page-token.js
│   ├── get-page-info.js
│   └── get-page-token.js
├── src/                     # Main application source code
│   ├── config/
│   │   └── index.js         # Service configuration
│   ├── models/              # MongoDB models
│   │   ├── ClientConfig.js  # Client registration model
│   │   └── DeliveryLog.js   # Webhook delivery logs
│   ├── routes/              # Express routes
│   │   ├── auth.js          # OAuth callback handler
│   │   ├── registration.js  # Client registration form & API
│   │   └── webhook.js       # Facebook webhook handler
│   ├── services/           # Business logic services
│   │   ├── forwarder.js    # Webhook forwarding service
│   │   ├── oauth.js        # OAuth flow service
│   │   └── retryQueue.js   # Retry queue for failed deliveries
│   ├── utils/              # Utility functions
│   │   ├── logger.js        # Logging utility
│   │   └── signature.js    # HMAC signature utilities
│   └── server.js           # Main application entry point
├── test/                    # Test files and utilities
│   ├── test.js              # Test API routes (status, webhook simulation)
│   ├── test-client-webhook-server.js  # Test webhook receiver
│   └── test-webhook.js     # Webhook verification test script
├── .env                     # Environment variables (create this)
├── package.json
├── package-lock.json
└── README.md
```

## Key Components

### Source Code (`src/`)

- **`server.js`**: Main application entry point, sets up Express server, MongoDB connection, and routes
- **`config/index.js`**: Centralized configuration loaded from environment variables
- **`models/`**: Mongoose schemas for MongoDB collections
  - `ClientConfig`: Stores client registrations (page IDs, tokens, callback URLs)
  - `DeliveryLog`: Logs webhook delivery attempts and results
- **`routes/`**: Express route handlers
  - `webhook.js`: Handles Facebook webhook verification and incoming events
  - `registration.js`: Web-based client registration form and API
  - `auth.js`: OAuth callback handler for Facebook authorization
- **`services/`**: Business logic services
  - `forwarder.js`: Forwards webhooks to client callback URLs with retries
  - `oauth.js`: Handles Facebook OAuth flow (authorization, token exchange)
  - `retryQueue.js`: Manages retry logic for failed webhook deliveries
- **`utils/`**: Shared utility functions
  - `logger.js`: Structured logging using Pino
  - `signature.js`: HMAC signature generation and verification

### Documentation (`docs/`)

- **`REGISTRATION_GUIDE.md`**: How to use the client registration system
- **`FACEBOOK_APP_SETUP.md`**: Facebook App configuration instructions
- **`TESTING_GUIDE.md`**: How to test client registration and webhooks
- **`CLIENT_ONBOARDING_FLOW.md`**: Complete onboarding flow documentation
- **`OAUTH_VS_WEBHOOK_URLS.md`**: Explanation of OAuth vs webhook URLs
- **`TEST_CALLBACK_SETUP.md`**: Setting up test callback URLs

### Test Files (`test/`)

- **`test.js`**: Express router with test endpoints (`/api/test/status/:pageId`, `/api/test/webhook/:pageId`)
- **`test-client-webhook-server.js`**: Standalone server that receives forwarded webhooks for testing
- **`test-webhook.js`**: Script to test Facebook webhook verification

### Scripts (`scripts/`)

Legacy utility scripts (optional, for manual operations):
- **`get-page-token.js`**: Generate OAuth authorization URL
- **`exchange-code.js`**: Exchange OAuth code for access token
- **`get-page-info.js`**: Verify page access token
- **`generate-page-token.js`**: Alternative token generation script
- **`check-subscribed-apps.js`**: Check subscribed apps

**Note**: These scripts are legacy. The web-based registration system (`/api/register`) handles all of this automatically.

## Data Storage

All client configurations are stored in **MongoDB**. The `configs/` folder has been removed as it's no longer needed.

### MongoDB Collections

- **`client_configs`**: Client registrations (page IDs, tokens, callback URLs, registration status)
- **`delivery_logs`**: Webhook delivery attempt logs

## Environment Variables

Create a `.env` file in the project root with:

```env
PORT=3000
BASE_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/facebook-graph-api-service
FB_APP_ID=your_facebook_app_id
FB_APP_SECRET=your_facebook_app_secret
FB_VERIFY_TOKEN=your_verify_token
NODE_ENV=development
```

## Running the Service

```bash
# Install dependencies
npm install

# Start the service
npm start

# Development mode (with auto-reload)
npm run dev

# Start test webhook server
npm run test-client
```

## API Endpoints

- `GET /` - Service info
- `GET /health` - Health check
- `GET /api/register` - Registration form
- `POST /api/register` - Register client
- `GET /api/auth/callback` - OAuth callback
- `GET /api/test/status/:pageId` - Check registration status
- `POST /api/test/webhook/:pageId` - Simulate webhook
- `GET /webhook/facebook` - Facebook webhook verification
- `POST /webhook/facebook` - Facebook webhook events

## Migration from Config Files

If you were using the old `configs/` folder system:

1. All client configurations are now stored in MongoDB
2. Use the web registration form at `/api/register` to register clients
3. The old config files are no longer used or needed
4. Legacy scripts in `scripts/` folder are optional and for reference only

