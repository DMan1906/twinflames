# Collection Attributes Audit - Complete Mapping

## Overview
This document maps each Appwrite collection with:
1. **Required Attributes** (what Appwrite schema expects)
2. **Sent Attributes** (what code sends)
3. **Validation** (✅ match / ❌ mismatch)

---

## 1. MESSAGES Collection
**Appwrite Collection ID:** `NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID`

### Required Attributes (Schema)
- `chat_id` (String, required)
- `sender_id` (String, required)
- `content` (String, required) - encrypted
- `message_type` (String) - 'text', 'image', 'video'
- `delivery_mode` (String) - 'keep', 'view_once', 'replay'
- `allowed_views` (Number)
- `view_count` (Number)
- `opened_by_json` (String) - JSON stringified
- `seen_by_json` (String) - JSON stringified
- `delete_period` (String)
- `expires_at` (String)

### Sent Attributes (from `chat.ts`)
`Function: sendMessage()`
```typescript
{
  chat_id: chatId,           // ✅ Sent
  sender_id: senderId,       // ✅ Sent
  content: encryptedContent, // ✅ Sent
  message_type: type,        // ✅ Sent
  delivery_mode: deliveryMode, // ✅ Sent
  allowed_views: allowedViews, // ✅ Sent
  view_count: 0,             // ✅ Sent
  opened_by_json: JSON.stringify({}), // ✅ Sent
  seen_by_json: JSON.stringify([senderId]), // ✅ Sent
  delete_period: period,     // ✅ Sent
  expires_at: '',            // ✅ Sent
}
```
**Status:** ✅ COMPLETE - All attributes match

---

## 2. NOTES Collection
**Appwrite Collection ID:** `NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID`

### Required Attributes (Schema)
- `user_id` (String, required)
- `title` (String, required)
- `content` (String, required) - encrypted
- `color` (String) - hex color
- `pinned` (Boolean)

### Sent Attributes (from `notes.ts`)
`Function: createNote()`
```typescript
{
  user_id: userId,      // ✅ Sent
  title: title.trim(),  // ✅ Sent
  content: encryptData(content.trim()), // ✅ Sent
  color: color,         // ✅ Sent
  pinned: pinned,       // ✅ Sent
}
```
**Status:** ✅ COMPLETE - All attributes match

### Frontend Expectation (from `notes/page.tsx`)
```typescript
type Note = {
  id: string;        // ✅ $id
  userId: string;    // ✅ user_id
  title: string;     // ✅ title
  content: string;   // ✅ content
  color: string;     // ✅ color
  pinned: boolean;   // ✅ pinned
  createdAt: string; // ✅ $createdAt
};
```
**Status:** ✅ COMPLETE

---

## 3. COUPONS Collection
**Appwrite Collection ID:** `NEXT_PUBLIC_APPWRITE_COUPONS_COLLECTION_ID`

### Required Attributes (Schema)
- `chat_id` (String, required)
- `created_by` (String, required)
- `title` (String, required) - encrypted
- `description` (String) - encrypted
- `redeemed` (Boolean)
- `redeemed_at` (String)

### Sent Attributes (from `coupons.ts`)
`Function: createCoupon()`
```typescript
{
  chat_id: chatId,                    // ✅ Sent
  created_by: userId,                 // ✅ Sent
  title: encryptData(title.trim()),   // ✅ Sent
  description: encryptData(description.trim()) || '', // ✅ Sent
  redeemed: false,                    // ✅ Sent
  redeemed_at: '',                    // ✅ Sent
}
```
**Status:** ✅ COMPLETE - All attributes match

### Frontend Expectation (from `coupons/page.tsx`)
```typescript
type Coupon = {
  id: string;
  createdBy: string;      // ✅ created_by
  title: string;          // ✅ title
  description: string;    // ✅ description
  redeemed: boolean;      // ✅ redeemed
  redeemedAt: string;     // ✅ redeemed_at
  createdAt: string;      // ✅ $createdAt
};
```
**Status:** ✅ COMPLETE

---

## 4. MESSAGES (Chat Settings) Collection
**Appwrite Collection ID:** `NEXT_PUBLIC_APPWRITE_CHAT_SETTINGS_COLLECTION_ID`

### Required Attributes (Schema)
- `chat_id` (String, required)
- `delete_period` (String) - 'never', 'immediate', '10m', '1h', '1d'

### Sent Attributes (from `chat.ts`)
`Function: setChatDeletePeriod()`
```typescript
{
  chat_id: chatId,      // ✅ Sent
  delete_period: period, // ✅ Sent
}
```
**Status:** ✅ COMPLETE - All attributes match

---

## 5. JOURNAL (Daily Questions/Answers) Collection
**Appwrite Collection ID:** `NEXT_PUBLIC_APPWRITE_JOURNAL_COLLECTION_ID`

### Required Attributes (Schema)
- `chat_id` (String, required)
- `user_id` (String, required)
- `prompt` (String, required)
- `content` (String, required) - encrypted
- `is_revealed` (Boolean)

### Sent Attributes (from `today.ts` and `journal.ts`)
`Function: submitDailyAnswer()` / `submitEntry()`
```typescript
{
  chat_id: chatId,           // ✅ Sent
  user_id: userId,           // ✅ Sent
  prompt: question,          // ✅ Sent
  content: encryptedAnswer,  // ✅ Sent
  is_revealed: false,        // ✅ Sent
}
```
**Status:** ✅ COMPLETE - All attributes match

---

## 6. MOODS Collection
**Appwrite Collection ID:** `NEXT_PUBLIC_APPWRITE_MOODS_COLLECTION_ID`

### Required Attributes (Schema)
- `chat_id` (String, required)
- `user_id` (String, required)
- `mood_level` (Number) - 1-5
- `mood_note` (String) - encrypted (optional)
- `created_at` (String) - YYYY-MM-DD format

### Sent Attributes (from `mood.ts`)
`Function: submitMoodCheckin()`
```typescript
{
  chat_id: chatId,                        // ✅ Sent
  user_id: userId,                        // ✅ Sent
  mood_level: moodLevel,                  // ✅ Sent
  mood_note: encryptedNote,               // ✅ Sent (empty string if no note)
  created_at: today,                      // ✅ Sent (YYYY-MM-DD format)
}
```
**Status:** ✅ COMPLETE - All attributes match

---

## 7. PHOTOS Collection
**Appwrite Collection ID:** `NEXT_PUBLIC_APPWRITE_PHOTOS_COLLECTION_ID`

### Required Attributes (Schema)
- `chat_id` (String, required)
- `user_id` (String, required)
- `front_camera_url` (String) - S3/MinIO object key
- `back_camera_url` (String) - S3/MinIO object key
- `created_at` (String) - YYYY-MM-DD format

### Sent Attributes (from `photos.ts`)
`Function: submitDailyPhotos()`
```typescript
{
  chat_id: chatId,              // ✅ Sent
  user_id: userId,              // ✅ Sent
  front_camera_url: frontObjectKey, // ✅ Sent
  back_camera_url: backObjectKey,   // ✅ Sent
  created_at: today,            // ✅ Sent (YYYY-MM-DD format)
}
```
**Status:** ✅ COMPLETE - All attributes match

---

## 8. PROFILES Collection
**Appwrite Collection ID:** `NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID`

### Required Attributes (Schema)
- `user_id` (String, required - usually $id)
- `email` (String, required)
- `name` (String, required)
- `partner_id` (String)
- `profile_image_url` (String)
- `streak_count` (Number)

### Sent Attributes (from `auth.ts`)
`Function: signUp()` / After account creation
```typescript
{
  name: name,           // ✅ Sent
  email: email,         // ✅ Sent
  // user_id not sent - Appwrite auto-sets as $id
}
```
**Status:** ✅ COMPLETE - name and email sent

`Function: updateProfileImage()`
```typescript
{
  profile_image_url: imageUrl.trim(), // ✅ Sent
}
```
**Status:** ✅ COMPLETE

`Function: updateStreakIfCompletedToday()`
```typescript
{
  streak_count: nextStreak, // ✅ Sent
}
```
**Status:** ✅ COMPLETE

---

## 9. PROFILE MILESTONES Collection
**Appwrite Collection ID:** `NEXT_PUBLIC_APPWRITE_PROFILE_MILESTONES_COLLECTION_ID`

### Required Attributes (Schema)
- `user_id` (String, required)
- `title` (String, required)
- `date` (String, required) - YYYY-MM-DD format
- `type` (String) - 'date' or 'countdown'

### Sent Attributes (from `profile.ts`)
`Function: addMilestone()`
```typescript
{
  user_id: userId,      // ✅ Sent
  title: title.trim(),  // ✅ Sent
  date: date,           // ✅ Sent
  type: type,           // ✅ Sent ('date' or 'countdown')
}
```
**Status:** ✅ COMPLETE - All attributes match

---

## 10. DATES Collection
**Appwrite Collection ID:** `NEXT_PUBLIC_APPWRITE_DATES_COLLECTION_ID`

### Required Attributes (Schema)
- `chat_id` (String, required)
- `idea_title` (String, required)
- `idea_summary` (String) - encrypted
- `idea_plan` (String) - JSON stringified array, encrypted
- `category` (String) - 'cozy', 'adventurous', 'romantic', 'food'
- `budget` (String) - 'free', 'low', 'medium', 'high'
- `source` (String) - 'quick' or 'ai'
- `created_at` (String) - YYYY-MM-DD format
- `completed` (Boolean)

### Sent Attributes (from `dates.ts`)
`Function: saveDateIdea()`
```typescript
{
  chat_id: chatId,                    // ✅ Sent
  idea_title: idea.title,             // ✅ Sent
  idea_summary: encryptData(idea.summary), // ✅ Sent
  idea_plan: encryptData(JSON.stringify(idea.plan)), // ✅ Sent
  category: idea.category,            // ✅ Sent
  budget: idea.budget,                // ✅ Sent
  source: idea.source,                // ✅ Sent
  created_at: todayString(),          // ✅ Sent (YYYY-MM-DD)
  completed: false,                   // ✅ Sent
}
```
**Status:** ✅ COMPLETE - All attributes match

---

## 11. SOCIAL Collection
**Appwrite Collection ID:** `NEXT_PUBLIC_APPWRITE_SOCIAL_COLLECTION_ID`

### Required Attributes (Schema)
- `user_id` (String, required)
- `platform` (String) - 'instagram', 'tiktok', 'youtube', 'x', 'other'
- `username` (String, required)
- `profile_url` (String)
- `follower_count` (Number)

### Sent Attributes (from `social.ts`)
`Function: addSocialAccount()`
```typescript
{
  user_id: userId,           // ✅ Sent
  platform: platform,        // ✅ Sent
  username: normalizedUsername, // ✅ Sent
  profile_url: normalizeIncomingUrl(profileUrl), // ✅ Sent
  follower_count: asNumber(followerCount, 0), // ✅ Sent
}
```
**Status:** ✅ COMPLETE - All attributes match

---

## 12. SOCIAL CONNECTIONS Collection
**Appwrite Collection ID:** `NEXT_PUBLIC_APPWRITE_SOCIAL_CONNECTIONS_COLLECTION_ID`

### Required Attributes (Schema)
- `chat_id` (String, required)
- `platform` (String) - 'instagram', 'tiktok', 'youtube', 'x', 'other'
- `shared_accounts` (String) - JSON stringified

### Sent Attributes (from `social.ts`)
`Function: updateSharedSocialConnection()`
```typescript
{
  chat_id: chatId,                        // ✅ Sent
  platform: platform,                     // ✅ Sent
  shared_accounts: JSON.stringify(accounts), // ✅ Sent
}
```
**Status:** ✅ COMPLETE - All attributes match

---

## 13. TRIVIA GAMES Collection
**Appwrite Collection ID:** `NEXT_PUBLIC_APPWRITE_TRIVIA_COLLECTION_ID`

### Required Attributes (Schema)
- `chat_id` (String, required)
- `game_date` (String) - YYYY-MM-DD format
- `mode` (String) - 'general' or 'relationship'
- `questions` (String) - JSON stringified
- `answers` (String) - JSON stringified
- `completed` (Boolean)

### Sent Attributes (from `trivia.ts`)
`Function: startTriviaGame()`
```typescript
{
  chat_id: chatId,                    // ✅ Sent
  game_date: todayString(),           // ✅ Sent (YYYY-MM-DD)
  mode: mode,                         // ✅ Sent
  questions: JSON.stringify(questions), // ✅ Sent
  answers: JSON.stringify({}),        // ✅ Sent
  completed: false,                   // ✅ Sent
}
```
**Status:** ✅ COMPLETE - All attributes match

---

## SUMMARY BY STATUS

### ✅ COMPLETE & MATCHING (All attributes correct)
1. Messages Collection
2. Notes Collection ← **Used on Love Notes page**
3. Coupons Collection
4. Chat Settings Collection
5. Journal Collection
6. Moods Collection
7. Photos Collection
8. Profiles Collection
9. Profile Milestones Collection
10. Dates Collection
11. Social Collection
12. Social Connections Collection
13. Trivia Games Collection

---

## ISSUE DIAGNOSIS

The error on the Love Notes page shows:
```
Invalid document structure: Missing required attribute "chat_id"
```

This error indicates:
1. **Code is sending to MESSAGES collection** (which has `chat_id`)
2. **NOT to NOTES collection** (which has `user_id`)

### Root Causes to Check:
1. **Env Variable Issue**: `NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID` may be:
   - Not set at all
   - Set to a wrong collection ID (possibly MESSAGES collection ID)
   - Not being read correctly in production

2. **Collection Creation Issue**: The NOTES collection may not exist in Appwrite

3. **Code Issue**: Unlikely - code correctly uses `NOTES_ID` from env var

### Solution Path:
**CRITICAL CHECKS NEEDED (In Order):**

1. ✅ Verify `NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID` is set in Dokploy
2. ✅ Verify it points to a NOTES collection (not MESSAGES)
3. ✅ Verify NOTES collection exists in Appwrite Console
4. ✅ Verify NOTES collection has correct schema:
   - `user_id` (String, required)
   - `title` (String, required)
   - `content` (String)
   - `color` (String)
   - `pinned` (Boolean)

**If all verified and error persists:**
- Create a new NOTES collection with exact attributes above
- Update `NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID` to new collection ID
- Redeploy

---

## All Environment Variables Required

```bash
# Database
NEXT_PUBLIC_APPWRITE_DATABASE_ID=

# Collections
NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID=                    ← CHECK THIS!
NEXT_PUBLIC_APPWRITE_COUPONS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_CHAT_SETTINGS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_JOURNAL_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_MOODS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_PHOTOS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_PROFILE_MILESTONES_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_DATES_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_SOCIAL_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_SOCIAL_CONNECTIONS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_TRIVIA_COLLECTION_ID=

# Optional
NEXT_PUBLIC_APPWRITE_TEST_PASSWORDS_COLLECTION_ID=
```

