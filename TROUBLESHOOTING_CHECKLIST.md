# Troubleshooting & Environment Verification Checklist

## Current Error Analysis

### Error Message:
```
Invalid document structure: Missing required attribute "chat_id"
```

### Location:
Love Notes page (currently trying to use `sendNote()`)

### Debug Process:

#### Step 1: Verify Environment Variable is Set
In Dokploy dashboard:
1. Go to Deployments → Your App → Environment
2. Search for: `NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID`
3. Verify:
   - [ ] Variable exists
   - [ ] Value is not empty
   - [ ] Value looks like a collection ID (usually 20+ chars alphanumeric)
   - [ ] Value does NOT match `NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID`

If missing or empty:
```
ACTION: Add the variable with correct Notes collection ID from Appwrite Console
```

#### Step 2: Verify Collection Exists in Appwrite
In Appwrite Console:
1. Go to Databases → Your Database
2. Look for collection named "notes" or similar
3. Verify it exists and has ID matching your env var

If missing:
```
ACTION: Create new collection with ID matching NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID env var
        Set up attributes exactly as shown below
```

#### Step 3: Verify Collection Schema
In Appwrite Console → Notes Collection → Attributes:
Verify these attributes exist with correct types:

| Attribute | Type | Required | Size | Validation |
|-----------|------|----------|------|-----------|
| user_id | String | ✅ Yes | 255 | None |
| title | String | ✅ Yes | 255 | None |
| content | String | ❌ No | 65535 | None |
| color | String | ❌ No | 20 | Regex: `^#[0-9a-fA-F]{6}$` |
| pinned | Boolean | ❌ No | - | None |

If missing any attribute:
```
ACTION: Add missing attributes to collection in Appwrite Console
```

#### Step 4: Verify Code is Using Correct Function
In VS Code → `src/app/dashboard/notes/page.tsx`:
- Check line ~60 where form is submitted
- Should call: `sendNote(userId, message)`
- This function should:
  1. Call `createNote()` from `notes.ts`
  2. NOT call `sendMessage()` from `chat.ts`

#### Step 5: Clear Browser Cache & Redeploy
Backend changes often need:
```bash
# In terminal:
npm run build              # Rebuild
git add .
git commit -m "Environment fix"
git push origin test       # Push to Dokploy

# Then in Dokploy:
- Trigger redeploy
- Wait for deployment to complete
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache if needed
```

---

## Complete Environment Variables Checklist

### Required Variables (MUST SET):
```bash
# Appwrite Connection
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://144.24.248.150:8095  ← MUST BE HTTPS!
NEXT_PUBLIC_APPWRITE_PROJECT_ID=6996e92a0003122484d6
NEXT_PUBLIC_APPWRITE_DATABASE_ID=[from Appwrite Console]

# Authentication
APPWRITE_API_KEY=[from Appwrite Console - API Keys tab]

# Essential Collections
NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_JOURNAL_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_MOODS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_PHOTOS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_COUPONS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID=  ← THIS ONE IS KEY!

# Optional Collections
NEXT_PUBLIC_APPWRITE_CHAT_SETTINGS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_PROFILE_MILESTONES_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_DATES_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_SOCIAL_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_SOCIAL_CONNECTIONS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_TRIVIA_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_TEST_PASSWORDS_COLLECTION_ID=

# Storage
NEXT_PUBLIC_MINIO_ENDPOINT=https://minio.twinflames.ro  ← MUST BE HTTPS!
NEXT_PUBLIC_MINIO_ACCESS_KEY=minioadmin
NEXT_PUBLIC_MINIO_SECRET_KEY=minioadmin
NEXT_PUBLIC_MINIO_BUCKET_DAILY=daily-photos
NEXT_PUBLIC_MINIO_BUCKET_MESSAGES=message-uploads

# AI
NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY=[from Google Cloud]
NEXT_PUBLIC_GOOGLE_GEMINI_FALLBACK_MODEL=gemini-2.0-flash

# Optional Features
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_OAUTH_CALLBACK_URL=
```

### Where to Get Each Value:

**NEXT_PUBLIC_APPWRITE_PROJECT_ID:**
- Appwrite Console → Settings → Project ID (top right)
- Copy the ID shown there

**APPWRITE_API_KEY:**
- Appwrite Console → Settings → API Keys → Create New Key
- Set scopes: `collections.read`, `collections.write`, `documents.read`, `documents.write`, `databases.read`

**Collection IDs:**
- Appwrite Console → Databases → Your DB → Click Collection → URL shows ID
- Or hover over collection name, ID appears in settings

**NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY:**
- Google Cloud Console → APIs & Services → API Keys
- Or use restricted key from credentials

---

## Collection Creation Checklist

Before you can use any collection, it must be created in Appwrite with correct schema.

### Step 1: Create Collection
In Appwrite Console → Databases → Your Database:
1. Click "Create Collection"
2. Name: `notes`
3. Collection ID: (copy from env var or generate, then save to env var)
4. Click Create

### Step 2: Add Attributes for NOTES Collection
In Collection → Attributes → Create Attribute:

**Attribute 1: user_id**
- Type: String
- Required: Yes (Enable)
- Size: 255
- Default: None
- Click Create

**Attribute 2: title**
- Type: String
- Required: Yes (Enable)
- Size: 255
- Default: None
- Click Create

**Attribute 3: content**
- Type: String
- Required: No
- Size: 65535 (max)
- Encryption: Yes (Enable)
- Default: Empty String ""
- Click Create

**Attribute 4: color**
- Type: String
- Required: No
- Size: 20
- Regex Validation: `^#[0-9a-fA-F]{6}$`
- Default: "#FFFFFF"
- Click Create

**Attribute 5: pinned**
- Type: Boolean
- Required: No
- Default: false
- Click Create

### Step 3: Verify All Attributes Are Present
The collection should now show all 5 attributes. Proceed to next collection.

---

## Database Structure Verification

### Command to Verify Everything:
```bash
# In terminal at workspace root:
npm run build

# Output should show:
# ✓ Ready in 1.23s
# ✓ 27 routes generated
# ✓ 0 errors
```

If build fails:
```bash
npm install
npm run build
```

---

## Testing Each Collection

### Test 1: Notes (Love Notes Page)
1. Go to https://twinflames.ro/dashboard/notes
2. Type test message: "test note"
3. Click "Send Note"
4. Verify:
   - [ ] No red error message appears
   - [ ] Form clears
   - [ ] Note appears below in list
   - [ ] Note shows with title, color, timestamp

**If fails with "Missing required attribute 'chat_id'":**
- ❌ NOTES collection misconfigured
- Action: Check env var points to NOTES, not MESSAGES

### Test 2: Chat Messages
1. Go to https://twinflames.ro/dashboard/chat
2. Type test message: "test message"
3. Click Send or Enter
4. Verify:
   - [ ] No red error message
   - [ ] Message appears in chat
   - [ ] Message is decrypted/readable

**If fails with "Failed to fetch":**
- ❌ HTTPS/HTTP mismatch
- Action: Verify NEXT_PUBLIC_APPWRITE_ENDPOINT=https://...

### Test 3: Mood Check-in
1. Go to https://twinflames.ro/dashboard
2. Find Mood Checkin section
3. Select mood (1-5), optional note
4. Click Submit
5. Verify:
   - [ ] No error message
   - [ ] Mood appears in today section

**If fails with timestamp error:**
- ❌ Date format issue
- Action: Check mood.ts uses YYYY-MM-DD format only

### Test 4: Daily Photo Upload
1. Go to https://twinflames.ro/dashboard/canvas
2. Click camera buttons
3. Upload front and back photos
4. Click Save
5. Verify:
   - [ ] No error
   - [ ] Photos appear in list

**If fails with upload error:**
- ❌ MinIO/S3 misconfigured
- Action: Verify MinIO endpoint and credentials

---

## Common Error Messages & Fixes

| Error Message | Likely Cause | Fix |
|---------------|--------------|-----|
| "Missing required attribute X" | Collection schema missing attribute | Add attribute to collection in Appwrite |
| "Invalid document structure" | Wrong collection type or schema format | Recreate collection with exact schema |
| "Attribute X has invalid type" | Sending wrong data type (string vs number) | Check action function sends correct type |
| "Mixed Content: HTTPS page requested HTTP" | Endpoint is HTTP but frontend is HTTPS | Change NEXT_PUBLIC_APPWRITE_ENDPOINT to https:// |
| "Failed to fetch" | Mixed content blocked request | Use HTTPS endpoint only |
| "WebSocket insecure connection blocked" | WebSocket on HTTP from HTTPS page | Use HTTPS endpoint (auto-converts to wss://) |
| "Uncaught SyntaxError: Unexpected token" | Browser cache or extension conflict | Hard refresh (Ctrl+Shift+R) or clear cache |
| "Cannot find module X" | Environment variable not set | Add missing env var and redeploy |

---

## Verification Workflow

### Before Any Testing:
1. [ ] All required env vars set in Dokploy
2. [ ] All collections created in Appwrite Console
3. [ ] All collection attributes verified
4. [ ] Build succeeds locally: `npm run build`
5. [ ] Code pushed to git: `git push origin test`
6. [ ] Dokploy shows "Deployment Completed"
7. [ ] Browser hard-refreshed: Ctrl+Shift+R

### For Notes Page Specifically:
1. [ ] NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID is set
2. [ ] Notes collection exists in Appwrite
3. [ ] Notes collection has: user_id, title, content, color, pinned attributes
4. [ ] src/actions/notes.ts exists and has sendNote() function
5. [ ] notes/page.tsx calls sendNote(userId, message)
6. [ ] npm run build succeeds
7. [ ] Deployed to production
8. [ ] Load https://twinflames.ro/dashboard/notes
9. [ ] Try sending a test note

---

## Step-by-Step Recovery (If Notes Page Broken)

### Phase 1: Assess Current State
```bash
# Check Appwrite collections exist
# Use Appwrite Console → Databases → Your Database
# List all collections you see
# Take a screenshot if possible
```

### Phase 2: Create/Fix Notes Collection
In Appwrite Console:
```
1. Find or create collection named "notes"
2. Get its ID (e.g., "abcdef123456")
3. Copy ID to clipboard
```

### Phase 3: Update Environment
In Dokploy:
```
1. Go to Environment tab
2. Add/Update: NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID=abcdef123456
3. (Replace abcdef123456 with actual ID from step 2)
4. Save changes
5. Redeploy application
6. Wait for deployment to complete
```

### Phase 4: Verify Schema
In Appwrite Console → Notes Collection → Attributes:
```
1. Should have 5 attributes:
   - user_id (String, Required)
   - title (String, Required)
   - content (String, Optional, Encrypted)
   - color (String, Optional)
   - pinned (Boolean, Optional)
2. If missing any, add them
3. Save changes
```

### Phase 5: Test
```
1. Clear browser cache
2. Hard refresh: Ctrl+Shift+R
3. Go to https://twinflames.ro/dashboard/notes
4. Try sending a note
5. Check for errors
```

### Phase 6: If Still Broken
Check browser console (F12 → Console):
```
1. Look for error messages
2. Copy full error message
3. Check if error mentions specific attribute name
4. Cross-reference that attribute exists in collection schema
5. If not, add missing attribute and retry
```

---

## Useful Appwrite Console Queries

### To Find Collection ID:
1. Appwrite Console → Databases → Your Database
2. Click collection name → Settings tab
3. Collection ID shown at top

### To Verify Collection Schema:
1. Open collection
2. Go to "Attributes" tab
3. Should see list of all attributes with types and settings

### To Check Documents in Collection:
1. Open collection
2. Go to "Browse" tab
3. Should see list of documents created
4. Click document to view all fields

### To Test Query:
1. Go to Appwrite Console → API Console
2. Method: POST
3. Endpoint: `/databases/{database_id}/documents/{collection_id}`
4. Body: Add document as JSON
5. Click Test

---

## If All Else Fails

### Nuclear Option: Recreate All Collections
1. In Appwrite Console → Databases → Your Database
2. For each collection:
   - [ ] Take note of any important data (export/backup)
   - [ ] Delete collection
   - [ ] Recreate with exact schema from COLLECTION_ATTRIBUTES_AUDIT.md
   - [ ] Update Dokploy env vars with new collection IDs
3. Redeploy application
4. Test each page

---

## Quick Link References

| Resource | URL |
|----------|-----|
| Appwrite Console | https://cloud.appwrite.io |
| Your Appwrite Dashboard | https://144.24.248.150:8095 |
| Your Deployed App | https://twinflames.ro |
| Dokploy | https://dokploy.twinflames.ro (or your address) |
| Email | check inbox for Appwrite logs |

---

## Support Documents Available

1. **COLLECTION_ATTRIBUTES_AUDIT.md** - Full breakdown of all 13 collections, their required vs sent attributes
2. **ATTRIBUTES_BY_PAGE_QUICK_REFERENCE.md** - What each page should send to database
3. **This Document** - Troubleshooting and verification steps

