# OneSignal Web Push Setup

Push is optional. The workout system keeps working normally when OneSignal is not configured.

## 1. OneSignal Dashboard

1. Create a free OneSignal account at https://onesignal.com and create a **Web** app.
2. Set its site URL to `https://fwsololeveling.onrender.com` (use your exact production URL, without `www` unless you use it).
3. Choose **Custom Code** setup and use the root service worker filename `OneSignalSDKWorker.js`.
4. In **Settings > Keys & IDs**, copy the **OneSignal App ID** and **REST API Key**.

## 2. Render Environment Variables

Add these two required values to the web service in **Render > Environment**:

| Variable | Value |
| --- | --- |
| `MONGO_URI` | Your existing MongoDB connection string |
| `ONESIGNAL_APP_ID` | OneSignal **App ID** from Keys & IDs |
| `ONESIGNAL_REST_API_KEY` | OneSignal **REST API Key** from Keys & IDs — keep private |

`PUSH_CRON_SECRET` is only needed later when you add scheduled daily/streak notifications.

You do not need Firebase, a VAPID key, a service-account JSON, or a token database for OneSignal.

Do **not** commit any of those values. After saving variables, redeploy the Render web service. The **Settings** tab will then show **Enable Push Notifications** for supported browsers.

## 3. Render Cron Job

Create a separate Render **Cron Job** that runs every 15 minutes. Its command can be:

```bash
curl --fail --silent --show-error -X POST \
  -H "Authorization: Bearer $PUSH_CRON_SECRET" \
  https://fwsololeveling.onrender.com/api/internal/push/daily-reset
```

Give that Cron Job the same `PUSH_CRON_SECRET` environment variable. Replace the domain if the production service URL changes. The endpoint is protected and sends each type of scheduled alert at most once per Eastern Time day:

- Daily quests available after the new day starts.
- Streak reminder after 8 PM Eastern for hunters with an unfinished daily and an active streak.

Render may sleep or restart web services, so the Cron Job is the reliable trigger. The saved MongoDB notification metadata prevents duplicate sends after retries or restarts.

## 4. How Notifications Work

- A hunter enables alerts in **Hunter Progression > Settings** only after clicking the button.
- OneSignal stores browser subscriptions and assigns the selected hunter as the OneSignal External ID (`hunter-<playerId>`).
- Re-enabling does not duplicate the browser subscription; disabling opts the device out and logs out that hunter context.
- Level, rank/Boss Quest unlock, and completed-daily notifications are detected during the normal existing shared-save request.
- Party announcements are available through the protected `POST /api/admin/announce` endpoint with the existing admin passcode. It accepts only a short `title` and `message`.

The current Player Session chooser selects which shared hunter receives a device's notifications. It is not password authentication, so it should not be treated as private account security.
