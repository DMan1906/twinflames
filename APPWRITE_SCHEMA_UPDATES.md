# Appwrite Collection Schema Updates

Your deployment is failing because the Appwrite collections are missing attributes for the new features added. You need to manually add these fields in your Appwrite Console.

## How to Update Your Collections

1. Go to your Appwrite Console (usually at `http://your-appwrite-ip:80`)
2. Navigate to **Database** → **Collections**
3. For each collection below, add the missing attributes

---

## 1. Messages Collection

**Missing Attributes:**

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| `delivery_mode` | String | Yes | Values: `keep`, `view_once`, `replay` |
| `delete_period` | String | Yes | Values: `never`, `immediate`, `10m`, `1h`, `1d` |
| `expires_at` | DateTime | No | When message expires in chat |
| `seen_by_json` | String | No | JSON array of user IDs who viewed |

**Setup Steps:**
1. Open **Messages** collection
2. Click **+ Add Attribute**
3. For each field above:
   - **Attribute Name:** (exact name from table)
   - **Type:** Choose from dropdown
   - **Required:** Toggle on/off as noted
   - **Default value:** Empty
   - Click **Create**

---

## 2. Daily Progress Collection (if new)

If you don't have a `daily-progress` collection yet, create it:

| Collection | Attributes |
|------------|-----------|
| `daily_progress` | See Trinity Loop below |

---

## 3. Canvas Collection

**Missing Attributes:**

| Attribute | Type | Required |
|-----------|------|----------|
| `chat_id` | String | Yes |
| `sender_id` | String | Yes |
| `points` | String | Yes (JSON array) |
| `color` | String | Yes |
| `width` | Number | Yes |

---

## 4. Chat Delete Period Settings Collection (new)

Create a new collection `chat_delete_periods` if it doesn't exist:

**Attributes:**

| Attribute | Type | Required |
|-----------|------|----------|
| `chat_id` | String | Yes |
| `delete_period` | String | Yes |
| `set_by` | String | Yes |
| `$createdAt` | DateTime | Auto |
| `$updatedAt` | DateTime | Auto |

---

## Quick SQL Alternative (if using Appwrite Admin Panel)

If your Appwrite Console has a raw database access option, you can try these queries:

```sql
-- Add to Messages table
ALTER TABLE messages ADD COLUMN delivery_mode VARCHAR(50) DEFAULT 'keep';
ALTER TABLE messages ADD COLUMN delete_period VARCHAR(50) DEFAULT 'never';
ALTER TABLE messages ADD COLUMN expires_at TIMESTAMP;
ALTER TABLE messages ADD COLUMN seen_by_json TEXT;

-- Create chat_delete_periods table if needed
CREATE TABLE chat_delete_periods (
  id VARCHAR(36) PRIMARY KEY,
  chat_id VARCHAR(255) NOT NULL,
  delete_period VARCHAR(50) NOT NULL,
  set_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Verification Checklist

After updating collections, try this API call to verify:

```bash
# From your deployment server
curl -X POST http://localhost:8095/v1/databases/DB_ID/collections/MSG_COL_ID/documents \
  -H "X-Appwrite-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "test_doc",
    "data": {
      "chat_id": "test_chat",
      "sender_id": "user1",
      "content": "test_encrypted_content",
      "message_type": "text",
      "delivery_mode": "keep",
      "delete_period": "never"
    }
  }'
```

If successful (201 Created), the schema is correct.

---

## Common Issues

**Error: "Unknown attribute: delivery_mode"**
- The `delivery_mode` attribute doesn't exist in the Messages collection
- Solution: Add it following the steps above

**Error: "Invalid document structure"**
- You're trying to save a field that doesn't exist in the collection schema
- Solution: Add all attributes from the table above

**Error: "Attribute delivery_mode is required but not provided"**
- The field is required but you're not setting it
- Solution: Make sure `delivery_mode` is included in all message saves

---

## If You Can't Access Appwrite Console

If your Appwrite Console is not accessible, you can:

1. **SSH to your server** and run Appwrite CLI commands (if installed)
2. **Docker exec into Appwrite container:**
   ```bash
   docker exec -it appwrite-appwrite-1 appwrite collection list --database=DATABASE_ID
   ```
3. **Contact your Appwrite hosting provider** for database migration assistance

---

## After Schema Updates

1. Restart your Next.js app: `docker restart twinflame-twinflames-iipn7d`
2. Try sending a chat message again
3. If still failing, check the server logs: `docker logs twinflame-twinflames-iipn7d`

The error messages should now be more specific about any remaining schema issues.
