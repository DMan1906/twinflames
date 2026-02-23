# Critical Issues & Fixes

## Issue 1: Gemini API Key Invalid (All Models Returning 404)

### The Problem
Every Google Gemini model is returning 404, which means your API key is either:
- Invalid or expired
- The API service isn't enabled in Google Cloud
- The key doesn't have permission

### Fix Steps:

1. **Verify API Key is Valid:**
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Check if your current key exists and is active
   - If the page says "Create a new API key", create one
   - Copy the NEW key

2. **Enable Gemini API in Google Cloud (if needed):**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your project
   - Go to APIs & Services → API Library
   - Search for "Generative Language API"
   - Click "ENABLE"

3. **Update Dokploy Environment Variable:**
   - In Dokploy project settings
   - Find `GEMINI_API_KEY`
   - Replace with your NEW key from step 1
   - Redeploy

4. **Test Locally:**
   ```bash
   export GEMINI_API_KEY="your-new-key-here"
   npm run dev
   # Try using an AI feature (like Dates page)
   ```

---

## Issue 2: WebSocket Connection Failing (CORS)

### The Problem  
WebSocket to `wss://appwrite.voidparadox.site/realtime` is failing because of CORS restrictions.

**You mentioned there's no "Domains" section in Appwrite console** - That's because CORS is configured via **environment variables** on the Appwrite server itself, not in the console.

### Fix Steps:

**On your Appwrite Server (via SSH or your server provider's console):**

Add these environment variables to your Appwrite `.env` file:

```env
_APP_DOMAINS_ENABLED=true
_APP_ALLOWED_DOMAINS=twinflames.ro,localhost,127.0.0.1,10.0.1.139
_APP_ALLOWED_DOMAINS_STRICT=false
_APP_DOMAIN_TARGET=twinflames.ro
```

Then restart Appwrite:
```bash
# If using Docker Compose
docker-compose restart

# If using Dokploy
# Restart the Appwrite container through Dokploy UI
```

### Alternative: Check Current Appwrite Configuration

SSH into your server and check what environment variables are set:
```bash
grep "_APP_DOMAINS" /path/to/appwrite/.env
```

If the output is empty or shows `_APP_DOMAINS_ENABLED=false`, you need to enable it as shown above.

---

## Why Canvas/WebSocket Isn't Working YetThe errors show:
1. ❌ WebSocket can't connect (CORS blocks it)
2. ✅ Canvas saves via server action (this bypasses CORS and should work)
3. ❌ Canvas realtime sync doesn't work (blocked by CORS)

### What happens NOW:
- Canvas strokes save (via server action) ✓
- But partner doesn't see them in real-time (WebSocket blocked) ✗

### What happens after CORS fix:
- Canvas strokes save ✓
- Partner sees updates in real-time ✓  
- All Realtime features work ✓

---

## Priority Order

1. **FIX GEMINI API KEY FIRST** (easier, faster)
   - Get new key from Google
   - Update Dokploy env var
   - Redeploy
   - Test AI features

2. **FIX APPWRITE CORS SECOND** (requires server access)
   - Add env variables to Appwrite server
   - Restart Appwrite
   - Test WebSocket connection

---

## Verification Checklist

After making changes:

- [ ] Deployed new Gemini API key to Dokploy
- [ ] Redeployed app
- [ ] AI features (Dates, Trivia) work without errors
- [ ] Updated Appwrite `.env` with `_APP_DOMAINS_ENABLED=true`
- [ ] Restarted Appwrite server
- [ ] Canvas WebSocket connects (check browser console - no more "failed" messages)
- [ ] Canvas real-time sync works (partner sees drawings instantly)
