# Firebase release

Public app: https://lotlight-care.web.app

## Deployed resources

- Firebase project `lotlight-care`: Hosting, email/password Authentication and Firestore Native `(default)` in `us-central1`.
- API: `lotlight-api` in Google Cloud project `gen-lang-client-0444960702`, region `us-central1`.
- Runtime identity: `lotlight-api@gen-lang-client-0444960702.iam.gserviceaccount.com`.
- Firestore rules deny direct client access. The service identity has `roles/datastore.user` and read-only `roles/firebaseauth.viewer` in the Firebase project. Auth read access allows disabled, deleted and revoked account checks.
- Runtime limits: one maximum instance, zero minimum, 512 MiB memory, one CPU, 60-second request timeout.

The existing billed Google Cloud project hosts the isolated API because the account's billing-linked project quota blocked linking another project. Firebase Hosting/Auth/Firestore remain in the clean `lotlight-care` project. Cloud Run, builds, image storage and Firebase usage can incur charges beyond free quotas. This is not a promise of zero operating cost.

## Repeat deployment

Requires Node 22+, npm, authenticated gcloud and Firebase CLI permissions for these projects. Then run:

```sh
npm ci
GCLOUD=/path/to/gcloud bash scripts/deploy-firebase.sh
```

The script validates TypeScript and unit tests, bundles the API, generates a locked container install, deploys Cloud Run, updates the public API URL, builds the browser bundle, and publishes Hosting plus Firestore rules. It does not create projects, enable billing or change IAM.

## Recreate in other projects

Create Firebase Hosting, a web app, Firestore and email/password Authentication. Add both Hosting domains to authorized auth domains. Create an API runtime service account, grant it database access in the Firebase project, and deploy the API with FIREBASE_PROJECT_ID set correctly. Replace public/firebase-config.json with the new web app's public configuration. Update the hardcoded production origin allowlist in server/index.ts, Hosting site in firebase.json and .firebaserc. Set FIREBASE_PROJECT and CLOUD_PROJECT for the deployment script. These project variables alone do not rewrite application domain configuration.

Use separate test projects and Application Default Credentials for local API development. Do not download long-lived service-account keys. The production API intentionally rejects localhost browser origins.

## Smoke check

Open the public URL signed out. Run the synthetic workflow. Create an account, save an action and reload. Then sign out and verify that the anonymous demo does not show the account's changes. The automated Firebase test suite exercises isolation, actor forgery, stale writes and response gates using disposable identities.
