## Facebook Graph API Service

Multi-tenant webhook processing system that receives Facebook Page updates and forwards them to per-client callback endpoints with isolation, authentication, and retries.

### Service Overview
- **Single Facebook App, multi-tenant delivery**: One central app receives webhooks for many pages.
- **Page-based routing**: Each incoming webhook is routed by `pageId` to the correct client callback URL.
- **Security**: HMAC signatures on outgoing deliveries, HTTPS required on client endpoints, encrypted config at rest (DB responsibility).
- **Reliability**: Immediate 200 ack to Facebook, async forwarding with retries and delivery logs.
- **Scalable**: Stateless processing, horizontally scalable.

### Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and fill in your values:
     - `FB_APP_ID`, `FB_APP_SECRET`, `FB_VERIFY_TOKEN` (from Facebook Developer Console)
     - `BASE_URL` (your server URL, e.g., `http://localhost:3000` or ngrok URL for OAuth)
     - `MONGODB_URI` (default: `mongodb://localhost:27017/facebook-graph-api-service`)
     - Other optional settings (see `.env.example` for details)
3. Start MongoDB (if running locally)
4. Run the service:
   ```bash
   npm start
   ```
5. Register clients via the web interface:
   - Visit `http://localhost:3000/api/register`
   - Fill out the registration form
   - Complete OAuth flow to generate access tokens

### Endpoints
- `GET /health` — Health check
- `GET /api/register` — Client registration form
- `POST /api/register` — Register a new client
- `GET /api/auth/callback` — OAuth callback handler
- `GET /api/test/status/:pageId` — Check registration status
- `POST /api/test/webhook/:pageId` — Simulate webhook for testing
- `GET /webhook/facebook` — Facebook verification:
  - FB calls with `hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>`
  - Service responds with `challenge` if `FB_VERIFY_TOKEN` matches.
- `POST /webhook/facebook` — Incoming Facebook webhook events:
  - Service immediately responds `200` to Facebook.
  - Extracts `pageId` from payload (`entry[0].id` preferred).
  - Loads tenant config from MongoDB database.
  - Forwards raw JSON to tenant `webhook.callbackUrl` with headers:
    - `X-Service-Signature: sha256=<hmac>` (HMAC using tenant secret)
    - `X-Service-Request-Id: <uuid>`
    - `X-Facebook-Page-Id: <pageId>`
  - Retries on 5xx/network errors with exponential backoff.

### Headers and Auth
- Outbound deliveries include `X-Service-Signature` computed over the raw JSON body using tenant secret (`facebook.appSecret` preferred).
- Clients should verify this HMAC and return `200` within 5 seconds.

### Data Model
- `ClientConfig` (`src/models/ClientConfig.js`)
  - Stores `facebook.pageId`, credentials, tenant `webhook.callbackUrl`, and feature flags.
- `DeliveryLog` (`src/models/DeliveryLog.js`)
  - Records per-attempt delivery outcomes, status codes, latency, and request IDs.

### Operational Settings
Configure via env vars:
- `PORT` (default `3000`)
- `BASE_URL` (your server URL, required for OAuth)
- `MONGODB_URI` (default `mongodb://localhost:27017/facebook-graph-api-service`)
- `FB_APP_ID`, `FB_APP_SECRET`, `FB_VERIFY_TOKEN`
- `FORWARD_TIMEOUT_MS` (default `4500`)
- `MAX_RETRY_ATTEMPTS` (default `5`)
- `RETRY_BACKOFF_BASE_MS` (default `1000`)
- `NODE_ENV` (default `development`)

### Security Notes
- Require HTTPS on client callback endpoints.
- Rotate Facebook credentials per policy.
- Store secrets securely in your secret manager; environment variables are for local dev.

### Client Registration
Clients are registered via the web interface at `/api/register`. All client configurations are stored in MongoDB. See `docs/REGISTRATION_GUIDE.md` for detailed instructions.

### Reference package.json
The service aligns with the reference shown by the user; this project uses:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.3",
    "axios": "^1.6.2",
    "dotenv": "^16.3.1",
    "express-rate-limit": "^7.1.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### Notes
- Horizontal scaling: all state is externalized (MongoDB) and processing is stateless.
- Geographic distribution: deploy multiple instances behind a global load balancer; keep MongoDB reachable.


