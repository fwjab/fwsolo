# Firebase Web Push Setup

Push is optional. The workout system keeps working normally when Firebase is not configured.

## 1. Firebase Console

1. Create or select a Firebase project at https://console.firebase.google.com.
2. In **Project settings > General**, add a **Web app** and copy its web configuration values.
3. In **Project settings > Cloud Messaging > Web configuration**, generate a Web Push certificate key pair and copy the public VAPID key.
4. In **Project settings > Service accounts**, choose **Generate new private key**. Keep the downloaded JSON private.
5. In Google Cloud for the same project, ensure the **Firebase Cloud Messaging API** is enabled and the service account can use FCM.

The web API key and VAPID key are public browser configuration. The service-account JSON is private and must only be stored in Render environment variables.

## 2. Render Environment Variables

Add these three required values to the web service in **Render > Environment**:

| Variable | Value |
| --- | --- |
| `MONGO_URI` | Your existing MongoDB connection string |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | The **entire contents** of the downloaded service-account JSON, on one line |
| `FIREBASE_WEB_CONFIG_JSON` | The complete Firebase `firebaseConfig` object as one-line JSON |
| `FIREBASE_VAPID_KEY` | Public VAPID key from Cloud Messaging web configuration |

`PUSH_CRON_SECRET` is only needed later when you add scheduled daily/streak notifications.

Example `FIREBASE_WEB_CONFIG_JSON` value (replace every value with your own Firebase configuration):

```json
{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"...","measurementId":"..."}
```

The older separate `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, and related variables still work, but are no longer necessary when using `FIREBASE_WEB_CONFIG_JSON`.

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
- The browser obtains an FCM registration token and stores it in MongoDB's `notificationsubscriptions` collection with that selected hunter ID.
- Re-enabling updates the same token instead of duplicating it; disabling deletes it locally and on the server.
- Firebase-invalid tokens are deleted automatically after a failed send.
- Level, rank/Boss Quest unlock, and completed-daily notifications are detected during the normal existing shared-save request.
- Party announcements are available through the protected `POST /api/admin/announce` endpoint with the existing admin passcode. It accepts only a short `title` and `message`.

The current Player Session chooser selects which shared hunter receives a device's notifications. It is not password authentication, so it should not be treated as private account security.
