#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
FIREBASE_PROJECT="${FIREBASE_PROJECT:-lotlight-care}"
CLOUD_PROJECT="${CLOUD_PROJECT:-gen-lang-client-0444960702}"
REGION="${REGION:-us-central1}"
GCLOUD="${GCLOUD:-gcloud}"
npm run typecheck
npm test
npm run build:api
npm install --package-lock-only --prefix deploy-api
"$GCLOUD" run deploy lotlight-api --project="$CLOUD_PROJECT" --region="$REGION" --source=deploy-api --clear-base-image --service-account="lotlight-api@$CLOUD_PROJECT.iam.gserviceaccount.com" --set-env-vars="FIREBASE_PROJECT_ID=$FIREBASE_PROJECT,NODE_ENV=production" --allow-unauthenticated --min-instances=0 --max-instances=1 --memory=512Mi --cpu=1 --concurrency=40 --timeout=60 --quiet
LOTLIGHT_API_URL=$("$GCLOUD" run services describe lotlight-api --project="$CLOUD_PROJECT" --region="$REGION" --format='value(status.url)')
export LOTLIGHT_API_URL
node --input-type=module -e 'import fs from "node:fs"; const p="public/firebase-config.json"; const c=JSON.parse(fs.readFileSync(p,"utf8"));c.apiBase=process.env.LOTLIGHT_API_URL;fs.writeFileSync(p,JSON.stringify(c,null,2)+"\n");'
node scripts/prepare-public-artifacts.mjs
npm run build:firebase
npx --yes firebase-tools@15.7.0 deploy --only hosting,firestore:rules --project="$FIREBASE_PROJECT" --non-interactive
