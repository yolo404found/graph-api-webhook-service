# Understanding OAuth Redirect URI vs Webhook Callback URL

## Two Different URLs

There are **two different URLs** used in the registration system:

### 1. OAuth Redirect URI (for Facebook Login)
- **Purpose**: Where Facebook redirects users after they authorize permissions
- **Generated from**: `BASE_URL` environment variable
- **Format**: `${BASE_URL}/api/auth/callback`
- **Must be in**: Facebook App → Valid OAuth Redirect URIs

### 2. Webhook Callback URL (for receiving webhooks)
- **Purpose**: Where your service forwards Facebook webhook events
- **Set by**: Client during registration (the "Callback URL" field in the form)
- **Format**: Any HTTP/HTTPS URL (e.g., `http://localhost:3001/webhook/facebook`)
- **NOT in**: Facebook OAuth settings (this is separate)

## Your Current Setup

Based on your error, here's what's happening:

### ❌ Current Problem:
- **BASE_URL in .env**: Probably `http://localhost:3000`
- **OAuth Redirect URI generated**: `http://localhost:3000/api/auth/callback`
- **Facebook whitelist**: `https://coercibly-noumenal-marvel.ngrok-free.dev/api/auth/callback`
- **Mismatch!** Facebook is trying to redirect to `localhost:3000` but it's not whitelisted

### ✅ Solution:

**Step 1: Update your `.env` file**

Set `BASE_URL` to your ngrok URL:
```env
BASE_URL=https://coercibly-noumenal-marvel.ngrok-free.dev
```

**Step 2: Restart your server**

After changing `.env`, restart:
```bash
npm start
```

**Step 3: Verify Facebook App Settings**

Make sure these are set in Facebook:

**App Domains:**
```
coercibly-noumenal-marvel.ngrok-free.dev
```

**Valid OAuth Redirect URIs:**
```
https://coercibly-noumenal-marvel.ngrok-free.dev/api/auth/callback
```

## Complete Example

### Environment Variables (`.env`):
```env
FB_APP_ID=your_app_id
FB_APP_SECRET=your_app_secret
BASE_URL=https://coercibly-noumenal-marvel.ngrok-free.dev
MONGODB_URI=mongodb://localhost:27017/facebook-graph-api-service
```

### Registration Form:
- **Business Name**: Test Business
- **Page ID**: 123456789
- **Callback URL**: `http://localhost:3001/webhook/facebook` ← This is for webhooks, not OAuth!
- **Verify Token**: (optional)

### What Happens:

1. **Registration**: Client submits form with webhook callback URL
2. **OAuth Flow**: System generates auth URL using `BASE_URL` → `https://coercibly-noumenal-marvel.ngrok-free.dev/api/auth/callback`
3. **Facebook Redirect**: After authorization, Facebook redirects to the ngrok URL (OAuth redirect)
4. **Token Exchange**: System exchanges code for token
5. **Webhook Forwarding**: Later, when webhooks arrive, they're forwarded to the client's callback URL (`localhost:3001`)

## Key Points

✅ **OAuth Redirect URI** = `${BASE_URL}/api/auth/callback` (must match Facebook whitelist)
✅ **Webhook Callback URL** = Client's choice (can be localhost, ngrok, or production URL)
✅ **BASE_URL** must be accessible from the internet (use ngrok for local dev)
✅ **Webhook Callback URL** can be localhost (only needs to be accessible by your service)

## Quick Checklist

- [ ] `BASE_URL` in `.env` matches your ngrok URL
- [ ] Facebook App Domains includes your ngrok domain
- [ ] Facebook Valid OAuth Redirect URIs includes `${BASE_URL}/api/auth/callback`
- [ ] Server restarted after changing `.env`
- [ ] ngrok is running and accessible

## Common Mistakes

❌ **Wrong**: Setting `BASE_URL=http://localhost:3000` when using ngrok
✅ **Correct**: Setting `BASE_URL=https://coercibly-noumenal-marvel.ngrok-free.dev`

❌ **Wrong**: Adding webhook callback URL to Facebook OAuth settings
✅ **Correct**: Only OAuth redirect URI needs to be in Facebook settings

❌ **Wrong**: Using `localhost` in BASE_URL when Facebook needs to redirect to it
✅ **Correct**: Use ngrok URL in BASE_URL so Facebook can reach it

