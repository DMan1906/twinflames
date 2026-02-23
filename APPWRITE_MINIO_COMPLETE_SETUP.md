# Complete Appwrite & MinIO Setup Guide

This document contains **everything** you need to set up your Appwrite database and MinIO storage for the TwinFlames application, including all collections, attributes, data types, constraints, and storage configuration.

---

## Table of Contents

1. [Appwrite Database Setup](#appwrite-database-setup)
2. [Collection Specifications](#collection-specifications)
3. [MinIO Object Storage Setup](#minio-object-storage-setup)
4. [Indexing Strategy](#indexing-strategy)
5. [Permissions & Security](#permissions--security)
6. [Verification Checklist](#verification-checklist)
7. [Troubleshooting](#troubleshooting)

---

## Appwrite Database Setup

### Prerequisites

- Appwrite instance running (v1.4+)
- Admin API key with database permissions
- Access to Appwrite Console (UI) or CLI

### Initial Database Creation

1. **Go to Appwrite Console** → Select your project
2. **Create a new Database** (if not already created) with ID: `main` or your preferred name
3. **Note the Database ID** for environment variable: `NEXT_PUBLIC_APPWRITE_DATABASE_ID`

### Quick API Command (Alternative to UI)

```bash
curl -X POST https://your-appwrite-instance/v1/databases \
  -H "X-Appwrite-Key: YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "databaseId": "main",
    "name": "TwinFlames Database"
  }'
```

---

## Collection Specifications

### Overview

Total Collections Needed: **18**

| Collection | ID | Purpose | Records Type | Required |
|----------|-----|---------|--------------|----------|
| Profiles | `profiles` | User account data | Document | ✅ YES |
| Journal | `journal` | Vault entries | Document | ✅ YES |
| Messages | `messages` | Chat messages | Document | ✅ YES |
| Canvas | `canvas` | Shared drawing | Document | ✅ YES |
| Moods | `moods` | Daily Trinity moods | Document | ✅ YES |
| Photos | `daily_photos` | Daily Trinity photos | Document | ✅ YES |
| Streaks | `streaks` | Streak tracking | Document | ✅ YES |
| Daily Progress | `daily_progress` | Trinity completion | Document | ✅ YES |
| Notes | `notes` | User notes | Document | ✅ YES |
| Coupons | `coupons` | Rewards/coupons | Document | ✅ YES |
| Bucket List | `bucket_list` | Shared goals | Document | ✅ YES |
| Trivia Sessions | `trivia_sessions` | Game data | Document | ✅ YES |
| Profile Milestones | `profile_milestones` | Achievements | Document | ✅ YES |
| Fantasy | `fantasy` | Fantasy scenarios | Document | ✅ YES |
| Thumb Kiss | `thumbkiss` | Touch log | Document | ✅ YES |
| Memories | `memories` | Saved moments | Document | ✅ YES |
| Dates | `dates` | Date ideas log | Document | ✅ YES |
| Chat Settings | `chat_settings` | Message settings | Document | ⚠️ OPTIONAL |
| Social | `social` | Social media posts | Document | ⚠️ OPTIONAL |
| Social Connections | `social_connections` | Social links | Document | ⚠️ OPTIONAL |

---

## Detailed Collection Schemas

### 1. **Profiles Collection**
**Collection ID:** `profiles`  
**Purpose:** Store user account information and couple pairing data

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `user_id` | String | 128 | ✅ | ✅ | ❌ | N/A | Appwrite user ID |
| `name` | String | 256 | ✅ | ❌ | ❌ | N/A | Full name |
| `email` | String | 256 | ✅ | ✅ | ❌ | N/A | Email address |
| `avatar_url` | String | 512 | ❌ | ❌ | ❌ | Empty | Profile picture URL (MinIO) |
| `partner_id` | String | 128 | ❌ | ❌ | ❌ | Null | Paired user's ID |
| `pair_code` | String | 8 | ✅ | ✅ | ❌ | N/A | 8-char code for pairing |
| `last_daily_reset` | String | 10 | ❌ | ❌ | ❌ | Empty | YYYY-MM-DD format |
| `bio` | String | 512 | ❌ | ❌ | ✅ | Empty | Encrypted bio |
| `connected_at` | String | 20 | ❌ | ❌ | ❌ | Empty | ISO timestamp |

**Indexes:**
- Primary: `user_id` (Unique)
- Index 1: `pair_code` (Unique)
- Index 2: `partner_id`

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"],
  "delete": ["role:authenticated"]
}
```

**Document ID Strategy:** Use user's Appwrite user ID as the document ID

---

### 2. **Journal Collection**
**Collection ID:** `journal`  
**Purpose:** Store couple's daily journal entries (Vault)

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `chat_id` | String | 256 | ✅ | ❌ | ❌ | N/A | Generated from pair (user_a_user_b) |
| `user_id` | String | 128 | ✅ | ❌ | ❌ | N/A | Author user ID |
| `prompt` | String | 512 | ✅ | ❌ | ❌ | N/A | Daily question |
| `content` | String | 4096 | ✅ | ❌ | ✅ | N/A | Encrypted journal entry |
| `is_revealed` | Boolean | - | ✅ | ❌ | ❌ | false | Both answered? |
| `partner_revealed` | Boolean | - | ⚠️ | ❌ | ❌ | false | Partner saw it? |

**Indexes:**
- Index 1: `chat_id` + `prompt` (for daily lookups)
- Index 2: `chat_id` + `is_revealed` (for vault display)
- Index 3: `user_id` + `$createdAt` (for user history)

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"],
  "delete": ["role:authenticated"]
}
```

---

### 3. **Messages Collection**
**Collection ID:** `messages`  
**Purpose:** Store encrypted chat messages between couples

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `chat_id` | String | 256 | ✅ | ❌ | ❌ | N/A | Couple identifier |
| `sender_id` | String | 128 | ✅ | ❌ | ❌ | N/A | Who sent it |
| `content` | String | 8192 | ✅ | ❌ | ✅ | N/A | Encrypted message |
| `message_type` | String | 32 | ✅ | ❌ | ❌ | `text` | `text`, `image`, `video` |
| `delivery_mode` | String | 32 | ✅ | ❌ | ❌ | `keep` | `keep`, `view_once`, `replay` |
| `delete_period` | String | 32 | ✅ | ❌ | ❌ | `never` | `never`, `immediate`, `10m`, `1h`, `1d` |
| `allowed_views` | Integer | - | ✅ | ❌ | ❌ | 0 | For view_once: 1, replay: 2 |
| `view_count` | Integer | - | ✅ | ❌ | ❌ | 0 | Times opened |
| `seen_by_json` | String | 2048 | ✅ | ❌ | ❌ | `[]` | JSON array of user IDs |
| `opened_by_json` | String | 2048 | ⚠️ | ❌ | ❌ | `{}` | JSON object with timestamps |
| `expires_at` | String | 20 | ❌ | ❌ | ❌ | Empty | ISO timestamp |

**Indexes:**
- Index 1: `chat_id` + `$createdAt` (for message history)
- Index 2: `sender_id` (for user messages)
- Index 3: `delete_period` (for cleanup jobs)

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"],
  "delete": ["role:authenticated"]
}
```

---

### 4. **Canvas Collection**
**Collection ID:** `canvas`  
**Purpose:** Store real-time shared drawing strokes

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `chat_id` | String | 256 | ✅ | ❌ | ❌ | N/A | Couple identifier |
| `sender_id` | String | 128 | ✅ | ❌ | ❌ | N/A | Who drew |
| `points` | String | 65536 | ✅ | ❌ | ❌ | N/A | JSON array of {x, y} |
| `color` | String | 7 | ✅ | ❌ | ❌ | `#000000` | Hex color code |
| `width` | Double | - | ✅ | ❌ | ❌ | 2 | Brush width in pixels |

**Indexes:**
- Index 1: `chat_id` + `$createdAt` (for session replay)
- Index 2: `sender_id` (for user strokes)

**Permissions:** Realtime write needed
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"]
}
```

---

### 5. **Moods Collection**
**Collection ID:** `moods`  
**Purpose:** Daily mood check-ins for Daily Trinity feature

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `chat_id` | String | 256 | ✅ | ❌ | ❌ | N/A | Couple identifier |
| `user_id` | String | 128 | ✅ | ❌ | ❌ | N/A | Who submitted |
| `mood_level` | Integer | - | ✅ | ❌ | ❌ | N/A | 1-5 scale |
| `mood_note` | String | 1024 | ❌ | ❌ | ✅ | Empty | Encrypted note |
| `created_at` | String | 10 | ✅ | ❌ | ❌ | N/A | YYYY-MM-DD |

**Indexes:**
- Index 1: `chat_id` + `created_at` (for daily lookups)
- Index 2: `user_id` + `created_at` (for user history)
- Index 3: `chat_id` + `user_id` + `created_at` (unique check)

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"]
}
```

---

### 6. **Daily Photos Collection**
**Collection ID:** `daily_photos`  
**Purpose:** Daily Trinity photo submissions

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `chat_id` | String | 256 | ✅ | ❌ | ❌ | N/A | Couple identifier |
| `user_id` | String | 128 | ✅ | ❌ | ❌ | N/A | Who submitted |
| `front_camera_url` | String | 512 | ✅ | ❌ | ❌ | N/A | MinIO URL |
| `back_camera_url` | String | 512 | ✅ | ❌ | ❌ | N/A | MinIO URL |
| `created_at` | String | 10 | ✅ | ❌ | ❌ | N/A | YYYY-MM-DD |

**Indexes:**
- Index 1: `chat_id` + `created_at` (for daily history)
- Index 2: `user_id` + `created_at`

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"]
}
```

---

### 7. **Streaks Collection**
**Collection ID:** `streaks`  
**Purpose:** Track Daily Trinity completion streaks

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `chat_id` | String | 256 | ✅ | ✅ | ❌ | N/A | Couple identifier |
| `current_count` | Integer | - | ✅ | ❌ | ❌ | 0 | Days in current streak |
| `best_count` | Integer | - | ✅ | ❌ | ❌ | 0 | All-time high |
| `last_completed_date` | String | 10 | ❌ | ❌ | ❌ | Empty | YYYY-MM-DD |

**Indexes:**
- Primary: `chat_id` (Unique)

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"]
}
```

---

### 8. **Daily Progress Collection**
**Collection ID:** `daily_progress`  
**Purpose:** Track Daily Trinity completion status

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `chat_id` | String | 256 | ✅ | ❌ | ❌ | N/A | Couple identifier |
| `date` | String | 10 | ✅ | ❌ | ❌ | N/A | YYYY-MM-DD |
| `mood_complete` | Boolean | - | ✅ | ❌ | ❌ | false | Mood submitted? |
| `photo_complete` | Boolean | - | ✅ | ❌ | ❌ | false | Photos submitted? |
| `journal_complete` | Boolean | - | ✅ | ❌ | ❌ | false | Journal done? |
| `all_complete` | Boolean | - | ✅ | ❌ | ❌ | false | Trinity complete? |

**Indexes:**
- Index 1: `chat_id` + `date` (Unique)

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"]
}
```

---

### 9. **Notes Collection**
**Collection ID:** `notes`  
**Purpose:** User personal notes

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `user_id` | String | 128 | ✅ | ❌ | ❌ | N/A | Note owner |
| `title` | String | 256 | ✅ | ❌ | ❌ | N/A | Note title |
| `content` | String | 8192 | ✅ | ❌ | ✅ | N/A | Encrypted content |
| `color` | String | 7 | ❌ | ❌ | ❌ | `#FFFFFF` | Hex color |
| `pinned` | Boolean | - | ❌ | ❌ | ❌ | false | Pinned status |

**Indexes:**
- Index 1: `user_id` + `pinned` (for display)
- Index 2: `user_id` + `$createdAt` (for sorting)

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"],
  "delete": ["role:authenticated"]
}
```

---

### 10. **Coupons Collection**
**Collection ID:** `coupons`  
**Purpose:** Couple reward coupons/gifts

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `chat_id` | String | 256 | ✅ | ❌ | ❌ | N/A | Couple identifier |
| `created_by` | String | 128 | ✅ | ❌ | ❌ | N/A | Creator user ID |
| `title` | String | 256 | ✅ | ❌ | ❌ | N/A | Coupon title |
| `description` | String | 1024 | ✅ | ❌ | ✅ | N/A | Encrypted description |
| `redeemed` | Boolean | - | ✅ | ❌ | ❌ | false | Used? |
| `redeemed_at` | String | 20 | ❌ | ❌ | ❌ | Empty | ISO timestamp |

**Indexes:**
- Index 1: `chat_id` + `redeemed`
- Index 2: `created_by`

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"]
}
```

---

### 11. **Bucket List Collection**
**Collection ID:** `bucket_list`  
**Purpose:** Couple's shared goals and wishes

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `chat_id` | String | 256 | ✅ | ❌ | ❌ | N/A | Couple identifier |
| `created_by` | String | 128 | ✅ | ❌ | ❌ | N/A | Creator user ID |
| `title` | String | 256 | ✅ | ❌ | ❌ | N/A | Goal title |
| `description` | String | 1024 | ❌ | ❌ | ✅ | Empty | Encrypted description |
| `completed` | Boolean | - | ✅ | ❌ | ❌ | false | Completed? |
| `completed_at` | String | 20 | ❌ | ❌ | ❌ | Empty | ISO timestamp |
| `priority` | String | 16 | ❌ | ❌ | ❌ | `medium` | `low`, `medium`, `high` |

**Indexes:**
- Index 1: `chat_id` + `completed`
- Index 2: `chat_id` + `priority`

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"],
  "delete": ["role:authenticated"]
}
```

---

### 12. **Trivia Sessions Collection**
**Collection ID:** `trivia_sessions`  
**Purpose:** Couple's trivia game sessions and scores

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `chat_id` | String | 256 | ✅ | ❌ | ❌ | N/A | Couple identifier |
| `user1_id` | String | 128 | ✅ | ❌ | ❌ | N/A | First player |
| `user2_id` | String | 128 | ✅ | ❌ | ❌ | N/A | Second player |
| `user1_score` | Integer | - | ✅ | ❌ | ❌ | 0 | Player 1 score |
| `user2_score` | Integer | - | ✅ | ❌ | ❌ | 0 | Player 2 score |
| `questions_json` | String | 8192 | ✅ | ❌ | ❌ | `[]` | JSON array of Q&A |
| `status` | String | 16 | ✅ | ❌ | ❌ | `active` | `active`, `completed` |

**Indexes:**
- Index 1: `chat_id` + `$createdAt`
- Index 2: `status`

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"]
}
```

---

### 13. **Profile Milestones Collection**
**Collection ID:** `profile_milestones`  
**Purpose:** Couple relationship milestones and achievements

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `user_id` | String | 128 | ✅ | ❌ | ❌ | N/A | User/couple ID |
| `title` | String | 256 | ✅ | ❌ | ❌ | N/A | Milestone name |
| `description` | String | 512 | ❌ | ❌ | ✅ | Empty | Encrypted milestone |
| `type` | String | 32 | ✅ | ❌ | ❌ | `custom` | anniversary, streak, custom |
| `date` | String | 10 | ❌ | ❌ | ❌ | Empty | YYYY-MM-DD |

**Indexes:**
- Index 1: `user_id` + `type`
- Index 2: `user_id` + `$createdAt`

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"]
}
```

---

### 14. **Fantasy Collection**
**Collection ID:** `fantasy`  
**Purpose:** Couple's fantasy scenarios and experiences

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `chat_id` | String | 256 | ✅ | ❌ | ❌ | N/A | Couple identifier |
| `created_by` | String | 128 | ✅ | ❌ | ❌ | N/A | Creator user ID |
| `title` | String | 256 | ✅ | ❌ | ❌ | N/A | Fantasy title |
| `content` | String | 4096 | ✅ | ❌ | ✅ | N/A | Encrypted fantasy |
| `category` | String | 32 | ❌ | ❌ | ❌ | Empty | Category tag |
| `status` | String | 16 | ✅ | ❌ | ❌ | `saved` | `saved`, `explored` |

**Indexes:**
- Index 1: `chat_id` + `status`
- Index 2: `created_by`

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"],
  "delete": ["role:authenticated"]
}
```

---

### 15. **Thumb Kiss Collection**
**Collection ID:** `thumbkiss`  
**Purpose:** Log of thumb kisses (intimate touch moments)

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `chat_id` | String | 256 | ✅ | ❌ | ❌ | N/A | Couple identifier |
| `sender_id` | String | 128 | ✅ | ❌ | ❌ | N/A | Who sent it |
| `message` | String | 256 | ❌ | ❌ | ✅ | Empty | Optional message |
| `emoji` | String | 4 | ✅ | ❌ | ❌ | `👍` | Emoji used |

**Indexes:**
- Index 1: `chat_id` + `$createdAt`
- Index 2: `sender_id`

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"]
}
```

---

### 16. **Memories Collection**
**Collection ID:** `memories`  
**Purpose:** Saved relationship memories and photos

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `chat_id` | String | 256 | ✅ | ❌ | ❌ | N/A | Couple identifier |
| `created_by` | String | 128 | ✅ | ❌ | ❌ | N/A | Creator user ID |
| `title` | String | 256 | ✅ | ❌ | ❌ | N/A | Memory title |
| `description` | String | 1024 | ❌ | ❌ | ✅ | Empty | Encrypted description |
| `photo_url` | String | 512 | ❌ | ❌ | ❌ | Empty | MinIO URL |
| `memory_date` | String | 10 | ❌ | ❌ | ❌ | Empty | When it happened |

**Indexes:**
- Index 1: `chat_id` + `memory_date`
- Index 2: `created_by`

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"]
}
```

---

### 17. **Dates Collection**
**Collection ID:** `dates`  
**Purpose:** Date ideas and date history

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `chat_id` | String | 256 | ✅ | ❌ | ❌ | N/A | Couple identifier |
| `title` | String | 256 | ✅ | ❌ | ❌ | N/A | Date title |
| `summary` | String | 512 | ✅ | ❌ | ❌ | N/A | Short description |
| `plan` | String | 4096 | ❌ | ❌ | ❌ | Empty | JSON array of steps |
| `category` | String | 32 | ✅ | ❌ | ❌ | N/A | cozy, adventurous, etc. |
| `budget` | String | 16 | ❌ | ❌ | ❌ | `medium` | free, low, medium, high |
| `source` | String | 16 | ✅ | ❌ | ❌ | `quick` | `quick`, `ai` |
| `completed` | Boolean | - | ✅ | ❌ | ❌ | false | Did you do it? |
| `completed_at` | String | 20 | ❌ | ❌ | ❌ | Empty | ISO timestamp |

**Indexes:**
- Index 1: `chat_id` + `completed`
- Index 2: `chat_id` + `category`

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"]
}
```

---

### 18. **Chat Settings Collection** (OPTIONAL)
**Collection ID:** `chat_settings`  
**Purpose:** Message deletion and chat preferences

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `chat_id` | String | 256 | ✅ | ✅ | ❌ | N/A | Couple identifier |
| `delete_period` | String | 32 | ✅ | ❌ | ❌ | `never` | never, immediate, 10m, 1h, 1d |
| `set_by` | String | 128 | ❌ | ❌ | ❌ | Empty | Who set it |

**Indexes:**
- Primary: `chat_id` (Unique)

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"]
}
```

---

### 19. **Social Collection** (OPTIONAL)
**Collection ID:** `social`  
**Purpose:** Social media integration and posts

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `user_id` | String | 128 | ✅ | ❌ | ❌ | N/A | User ID |
| `platform` | String | 32 | ✅ | ❌ | ❌ | N/A | Instagram, YouTube, etc. |
| `platform_id` | String | 256 | ✅ | ❌ | ❌ | N/A | Platform user/channel ID |
| `username` | String | 256 | ✅ | ❌ | ❌ | N/A | Display name |
| `access_token` | String | 2048 | ❌ | ❌ | ✅ | Empty | Encrypted OAuth token |
| `refresh_token` | String | 2048 | ❌ | ❌ | ✅ | Empty | Encrypted refresh token |
| `expires_at` | String | 20 | ❌ | ❌ | ❌ | Empty | ISO timestamp |

**Indexes:**
- Index 1: `user_id` + `platform`

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"]
}
```

---

### 20. **Social Connections Collection** (OPTIONAL)
**Collection ID:** `social_connections`  
**Purpose:** Social media accounts connected to user profile

| Attribute | Type | Size | Required | Unique | Encrypted | Default | Notes |
|-----------|------|------|----------|--------|-----------|---------|-------|
| `user_id` | String | 128 | ✅ | ❌ | ❌ | N/A | User ID |
| `platform` | String | 32 | ✅ | ❌ | ❌ | N/A | Platform name |
| `username` | String | 256 | ✅ | ❌ | ❌ | N/A | Username |
| `profile_url` | String | 512 | ❌ | ❌ | ❌ | Empty | Link to profile |
| `verified` | Boolean | - | ✅ | ❌ | ❌ | false | Connection verified? |

**Indexes:**
- Index 1: `user_id` + `platform` (Unique)

**Permissions:**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"]
}
```

---

## MinIO Object Storage Setup

### Prerequisites

- MinIO instance running (accessible via `http://your-minio-ip:9090`)
- Admin credentials (username & password)
- MinIO Client (`mc`) installed or use Appwrite Storage

### MinIO Buckets & Access

Create **2 buckets** for the application:

#### Bucket 1: `user-uploads`
**Purpose:** User-generated content (photos, images, documents)

```bash
# Create bucket
mc mb minio/user-uploads

# Set versioning (optional, for data protection)
mc version enable minio/user-uploads

# Set lifecycle policy (delete old photos after 90 days)
mc ilm rule add --expiry-days 90 minio/user-uploads
```

**Default Permissions (Public Read):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::user-uploads/*"
    }
  ]
}
```

#### Bucket 2: `thumbnails`
**Purpose:** Auto-generated image thumbnails (for performance)

```bash
# Create bucket
mc mb minio/thumbnails

# Set public read access
mc policy set public minio/thumbnails
```

---

### Appwrite Storage Integration

In **Appwrite Console → Storage**, create storage buckets that reference MinIO:

1. **Bucket Name:** `user-uploads`
   - **Type:** Document
   - **Endpoint:** `http://your-minio-ip:9090/user-uploads`
   - **Permissions:** Authenticated users can upload

2. **Bucket Name:** `thumbnails`
   - **Type:** Document
   - **Endpoint:** `http://your-minio-ip:9090/thumbnails`
   - **Permissions:** Public read

---

### File Upload Guidelines

**Max file sizes:**
- Images: 50 MB
- Videos: 500 MB
- Documents: 10 MB

**Allowed MIME types:**
```javascript
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
];
```

**File naming convention:**
```
/user-uploads/{chat_id}/{user_id}/{category}/{timestamp}-{filename}

Example:
/user-uploads/user1_user2/user1/photos/1708864800000-beach-trip.jpg
```

---

## Indexing Strategy

### Performance Indexes

All collections should have the following indexes for optimal performance:

| Collection | Index Name | Fields | Type | Unique |
|----------|-----------|--------|------|--------|
| profiles | `user_id_idx` | user_id | Primary | ✅ |
| profiles | `pair_code_idx` | pair_code | Unique | ✅ |
| journal | `chat_id_created_idx` | chat_id, $createdAt | Regular | ❌ |
| messages | `chat_id_time_idx` | chat_id, $createdAt | Regular | ❌ |
| moods | `daily_check_idx` | chat_id, created_at | Regular | ❌ |
| daily_photos | `photo_date_idx` | chat_id, created_at | Regular | ❌ |
| streaks | `chat_id_idx` | chat_id | Unique | ✅ |
| dates | `category_idx` | chat_id, category | Regular | ❌ |

---

## Permissions & Security

### User Roles

**Default Roles in Appwrite:**
- `role:authenticated` - Logged in users

### Collection-Level Permissions

**Pattern 1: Personal/Private Data (Notes, Milestones)**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"],
  "delete": ["role:authenticated"]
}
```

**Pattern 2: Couple Data (Messages, Canvas, Journal)**
```json
{
  "create": ["role:authenticated"],
  "read": ["role:authenticated"],
  "update": ["role:authenticated"],
  "delete": ["role:authenticated"]
}
```
*Note: Server-side validation ensures couple can only access their own chat_id*

**Pattern 3: Read-Only Partner Access (Milestones)**
```json
{
  "create": ["user:userId"],
  "read": ["role:authenticated"],
  "update": ["user:userId"]
}
```

### Encryption Fields

The following fields use end-to-end encryption (AES-256):
- **Journal**: content
- **Messages**: content, opened_by_json
- **Moods**: mood_note
- **Notes**: content
- **Coupons**: description
- **Memories**: description
- **Fantasy**: content
- **Thumb Kiss**: message
- **Social**: access_token, refresh_token

Encryption/Decryption is handled in `src/lib/crypto.ts`

---

## Verification Checklist

### Step 1: Create All Collections in Appwrite

- [ ] Profiles collection created with all attributes
- [ ] Journal collection created with all attributes
- [ ] Messages collection created with all 10 attributes
- [ ] Canvas collection created
- [ ] Moods collection created
- [ ] Daily Photos collection created
- [ ] Streaks collection created
- [ ] Daily Progress collection created
- [ ] Notes collection created
- [ ] Coupons collection created
- [ ] Bucket List collection created
- [ ] Trivia Sessions collection created
- [ ] Profile Milestones collection created
- [ ] Fantasy collection created
- [ ] Thumb Kiss collection created
- [ ] Memories collection created
- [ ] Dates collection created
- [ ] Chat Settings collection created (optional)
- [ ] Social collection created (optional)
- [ ] Social Connections collection created (optional)

### Step 2: Create All Indexes

- [ ] Profiles indexes created (user_id, pair_code, partner_id)
- [ ] Journal indexes created (chat_id+prompt, chat_id+is_revealed)
- [ ] Messages indexes created (chat_id+date, sender_id, delete_period)
- [ ] Moods indexes created (chat_id+date, user_id+date)
- [ ] Dates indexes created (chat_id+completed, chat_id+category)
- [ ] All other collections have proper indexes

### Step 3: Set Permissions

- [ ] Collection-level permissions set for all collections
- [ ] Users can only access their own data
- [ ] Partner access configured for couple data
- [ ] Public data is properly marked as readable

### Step 4: MinIO Setup

- [ ] MinIO running and accessible
- [ ] `user-uploads` bucket created
- [ ] `thumbnails` bucket created
- [ ] Public read permissions set on thumbnails
- [ ] Lifecycle policies configured

### Step 5: Environment Variables

- [ ] `NEXT_PUBLIC_APPWRITE_DATABASE_ID` set
- [ ] `NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID` set
- [ ] All other collection IDs set in `.env`
- [ ] `MINIO_ENDPOINT` set (format: `host:port`)
- [ ] `MINIO_ACCESS_KEY` set
- [ ] `MINIO_SECRET_KEY` set
- [ ] `NEXT_PUBLIC_APPWRITE_ENDPOINT` set
- [ ] `NEXT_PUBLIC_APPWRITE_PROJECT` set

### Step 6: Test Write & Read Operations

```bash
# Test creating a profile
curl -X POST http://localhost:8095/v1/databases/DB_ID/collections/PROFILES_COL_ID/documents \
  -H "X-Appwrite-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "test_user_123",
    "data": {
      "user_id": "test_user_123",
      "name": "Test User",
      "email": "test@example.com",
      "pair_code": "ABC12345"
    }
  }'

# Should return 201 Created
```

---

## Troubleshooting

### Error: "Collection not found"

**Cause:** Collection ID doesn't match between environment variables and Appwrite

**Fix:**
1. Go to Appwrite Console → Database → Collections
2. Copy the exact collection ID shown in the URL
3. Update `.env` with matching ID
4. Restart application

---

### Error: "Unknown attribute: [attribute_name]"

**Cause:** Attribute doesn't exist in collection schema

**Fix:**
1. Check the collection schema above
2. Add the missing attribute in Appwrite Console
3. Ensure the attribute type and size match the table
4. If required, make sure "Required" toggle is on

---

### Error: "Permission denied"

**Cause:** User doesn't have permission to access document

**Fix:**
1. Check collection permissions in Appwrite Console
2. Ensure `role:authenticated` has appropriate permissions
3. For couple data, verify both users are in the same relationship
4. Check that server-side validation allows the operation

---

### MinIO: "Invalid endPoint"

**Cause:** MinIO endpoint in wrong format

**Fix:**
- Correct format: `hostname:port` (e.g., `192.168.1.100:9090`)
- With protocol: `http://hostname:port` (also works)
- Endpoints are parsed in `src/lib/minio.ts`

---

### Appwrite WebSocket Not Connecting

**Cause:** WebSocket endpoint misconfigured

**Fix:**
1. Ensure `NEXT_PUBLIC_APPWRITE_ENDPOINT` has no trailing `/v1`
2. Check firewall allows WebSocket traffic to port 8095
3. Verify Appwrite is running: `curl http://endpoint:8095/v1/health`

---

## Quick Command Reference

### Create All Collections at Once (via CLI)

```bash
# Using Appwrite CLI
appwrite projects add
appwrite databases add
appwrite collections add --collectionId profiles --name "Profiles"
appwrite collections add --collectionId journal --name "Journal Entries"
# ... repeat for all 20 collections
```

### Backup Collections

```bash
# Export database
appwrite databases export --databaseId main > backup.json

# This creates a backup of all schemas (not data)
```

### Reset Everything (Careful!)

```bash
# In Appwrite Console: Database → Collections → Delete All
# Then recreate using the schemas above

# Or use API:
curl -X DELETE http://localhost:8095/v1/databases/main/collections/profiles \
  -H "X-Appwrite-Key: YOUR_API_KEY"
```

---

## Complete Setup Summary

**Total Setup Time:** ~30-45 minutes

**Steps:**
1. Create database in Appwrite (2 min)
2. Create all 20 collections (5 min)
3. Add attributes to collections (10 min)
4. Create indexes (5 min)
5. Set permissions (5 min)
6. Set up MinIO buckets (3 min)
7. Configure environment variables (3 min)
8. Test write/read operations (5 min)

**After Setup:**
- Application should start without collection errors
- WebSocket subscriptions should work
- File uploads should save to MinIO
- Real-time updates should sync across clients

---

## Support & Debugging

If collections fail to create:
1. Check Appwrite logs: `docker logs appwrite-appwrite-1`
2. Verify database exists: `curl http://endpoint:8095/v1/databases`
3. Check API key has permissions: `curl -H "X-Appwrite-Key: KEY" http://endpoint:8095/v1/users`

If data operations fail:
1. Verify collection exists with correct ID
2. Check all required attributes are present
3. Ensure attribute types match (String != Integer)
4. Validate user has create/read/update permissions

---

**Document Version:** 1.0  
**Last Updated:** February 23, 2026  
**Created for:** TwinFlames Application v1.0
