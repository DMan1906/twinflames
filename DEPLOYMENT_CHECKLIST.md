# Complete Deployment Setup Checklist

Your deployment is now technically running but needs configuration. Check off these items to get everything working.

---

## Step 1: ✅ Environment Variables (Verify on Server)

SSH into your server and check that these are set:

```bash
# Check which variables are set
env | grep NEXT_PUBLIC_APPWRITE
env | grep MINIO
env | grep GEMINI
env | grep DATA_ENCRYPTION_KEY
```

**Required Variables:**

### Core Appwrite
- ✅ `NEXT_PUBLIC_APPWRITE_ENDPOINT` = `http://144.24.248.150:8095`
- ✅ `NEXT_PUBLIC_APPWRITE_PROJECT` = Your Project ID
- ✅ `NEXT_PUBLIC_APPWRITE_DATABASE_ID` = Your Database ID
- ✅ `NEXT_APPWRITE_KEY` = Your API Key (admin key)
- ✅ `DATA_ENCRYPTION_KEY` = 32-character encryption key

### Collection IDs (check in Appwrite Console)
- ✅ `NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_JOURNAL_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_MOODS_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_CANVAS_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_COUPONS_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_BUCKET_LIST_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_TRIVIA_SESSIONS_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_PROFILE_MILESTONES_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_FANTASY_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_THUMBKISS_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_MEMORIES_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_DATES_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_PHOTOS_COLLECTION_ID` (Daily Trinity)
- ✅ `NEXT_PUBLIC_APPWRITE_STREAKS_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_DAILY_PROGRESS_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_SOCIAL_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_SOCIAL_CONNECTIONS_COLLECTION_ID`
- ✅ `NEXT_PUBLIC_APPWRITE_VAULT_COLLECTION_ID` (Alias for journal, optional)

### MinIO / Object Storage
- ✅ `MINIO_ENDPOINT` = `http://144.24.248.150:9090` (will be parsed correctly now)
- ✅ `MINIO_ACCESS_KEY` = Your MinIO access key
- ✅ `MINIO_SECRET_KEY` = Your MinIO secret key

### AI / Gemini
- ✅ `GEMINI_API_KEY` = Your Google Gemini API key

### Optional: Social Features
- ⭕ `NEXT_PUBLIC_INSTAGRAM_CLIENT_ID`
- ⭕ `NEXT_PUBLIC_INSTAGRAM_CLIENT_SECRET`
- ⭕ `NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI`
- ⭕ `YOUTUBE_DATA_API_KEY`

---

## Step 2: ❌ Appwrite Schema Updates (CRITICAL)

The Messages collection needs new attributes added. **Do this in Appwrite Console:**

1. Go to **Database** → **Collections** → **Messages**
2. Click **+ Add Attribute** for each:

| Attribute | Type | Required | Default |
|-----------|------|----------|---------|
| `delivery_mode` | String | No | `keep` |
| `delete_period` | String | No | `never` |
| `expires_at` | DateTime | No | Empty |
| `seen_by_json` | String | No | `[]` |
| `allowed_views` | Integer | No | `0` |
| `view_count` | Integer | No | `0` |
| `opened_by_json` | String | No | `{}` |

3. After adding, restart the app:
   ```bash
   docker restart twinflame-twinflames-iipn7d
   ```

---

## Step 3: ⭕ Optional Appwrite Collections (for enhanced features)

These collections can be created if needed, but aren't blocking:

### Canvas Collection
- `chat_id` (String)
- `sender_id` (String)
- `points` (String - JSON array)
- `color` (String)
- `width` (Number)

### Chat Settings Collection (for delete periods)
- `chat_id` (String)
- `delete_period` (String)
- `set_by` (String)

Create these if you want the "delete period" feature to persist across sessions.

---

## Step 4: 🔍 Verify Everything Works

After updating Appwrite schema:

```bash
# 1. SSH to server
ssh your-server

# 2. Check app logs
docker logs twinflame-twinflames-iipn7d | tail -50

# 3. Look for these errors:
# ✓ Should NOT see: "Invalid document structure: Unknown attribute"
# ✓ Should NOT see: "Missing required parameter: collectionId"  
# ✓ MIGHT see: "AI is currently unavailable" (if API key is wrong - this is OK for now)
```

### Test Real-Time Features

Open your app in browser and test:

1. **Canvas**: Draw something - should appear in real-time
2. **Chat**: Send a message - should appear immediately
3. **Vault**: Submit journal entries - should display

If these work, real-time subscriptions (WebSocket) are connected correctly.

---

## Step 5: 🐛 Troubleshooting

### Error: "Invalid document structure: Unknown attribute: delivery_mode"
**Fix**: Add the fields from Step 2 to your Appwrite Messages collection

### Error: "Missing required parameter: collectionId"
**Fix**: Make sure ALL collection IDs from Step 1 are set as environment variables

### Error: "AI is currently unavailable"
**Fix**: Check your `GEMINI_API_KEY`:
- Is it valid?
- Is the model available for your API plan?
- Try a different model: `gemini-pro` instead of `gemini-1.5-flash`

### Canvas/Chat not syncing in real-time
**Fix**: Review [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md)
- Test WebSocket connectivity from browser console
- Check if Appwrite is reachable on `http://144.24.248.150:8095`
- Verify permissions in Appwrite collections allow authenticated reads

### App keeps crashing
**Fix**: Check logs

```bash
docker logs -f twinflame-twinflames-iipn7d 2>&1 | grep -A 3 "Error\|failed"
```

---

## Step 6: 🚀 After Everything Works

Once all features are working:

1. **Disable debug mode** in Appwrite (if applicable)
2. **Set SSL/TLS** for production security
3. **Configure OAuth** for social features (Instagram, YouTube)
4. **Set up monitoring** for your services

---

## Quick Copy-Paste Template

Save this as a bash script to set all variables at once:

```bash
#!/bin/bash

# Appwrite
export NEXT_PUBLIC_APPWRITE_ENDPOINT="http://144.24.248.150:8095"
export NEXT_PUBLIC_APPWRITE_PROJECT="YOUR_PROJECT_ID"
export NEXT_PUBLIC_APPWRITE_DATABASE_ID="YOUR_DB_ID"
export NEXT_APPWRITE_KEY="YOUR_API_KEY"
export DATA_ENCRYPTION_KEY="YOUR_32_CHAR_KEY"

# MinIO
export MINIO_ENDPOINT="http://144.24.248.150:9090"
export MINIO_ACCESS_KEY="YOUR_MINIO_KEY"
export MINIO_SECRET_KEY="YOUR_MINIO_SECRET"

# Gemini
export GEMINI_API_KEY="YOUR_GEMINI_KEY"

# Collection IDs (get these from Appwrite Console)
export NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID="YOUR_ID"
export NEXT_PUBLIC_APPWRITE_JOURNAL_COLLECTION_ID="YOUR_ID"
# ... (add all others)

# Then restart:
docker restart twinflame-twinflames-iipn7d
```

---

## Still Stuck?

Check these files:
- [APPWRITE_SCHEMA_UPDATES.md](APPWRITE_SCHEMA_UPDATES.md) - How to add Appwrite attributes
- [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md) - WebSocket and real-time issues
- [QUICK_START_COMMANDS.md](QUICK_START_COMMANDS.md) - Original setup guide
