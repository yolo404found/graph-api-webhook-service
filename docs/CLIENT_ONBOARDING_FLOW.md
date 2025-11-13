# Facebook Graph API Service - Complete Client Onboarding Flow

## Overview
This document explains the complete flow from client signup to receiving webhooks, including all steps for permissions, app connection, and token generation.

---

## Complete Application Flow

### Phase 1: Client Registration & Initial Setup

#### Step 1: Client Provides Information
**Client provides:**
- Facebook Page ID
- Callback URL (HTTPS endpoint where they want to receive webhooks)
- (Optional) Secret Token for signature verification
- Business/Page Name

**Example:**
```
Page ID: 104828644766419
Callback URL: https://client-api.com/webhooks/facebook
Secret Token: client-secret-abc123
Business Name: Cool Music Enter
```

#### Step 2: Service Provider Creates Config File
**You create:** `configs/page_104828644766419.json`

```json
{
  "businessName": "Cool Music Enter",
  "facebook": {
    "pageId": "104828644766419",
    "appId": "808468275327880",
    "appSecret": "2dc396e2d53f9a170f5ef46ff4c1452b",
    "verifyToken": "aKd6OMTBDWSOd57AXluKh2Mmqi4dsUaJ",
    "accessToken": "YOUR_PAGE_ACCESS_TOKEN"  // Will be filled later
  },
  "webhook": {
    "callbackUrl": "https://client-api.com/webhooks/facebook",
    "port": 0
  },
  "features": {
    "autoPostToTelegram": false,
    "logIncomingData": true,
    "keepRawPayloadDays": 30
  }
}
```

**At this point:**
- ✅ Config file created
- ❌ App not connected to client's page
- ❌ No Page Access Token
- ❌ Webhooks not subscribed

---

### Phase 2: Client Connects App to Their Page

#### Step 3: Client Adds App to Their Page
**Client does:**
1. Go to their Facebook Page → Settings
2. Find "Apps" or "Connected Apps" section
3. Click "Add App" or "Connect App"
4. Search for App ID: `808468275327880` (or your app name)
5. Click "Add" or "Connect"
6. Grant basic permissions when prompted

**Result:**
- ✅ App is now connected to client's page
- ✅ Basic app connection established
- ❌ Still need to grant detailed permissions
- ❌ Still need Page Access Token for API operations

**Note:** At this stage, webhooks might work for basic events, but you may not have full access.

---

### Phase 3: Grant Permissions & Get Page Access Token

#### Step 4: Generate Authorization URL
**You run:**
```bash
node get-page-token.js 104828644766419
```

**Output:** Authorization URL to share with client

#### Step 5: Client Authorizes Permissions
**Client does:**
1. Clicks the authorization URL you provided
2. Logs in to Facebook (if not already)
3. Sees permission request screen:
   - ✅ pages_show_list (List your pages)
   - ✅ pages_read_engagement (Read page posts and engagement)
   - ✅ pages_read_user_content (Read content posted by the user)
   - ✅ pages_manage_metadata (Manage page metadata)
4. Clicks "Continue" or "Allow"
5. Selects their page (if they manage multiple)
6. Grants page-specific permissions
7. Gets redirected to your callback URL with authorization code

**Result:**
- ✅ Client granted all required permissions
- ✅ Authorization code received
- ❌ Still need to exchange code for token

#### Step 6: Exchange Code for Page Access Token
**You run:**
```bash
node exchange-code.js <AUTHORIZATION_CODE> 104828644766419
```

**What happens:**
1. Exchanges authorization code for User Access Token
2. Gets list of pages the user manages
3. Finds the specific page (104828644766419)
4. Extracts Page Access Token
5. **Automatically saves to config file**

**Result:**
- ✅ Page Access Token obtained
- ✅ Token saved to `configs/page_104828644766419.json`
- ✅ Can now make API calls on behalf of the page

---

### Phase 4: Subscribe to Webhooks

#### Step 7: Subscribe Page to Webhooks
**You do (in Facebook Developer Console):**
1. Go to: https://developers.facebook.com/apps/808468275327880/webhooks/
2. Click "Page" webhook → "Manage Subscriptions"
3. Click "Add Page" or "Subscribe"
4. Select client's page from the list
5. Select webhook fields to subscribe:
   - `feed` - New posts, comments, likes
   - `messages` - Direct messages
   - `messaging_postbacks` - Postback button clicks
   - `messaging_optins` - Opt-in events
   - `messaging_referrals` - Referral events
   - Others as needed
6. Click "Save"

**Result:**
- ✅ Page subscribed to webhook events
- ✅ Facebook will send webhooks for selected events
- ✅ Your service will receive and forward them

---

### Phase 5: Verification & Testing

#### Step 8: Verify Page Access Token
**You run:**
```bash
node get-page-info.js 104828644766419
```

**Verifies:**
- ✅ Page Access Token is valid
- ✅ Can access page information
- ✅ Permissions are working

#### Step 9: Test Webhook Flow
**Client does:**
1. Creates a test post on their Facebook Page

**You check:**
1. Main service logs (port 6000) - Should see webhook received
2. Client callback URL - Should receive forwarded payload
3. Delivery logs in MongoDB - Should show successful delivery

**Result:**
- ✅ Webhook received from Facebook
- ✅ Webhook forwarded to client's callback URL
- ✅ Complete flow working

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Client Registration                                    │
├─────────────────────────────────────────────────────────────────┤
│ Client provides:                                                │
│   • Page ID                                                     │
│   • Callback URL                                                │
│   • Secret Token (optional)                                     │
│                                                                 │
│ You create: configs/page_XXX.json                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: App Connection                                         │
├─────────────────────────────────────────────────────────────────┤
│ Client:                                                         │
│   1. Goes to Page Settings → Apps                               │
│   2. Adds your app (ID: 808468275327880)                       │
│   3. Grants basic permissions                                   │
│                                                                 │
│ Result: App connected to page                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: Permissions & Token                                    │
├─────────────────────────────────────────────────────────────────┤
│ You:                                                            │
│   • Generate auth URL: node get-page-token.js <PAGE_ID>        │
│                                                                 │
│ Client:                                                         │
│   • Clicks auth URL                                             │
│   • Grants permissions (pages_read_engagement, etc.)            │
│   • Gets redirected with authorization code                     │
│                                                                 │
│ You:                                                            │
│   • Exchange code: node exchange-code.js <CODE> <PAGE_ID>     │
│   • Token automatically saved to config file                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: Webhook Subscription                                   │
├─────────────────────────────────────────────────────────────────┤
│ You (in Facebook Developer Console):                           │
│   1. Go to Webhooks → Page → Manage Subscriptions              │
│   2. Add client's page                                          │
│   3. Select webhook fields (feed, messages, etc.)               │
│   4. Save                                                       │
│                                                                 │
│ Result: Page subscribed to webhook events                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 5: Verification & Testing                                 │
├─────────────────────────────────────────────────────────────────┤
│ You:                                                            │
│   • Verify token: node get-page-info.js <PAGE_ID>              │
│                                                                 │
│ Client:                                                         │
│   • Creates test post on page                                  │
│                                                                 │
│ You:                                                            │
│   • Check service logs                                          │
│   • Verify webhook forwarded to client callback                │
│                                                                 │
│ Result: Complete flow working! ✅                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference Checklist

### For Each New Client:

**Client Provides:**
- [ ] Facebook Page ID
- [ ] Callback URL (HTTPS)
- [ ] (Optional) Secret Token

**You Do:**
- [ ] Create config file: `configs/page_XXX.json`
- [ ] Share app connection instructions with client
- [ ] Client adds app to their page
- [ ] Generate auth URL: `node get-page-token.js <PAGE_ID>`
- [ ] Client authorizes and grants permissions
- [ ] Exchange code for token: `node exchange-code.js <CODE> <PAGE_ID>`
- [ ] Subscribe page to webhooks in Developer Console
- [ ] Test webhook flow
- [ ] Verify everything works

---

## Important Notes

### Webhook Forwarding vs API Operations

**Webhook Forwarding (No Token Needed):**
- Facebook sends webhooks → Your service → Client callback
- Works automatically once page is subscribed
- No Page Access Token required

**API Operations (Token Required):**
- Reading posts via API
- Posting to page via API
- Getting page insights
- Managing page content
- **Requires Page Access Token**

### Token Types

1. **App Access Token** (You have this)
   - Format: `APP_ID|APP_SECRET`
   - Used for: App-level operations, public page info
   - Already configured in your service

2. **Page Access Token** (Per client)
   - Format: Long-lived token from user authorization
   - Used for: Page-specific API operations
   - Stored in: `configs/page_XXX.json`

3. **User Access Token** (Temporary)
   - Used during authorization flow
   - Exchanged for Page Access Token
   - Not stored permanently

---

## Troubleshooting

### Client can't add app to page
- Check: Client is Page Admin (not just Editor)
- Check: App is in Live mode
- Check: App ID is correct

### Authorization fails
- Check: Redirect URI matches in app settings
- Check: Authorization code not expired (use quickly)
- Check: Client granted all required permissions

### Webhooks not received
- Check: Page subscribed to webhooks in Developer Console
- Check: Webhook fields selected
- Check: Your service is running and accessible
- Check: ngrok tunnel is active (if testing locally)

### Token invalid
- Check: Token not expired
- Check: Client didn't revoke permissions
- Check: Page still connected to app
- Solution: Re-run authorization flow

---

## Summary

**Minimum Required Steps:**
1. Client provides Page ID + Callback URL
2. You create config file
3. Client adds app to page
4. You subscribe page to webhooks
5. ✅ Webhooks start flowing!

**For Full API Access:**
6. Generate auth URL for client
7. Client authorizes
8. Exchange code for Page Access Token
9. ✅ Can now make API calls!

