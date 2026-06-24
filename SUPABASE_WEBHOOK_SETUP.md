# Database Webhook Setup Guide - activities to broadcast

To enable real-time WebSocket topic synchronization when a new activity is inserted, you need to configure a Database Webhook in Supabase. This webhook will push database inserts into `/api/broadcast`.

Here are the two ways to set this up:

---

## Option 1: Supabase Dashboard UI (Recommended)

1. **Open Supabase Dashboard**: Go to your project dashboard.
2. **Navigate to Database Webhooks**:
   - In the left sidebar, click on **Integrations** or go directly to **Database** -> **Webhooks**.
   - If Webhooks are not enabled, click **Enable Database Webhooks**.
3. **Create a New Webhook**:
   - Click **Create Webhook**.
   - **Name**: `broadcast_activities_webhook`
   - **Table**: select `activities`
   - **Events**: check **Insert** (keep Update and Delete unchecked).
4. **Configure Webhook Target**:
   - **Method**: `POST`
   - **URL**: `https://<your-nextjs-deployed-domain>/api/broadcast`
   - **Timeout**: `5000` (default)
5. **Add Headers**:
   - Click **Add Header**
   - **Key**: `Content-Type`
   - **Value**: `application/json`
6. **Save**: Click **Create Webhook**.

---

## Option 2: Supabase SQL Editor (Advanced)

If you prefer using SQL or want to automate it via the SQL editor, run the following commands. This leverages Supabase's `pg_net` extension under the hood:

```sql
-- 1. Ensure the pg_net extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create the webhook trigger function
CREATE OR REPLACE FUNCTION public.broadcast_activity_webhook()
RETURNS TRIGGER AS $$
BEGIN
  -- Change '<your-nextjs-deployed-domain>' to your actual host
  PERFORM net.http_post(
    url := 'https://<your-nextjs-deployed-domain>/api/broadcast',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind the function to a trigger on activities insertion
CREATE OR REPLACE TRIGGER on_activity_inserted
  AFTER INSERT ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_activity_webhook();
```

> [!NOTE]
> For **local development testing**, you can use a tunneling tool like **ngrok** or **Localtunnel** to forward traffic to your local port (`http://localhost:3000/api/broadcast`). Use that tunnel URL as your webhook URL in Supabase.

---

## Webhook Payload Structure
When triggered, Supabase sends a payload to `/api/broadcast` with this JSON format:
```json
{
  "type": "INSERT",
  "table": "activities",
  "schema": "public",
  "record": {
    "id": "activities-uuid",
    "content": "activity log entry content",
    "event_type": "chat",
    "context": {
      "project_id": "akk-apps",
      "task_id": "task-uuid",
      "persona_id": "fullstack-developer"
    },
    "visibility": "public",
    "created_at": "2026-06-15T23:19:00Z"
  },
  "old_record": null
}
```
Our `/api/broadcast` handler automatically processes this payload and publishes it over the matching WebSocket topics.
