# Facebook App Configuration Guide

This guide helps you configure your Facebook App to work with the registration system.

## The Error

If you see: **"The domain of this URL isn't included in the app's domains"**

This means Facebook needs the domain of your redirect URI to be configured in your App settings.

## Step-by-Step Fix

### Step 1: Go to Facebook App Settings

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Select your app
3. Go to **Settings** → **Basic**

### Step 2: Add App Domains

In the **App Domains** field, add:

**For Local Development:**
```
localhost
```

**For Production/ngrok:**
```
your-domain.com
```
or
```
abc123.ngrok.io
```

**Note:** 
- Don't include `http://` or `https://`
- Don't include the port number
- Just the domain name (e.g., `localhost`, not `localhost:3000`)

### Step 3: Add Valid OAuth Redirect URIs

Scroll down to **Facebook Login** → **Settings** (or find **Valid OAuth Redirect URIs**)

Add your callback URLs:

**For Local Development:**
```
http://localhost:3000/api/auth/callback
```

**For Production/ngrok:**
```
https://your-domain.com/api/auth/callback
```
or
```
https://abc123.ngrok.io/api/auth/callback
```

**Important:** 
- Include the full URL with protocol (`http://` or `https://`)
- Include the port if using localhost
- Include the full path (`/api/auth/callback`)

### Step 4: Save Changes

Click **Save Changes** at the bottom of the page.

### Step 5: Wait a Few Minutes

Facebook may take 1-2 minutes to propagate the changes. Wait a bit and try again.

## Complete Configuration Example

### For Local Development:

**App Domains:**
```
localhost
```

**Valid OAuth Redirect URIs:**
```
http://localhost:3000/api/auth/callback
```

### For ngrok:

**App Domains:**
```
abc123.ngrok.io
```

**Valid OAuth Redirect URIs:**
```
https://abc123.ngrok.io/api/auth/callback
```

**Note:** If you restart ngrok, you'll get a new URL and need to update both fields.

### For Production:

**App Domains:**
```
yourdomain.com
www.yourdomain.com
```

**Valid OAuth Redirect URIs:**
```
https://yourdomain.com/api/auth/callback
https://www.yourdomain.com/api/auth/callback
```

## Environment Variable

Make sure your `.env` file has the correct `BASE_URL`:

**⚠️ IMPORTANT**: `BASE_URL` is used for the **OAuth redirect URI**, NOT the webhook callback URL!

**For Local (without ngrok - may not work with Facebook):**
```env
BASE_URL=http://localhost:3000
```

**For ngrok (Recommended for local development):**
```env
BASE_URL=https://coercibly-noumenal-marvel.ngrok-free.dev
```
(Use YOUR ngrok URL, not this example)

**For Production:**
```env
BASE_URL=https://yourdomain.com
```

**Note**: The webhook callback URL (set during registration) is separate and can be `localhost` or any URL. Only the OAuth redirect URI (from `BASE_URL`) needs to be in Facebook settings.

## Troubleshooting

### Still Getting the Error?

1. **Double-check the exact URL:**
   - Go to your registration form
   - Click the authorization link
   - Check the URL in the browser address bar
   - Make sure that exact domain is in App Domains
   - Make sure that exact full URL is in Valid OAuth Redirect URIs

2. **Check for typos:**
   - No trailing slashes in App Domains
   - Exact match in redirect URIs (including protocol and port)

3. **Wait a few minutes:**
   - Facebook may cache settings
   - Try again after 2-3 minutes

4. **Check App Status:**
   - Make sure your app is not in "Development Mode" restrictions
   - Or add yourself as a test user if in Development Mode

5. **Clear browser cache:**
   - Sometimes browser cache can cause issues
   - Try incognito/private mode

### Common Mistakes

❌ **Wrong:**
- App Domains: `http://localhost:3000` (includes protocol)
- App Domains: `localhost:3000` (includes port)
- Redirect URI: `localhost:3000/api/auth/callback` (missing protocol)

✅ **Correct:**
- App Domains: `localhost`
- Redirect URI: `http://localhost:3000/api/auth/callback`

## Quick Checklist

- [ ] App Domains field contains just the domain (no protocol, no port)
- [ ] Valid OAuth Redirect URIs contains the full URL (with protocol, port if localhost, and path)
- [ ] BASE_URL in .env matches your setup
- [ ] Saved changes in Facebook App settings
- [ ] Waited 1-2 minutes for changes to propagate
- [ ] Tried the authorization flow again

## Still Having Issues?

If you're still having problems:

1. Check the exact error message - it will tell you which domain is missing
2. Verify your `BASE_URL` environment variable matches your Facebook App settings
3. Make sure you're using the same URL in both places

