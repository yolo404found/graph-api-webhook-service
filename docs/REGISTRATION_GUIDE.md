# Client Registration Guide

## Overview

This service now provides a web-based registration form that simplifies the client onboarding process. Clients can register their Facebook pages through a simple form, and the system will automatically handle the OAuth flow to generate access tokens.

## Registration Flow

### Step 1: Access Registration Form

Navigate to: `http://localhost:3000/api/register` (or your server URL)

### Step 2: Fill Out Registration Form

The form requires:
- **Business/Page Name**: Name of your business or Facebook page
- **Facebook Page ID**: Your Facebook Page ID (numeric, e.g., `104828644766419`)
- **Callback URL**: HTTPS endpoint where you want to receive webhooks (e.g., `https://your-api.com/webhooks/facebook`)
- **Verify Token** (Optional): 32-character token for webhook verification. If left empty, a random token will be auto-generated.

### Step 3: Submit Registration

After submitting the form:
1. The system creates a client configuration in MongoDB
2. An authorization URL is generated and displayed
3. Click the authorization link to grant Facebook permissions

### Step 4: Authorize Permissions

1. Click the authorization URL
2. Log in to Facebook (if not already logged in)
3. Grant the required permissions:
   - `pages_show_list` - List your pages
   - `pages_read_engagement` - Read page posts and engagement
   - `pages_read_user_content` - Read content posted by the user
   - `pages_manage_metadata` - Manage page metadata
4. Select your page (if you manage multiple pages)
5. You'll be redirected back automatically

### Step 5: Automatic Token Generation

The system automatically:
- Exchanges the authorization code for a User Access Token
- Retrieves your page's access token
- Saves everything to the database
- Displays a success message

## Important Notes

### App Connection to Page

**Yes, clients still need to add your Facebook App to their page** before the OAuth flow will work properly. However, the OAuth authorization process will handle granting the necessary permissions.

To add the app to a page:
1. Go to Facebook Page → Settings
2. Find "Apps" or "Connected Apps" section
3. Click "Add App" or "Connect App"
4. Search for your App ID (from `FB_APP_ID` environment variable)
5. Click "Add" or "Connect"

### Webhook Subscription

After registration and authorization, you (the service provider) still need to:
1. Go to Facebook Developer Console → Your App → Webhooks
2. Subscribe the client's page to webhook events
3. Select the webhook fields you want to receive (feed, messages, etc.)

### Environment Variables

Make sure these are set in your `.env` file:

```env
FB_APP_ID=your_facebook_app_id
FB_APP_SECRET=your_facebook_app_secret
FB_VERIFY_TOKEN=your_verify_token (optional, can be auto-generated)
BASE_URL=http://localhost:3000 (or your production URL)
MONGODB_URI=mongodb://localhost:27017/facebook-graph-api-service
```

**Important**: 
- The `BASE_URL` must match the URL configured in your Facebook App's OAuth redirect URIs
- The domain must be added to **App Domains** in Facebook App Settings
- See `FACEBOOK_APP_SETUP.md` for detailed configuration instructions

## API Endpoints

- `GET /api/register` - Registration form
- `POST /api/register` - Submit registration (JSON)
- `GET /api/auth/callback` - OAuth callback handler (used by Facebook)

## Database Schema

Client configurations are stored in MongoDB with the following structure:

```javascript
{
  businessName: String,
  facebook: {
    pageId: String (unique, indexed),
    appId: String,
    appSecret: String,
    verifyToken: String,
    accessToken: String (set after OAuth)
  },
  webhook: {
    callbackUrl: String,
    port: Number
  },
  features: {
    autoPostToTelegram: Boolean,
    logIncomingData: Boolean,
    keepRawPayloadDays: Number
  },
  registration: {
    status: 'pending' | 'authorized' | 'completed',
    authUrl: String,
    authorizedAt: Date,
    completedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Troubleshooting

### "Page already registered"
- The page ID is already in the database
- Check existing registrations or use a different page

### "Authorization Failed"
- Make sure the client has added your app to their page
- Check that `BASE_URL` matches Facebook App redirect URI settings
- Verify `FB_APP_ID` and `FB_APP_SECRET` are correct

### "Page not found in user's pages"
- The client didn't select the correct page during authorization
- The client doesn't have admin access to the page
- The page ID provided doesn't match any of the user's pages

### OAuth callback not working
- Ensure `BASE_URL` is correctly set and accessible
- Verify the redirect URI is added in Facebook App settings
- Check that the server is running and accessible from the internet (use ngrok for local testing)

## Local Development with ngrok

For local testing, use ngrok to expose your server:

```bash
ngrok http 3000
```

Then set `BASE_URL` to your ngrok URL:
```env
BASE_URL=https://your-ngrok-url.ngrok.io
```

And add the ngrok callback URL to Facebook App settings:
- `https://your-ngrok-url.ngrok.io/api/auth/callback`

