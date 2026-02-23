# Dokploy Deployment Configuration

## The SIGTERM Error

The `npm error signal SIGTERM` on `next start` typically means:
- App startup is timing out
- Missing or invalid environment variables
- Appwrite/external service unreachable
- Out of memory during startup

## Required Environment Variables

Add these to your Dokploy project settings:

### Appwrite Configuration
```
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://appwrite.voidparadox.site
NEXT_PUBLIC_APPWRITE_PROJECT=6996e92a0003122484d6
NEXT_PUBLIC_APPWRITE_DATABASE_ID=6996ed52002b09e5a496
NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID=profiles
NEXT_PUBLIC_APPWRITE_THUMBKISS_COLLECTION_ID=thumbkiss
NEXT_PUBLIC_APPWRITE_CANVAS_COLLECTION_ID=canvas
NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID=notes
NEXT_PUBLIC_APPWRITE_DATES_COLLECTION_ID=dates
NEXT_PUBLIC_APPWRITE_MEMORIES_COLLECTION_ID=memories
NEXT_PUBLIC_APPWRITE_FANTASY_COLLECTION_ID=fantasy
NEXT_PUBLIC_APPWRITE_BUCKET_LIST_COLLECTION_ID=bucket_list
NEXT_PUBLIC_APPWRITE_TRIVIA_COLLECTION_ID=trivia_sessions
NEXT_PUBLIC_APPWRITE_STREAK_COLLECTION_ID=streaks
NEXT_APPWRITE_KEY=your_appwrite_api_key_here
```

### AI Configuration
```
GEMINI_API_KEY=your_google_gemini_api_key_here
```

### Optional
```
NODE_ENV=production
```

## Dokploy Settings

1. **Builder**: Node.js  
2. **Build Command**: `npm run build`  
3. **Start Command**: `npm start`

### Important: Increase Startup Timeout

In Dokploy's service settings, set:
- **Health Check Timeout**: 60+ seconds (default may be too short)
- **Startup Probe Initial Delay**: 10-15 seconds

## Pre-deployment Checklist

### 1. Appwrite CORS Configuration
The app is at `https://twinflames.ro` but Appwrite has CORS set to `https://localhost`.

**Fix on Appwrite Server:**
1. Go to Appwrite Console → Settings  
2. Add `https://twinflames.ro` to allowed domains
3. Keep `https://localhost` for local development
4. Restart Appwrite if needed

### 2. Appwrite API Key
Generate a new API key if needed:
1. Appwrite Console → Settings → API Keys
2. Create key with access to all collections
3. Copy to Dokploy env var `NEXT_APPWRITE_KEY`

### 3. Google Gemini API
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Generate API key
3. Add to Dokploy env var `GEMINI_API_KEY`
4. Ensure API is enabled in Google Cloud

## Deployment Steps

1. Ensure all env variables are set in Dokploy
2. Set app health check timeout to 60+ seconds
3. Deploy to Dokploy
4. Check logs for `[TwinFlames]` startup messages
5. Monitor first few minutes for errors

## Troubleshooting

### If still getting SIGTERM:

**Check Dokploy logs** for:
- Connection errors to Appwrite
- Out of memory errors
- Port binding issues

**Solutions:**
- Increase container memory allocation
- Check Appwrite server is reachable from Dokploy environment
- Verify all environment variables are correct (typos cause hangs)
- Check firewall/network access between Dokploy and Appwrite

### Check Appwrite connectivity:
```bash
# From Dokploy container
curl -X GET https://appwrite.voidparadox.site/v1/health
# Should return 200 with health info
```

### Check Google Gemini API:
Test in Dokploy logs - AI features will gracefully fall back if API unavailable or rate-limited.

## Performance Notes

- Build output is ~100-150MB (normal for Next.js with TypeScript)
- Cold start ~5-10 seconds
- Memory usage ~300-500MB at runtime
- Allocate at least 512MB to container (1GB recommended)
