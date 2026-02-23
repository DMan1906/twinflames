# Quick Reference: Attributes by Page/Feature

## Love Notes Page (notes/page.tsx)

**Collection:** NOTES  
**Env Var:** `NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID`

### What Should Be Sent:
When user clicks "Send Note":
```typescript
// From notes.ts - sendNote() function
{
  user_id: "current_user_id",           // String
  title: "Note from HH:MM AM/PM",       // String (auto-generated timestamp)
  content: "[ENCRYPTED_TEXT]",          // String (encrypted)
  color: "#FFFFFF",                     // String (hex color, default white)
  pinned: false,                        // Boolean (default false)
}
```

### Expected Response:
- Success: `{ success: true, message: "Note created successfully." }`
- Error: `{ success: false, error: "[error message]" }`

### Common Error & Fix:
```
❌ Error: "Invalid document structure: Missing required attribute "chat_id""
   
Cause: Code is sending to MESSAGES collection instead of NOTES
   
Fix: Check NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID in Dokploy
     - Verify it's set
     - Verify it's NOT the MESSAGES collection ID
     - Verify NOTES collection exists in Appwrite
```

---

## Chat Page (chat/page.tsx)

**Collection:** MESSAGES  
**Env Var:** `NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID`

### What Should Be Sent:
When user sends a message:
```typescript
// From chat.ts - sendMessage() function
{
  chat_id: "user1_user2",               // String (sorted user IDs)
  sender_id: "current_user_id",         // String
  content: "[ENCRYPTED_MESSAGE]",       // String (encrypted)
  message_type: "text",                 // String ('text', 'image', 'video')
  delivery_mode: "keep",                // String ('keep', 'view_once', 'replay')
  allowed_views: 0,                     // Number (0 for keep, 1 for view_once, 2 for replay)
  view_count: 0,                        // Number (starts at 0)
  opened_by_json: "{}",                 // String (JSON, empty object initially)
  seen_by_json: "[\"user_id_here\"]",   // String (JSON array with sender ID)
  delete_period: "never",               // String ('never', 'immediate', '10m', '1h', '1d')
  expires_at: "",                       // String (empty, set when message expires)
}
```

**Note:** `chat_id` is generated as: `[userId, partnerId].sort().join('_')`

---

## Dashboard/Today Page (today/page.tsx)

**Collection:** JOURNAL  
**Env Var:** `NEXT_PUBLIC_APPWRITE_JOURNAL_COLLECTION_ID`

### What Should Be Sent:
When user submits daily question answer:
```typescript
// From today.ts - submitDailyAnswer() function
{
  chat_id: "user1_user2",              // String (sorted user IDs)
  user_id: "current_user_id",          // String
  prompt: "What's your favorite memory with me?", // String (question text)
  content: "[ENCRYPTED_ANSWER]",       // String (encrypted)
  is_revealed: false,                  // Boolean (true only when both partners answer)
}
```

### Automatic Update:
When partner also answers same prompt:
- Both documents set to `is_revealed: true`
- Answers become visible to both users

---

## Moods Page (dashboard/page.tsx - mood section)

**Collection:** MOODS  
**Env Var:** `NEXT_PUBLIC_APPWRITE_MOODS_COLLECTION_ID`

### What Should Be Sent:
When user submits mood check-in:
```typescript
// From mood.ts - submitMoodCheckin() function
{
  chat_id: "user1_user2",              // String (sorted user IDs)
  user_id: "current_user_id",          // String
  mood_level: 4,                       // Number (1-5 scale)
  mood_note: "[ENCRYPTED_NOTE]",       // String (encrypted, can be empty)
  created_at: "2024-02-23",            // String (YYYY-MM-DD format only!)
}
```

**CRITICAL:** `created_at` must be exactly 10 characters: `YYYY-MM-DD`
- ✅ Correct: `"2024-02-23"`
- ❌ Wrong: `"2024-02-23T14:30:00Z"` (timestamp format won't work)

---

## Daily Photos Page (dashboard/canvas)

**Collection:** PHOTOS  
**Env Var:** `NEXT_PUBLIC_APPWRITE_PHOTOS_COLLECTION_ID`

### What Should Be Sent:
When user submits daily photos:
```typescript
// From photos.ts - submitDailyPhotos() function
{
  chat_id: "user1_user2",              // String (sorted user IDs)
  user_id: "current_user_id",          // String
  front_camera_url: "daily/2024-02-23/userid/front-123456.jpg", // String (S3/MinIO key)
  back_camera_url: "daily/2024-02-23/userid/back-123456.jpg",   // String (S3/MinIO key)
  created_at: "2024-02-23",            // String (YYYY-MM-DD format only!)
}
```

**Note:** URLs are MinIO object keys, not full URLs

---

## Vault/Journal Page (vault/page.tsx)

**Collection:** JOURNAL (same as today.ts but filtered)  
**Env Var:** `NEXT_PUBLIC_APPWRITE_JOURNAL_COLLECTION_ID`

### Query:
Only shows documents where:
- `chat_id` = current couple's chat_id
- `is_revealed` = true (both partners answered)

No POST operations - read-only page

---

## Coupons Page (dashboard/page.tsx - coupons section)

**Collection:** COUPONS  
**Env Var:** `NEXT_PUBLIC_APPWRITE_COUPONS_COLLECTION_ID`

### What Should Be Sent (Create):
```typescript
// From coupons.ts - createCoupon() function
{
  chat_id: "user1_user2",              // String (sorted user IDs)
  created_by: "current_user_id",       // String (who created the coupon)
  title: "[ENCRYPTED_TITLE]",          // String (encrypted)
  description: "[ENCRYPTED_DESC]",     // String (encrypted, can be empty)
  redeemed: false,                     // Boolean (starts as false)
  redeemed_at: "",                     // String (empty until redeemed)
}
```

### What Should Be Updated (Redeem):
```typescript
// From coupons.ts - redeemCoupon() function
{
  redeemed: true,                      // Boolean
  redeemed_at: "2024-02-23",           // String (YYYY-MM-DD when redeemed)
}
```

---

## Dates Page (dashboard/dates/page.tsx)

**Collection:** DATES  
**Env Var:** `NEXT_PUBLIC_APPWRITE_DATES_COLLECTION_ID`

### What Should Be Sent:
When user creates/saves a date idea:
```typescript
// From dates.ts - saveDateIdea() function
{
  chat_id: "user1_user2",              // String (sorted user IDs)
  idea_title: "Sunset Picnic",         // String (unencrypted title)
  idea_summary: "[ENCRYPTED_SUMMARY]", // String (encrypted description)
  idea_plan: "[ENCRYPTED_PLAN_JSON]",  // String (encrypted JSON array of steps)
  category: "romantic",                // String ('cozy', 'adventurous', 'romantic', 'food')
  budget: "low",                       // String ('free', 'low', 'medium', 'high')
  source: "quick",                     // String ('quick' for presets, 'ai' for generated)
  created_at: "2024-02-23",            // String (YYYY-MM-DD format only!)
  completed: false,                    // Boolean
}
```

---

## Profile Milestones Page

**Collection:** PROFILE MILESTONES  
**Env Var:** `NEXT_PUBLIC_APPWRITE_PROFILE_MILESTONES_COLLECTION_ID`

### What Should Be Sent:
When user adds a milestone:
```typescript
// From profile.ts - addMilestone() function
{
  user_id: "current_user_id",          // String (individual milestone)
  title: "One Year Anniversary",       // String
  date: "2024-03-15",                  // String (YYYY-MM-DD format)
  type: "date",                        // String ('date' or 'countdown')
}
```

---

## Profile Page

**Collection:** PROFILES  
**Env Var:** `NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID`

### What Should Be Updated:
```typescript
// From profile.ts - updateProfileImage()
{
  profile_image_url: "https://example.com/image.jpg", // String
}
```

### Streak Auto-Update:
When daily trinity complete (mood + photo + question):
```typescript
// From streak.ts - updateStreakIfCompletedToday()
{
  streak_count: 5,  // Number (auto-calculated)
}
```

---

## Auth - Signup Flow

**Collection:** PROFILES (after account created)  
**Env Var:** `NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID`

### What Should Be Created:
```typescript
// From auth.ts - signUp() function
{
  // Document ID = Appwrite User ID (auto)
  name: "John Doe",                    // String (required)
  email: "john@example.com",           // String (required)
  partner_id: "",                      // String (empty initially)
  profile_image_url: "",               // String (empty initially)
  streak_count: 0,                     // Number
}
```

### Session Created:
```typescript
// Also created after profile:
const session = account.createEmailPasswordSession(email, password);
// Stored in cookie: 'twinflames-session'
```

---

## Strikethrough Features (Incomplete)

### Social Page (NOT FULLY IMPLEMENTED)
- Uses `NEXT_PUBLIC_APPWRITE_SOCIAL_COLLECTION_ID`
- Uses `NEXT_PUBLIC_APPWRITE_SOCIAL_CONNECTIONS_COLLECTION_ID`
- Code exists but UI not complete

### Trivia Page (NOT FULLY IMPLEMENTED)
- Uses `NEXT_PUBLIC_APPWRITE_TRIVIA_COLLECTION_ID`
- Code exists but UI not complete

### Dice Page (NOT IMPLEMENTED)
- UI exists, backend not implemented

### Pairing (BASIC)
- Uses `NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID`
- Updates `partner_id` field

---

## Date Format Requirements

### STRICT DATE FORMATS (Character Count Matters):

| Use Case | Format | Length | Example |
|----------|--------|--------|---------|
| Daily Logs (mood, photo, date idea) | `YYYY-MM-DD` | 10 chars | `2024-02-23` |
| Full Timestamp | `YYYY-MM-DD HH:MM:SS` | 19 chars | `2024-02-23 14:30:45` |
| Milestones | `YYYY-MM-DD` | 10 chars | `2024-03-15` |
| Appwrite Auto ($createdAt) | ISO 8601 | 24 chars | `2024-02-23T14:30:45.000Z` |

**CRITICAL:** Appwrite has a 20-character limit on string fields!
- ✅ `2024-02-23` = 10 chars ✅
- ✅ `2024-02-23 14:30:45` = 19 chars ✅
- ❌ `2024-02-23T14:30:45Z` = 20 chars (edge case)
- ❌ `2024-02-23T14:30:45.000Z` = 24 chars ❌

---

## Boolean Field Notes

When sending boolean values to Appwrite:
- ✅ Correct: `true` or `false` (JavaScript boolean)
- ✅ Correct: Boolean values serialize to JSON properly
- ❌ Wrong: `"true"` or `"false"` (strings won't be recognized as boolean)

---

## JSON Field Notes

For fields that store JSON:
- ✅ Send: JavaScript object/array serialized with `JSON.stringify()`
- Result stored as: String in database
- ✅ Retrieve: Parse with `JSON.parse()`

Example:
```typescript
// Sending:
opened_by_json: JSON.stringify({})
seen_by_json: JSON.stringify([userId])

// Result in DB stored as: strings
"{}"
"[\"user123\"]"

// Retrieving:
JSON.parse(doc.opened_by_json)  // Returns object: {}
JSON.parse(doc.seen_by_json)    // Returns array: ["user123"]
```

---

## Encryption Notes

For encrypted fields (marked as "encrypted" in schema):

**Sending:**
```typescript
import { encryptData } from '@/lib/crypto';
const encrypted = encryptData("plaintext");  // Returns encrypted string
// Send this encrypted string to Appwrite
```

**Retrieving:**
```typescript
import { decryptData } from '@/lib/crypto';
const plaintext = decryptData(doc.field);  // Decrypts to original
```

**Fields That Are Encrypted:**
- Notes: `content`
- Coupons: `title`, `description`
- Journal: `content` (answers)
- Moods: `mood_note`
- Photos: (none - just keys)
- Dates: `idea_summary`, `idea_plan`
- Messages: `content`

