#!/usr/bin/env bash
# ==============================================================================
# iNoU Production/QA Deployment Launcher for Google Cloud (Cloud Run & Firebase)
# Branch Policy:
#   - 'main'        -> Deploys to 'prod' environment
#   - 'development' -> Deploys to 'qa' environment
#   - Other         -> Deployment blocked
# Components:
#   - 'web'   -> Web UI, Mobile Terminal (/m), PWA Assets & API Gateway on Cloud Run
#   - 'cloud' -> Firestore/Storage Rules, Database Indexes, Functions & Triggers
#   - 'full'  -> Complete Deployment ('web' + 'cloud')
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

# 1. Parse Command-Line Flags
SELECTED_COMPONENT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -c|--component)
      SELECTED_COMPONENT="$2"
      shift 2
      ;;
    --component=*)
      SELECTED_COMPONENT="${1#*=}"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# 2. Detect & Validate Git Branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

if [ "$CURRENT_BRANCH" = "main" ]; then
  DEPLOY_ENV="prod"
  SERVICE_NAME="inou-prod"
elif [ "$CURRENT_BRANCH" = "development" ] || [ "$CURRENT_BRANCH" = "dev" ]; then
  DEPLOY_ENV="qa"
  SERVICE_NAME="inou-qa"
else
  echo "============================================================"
  echo "❌ Deployment Blocked: Invalid Branch"
  echo "============================================================"
  echo "Current Branch: '$CURRENT_BRANCH'"
  echo "👉 Deployments are strictly restricted to:"
  echo "   • 'main'        -> 'prod' environment"
  echo "   • 'development' -> 'qa' environment"
  echo "Please checkout to 'main' or 'development' before deploying."
  exit 1
fi

VERSION=$(node -e "try { console.log(require('./package.json').version); } catch { console.log('0.4.76'); }")

echo "============================================================"
echo "🚀 iNoU Deployment Engine (v$VERSION)"
echo "🌿 Branch        : $CURRENT_BRANCH"
echo "🎯 Target Env    : $DEPLOY_ENV ($SERVICE_NAME)"
echo "============================================================"

# 3. Interactive Component Selection (if not provided via CLI)
if [ -z "$SELECTED_COMPONENT" ]; then
  echo "Select component to deploy:"
  echo "  1) full  - Full Stack ('web' Cloud Run + 'cloud' Rules, Indexes & Functions)"
  echo "  2) web   - Web UI, Mobile Terminal (/m), PWA Assets & API Gateway Container"
  echo "  3) cloud - Cloud Infrastructure (Firestore/Storage Rules, Indexes, Functions)"
  read -p "Enter choice [1-3] (default: 1): " COMP_CHOICE

  case "$COMP_CHOICE" in
    2) SELECTED_COMPONENT="web" ;;
    3) SELECTED_COMPONENT="cloud" ;;
    *) SELECTED_COMPONENT="full" ;;
  esac
fi

echo "📦 Component     : $SELECTED_COMPONENT"
echo "------------------------------------------------------------"

# 4. Check gcloud CLI
if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: Google Cloud CLI ('gcloud') is not installed."
  echo "👉 Install it from: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# 5. Resolve GCP Project ID
GCP_PROJECT="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
if [ -z "$GCP_PROJECT" ] || [ "$GCP_PROJECT" = "(unset)" ]; then
  read -p "Enter your Google Cloud Project ID: " GCP_PROJECT
fi

if [ -z "$GCP_PROJECT" ]; then
  echo "❌ Error: GCP Project ID is required."
  exit 1
fi

GCP_REGION="${GCP_REGION:-us-central1}"
IMAGE_TAG="gcr.io/${GCP_PROJECT}/${SERVICE_NAME}:v${VERSION}"

echo "📋 Target Project: $GCP_PROJECT"
echo "📍 Target Region : $GCP_REGION"
echo "------------------------------------------------------------"

# 6. Function: Deploy Web Component (Cloud Run Container)
deploy_web() {
  echo "🔧 Enabling Cloud Run & Cloud Build APIs..."
  gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com --project="$GCP_PROJECT"

  echo "📦 Building & submitting container image via Cloud Build..."
  gcloud builds submit --tag "$IMAGE_TAG" --project="$GCP_PROJECT" .

  echo "🚀 Deploying $SERVICE_NAME to Cloud Run ($DEPLOY_ENV)..."
  gcloud run deploy "$SERVICE_NAME" \
    --image "$IMAGE_TAG" \
    --platform managed \
    --region "$GCP_REGION" \
    --allow-unauthenticated \
    --port 8765 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --set-env-vars="NODE_ENV=production,PORT=8765,INUO_DATA_DIR=/app/data,DEPLOY_ENV=$DEPLOY_ENV" \
    --project="$GCP_PROJECT"

  SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --platform managed --region "$GCP_REGION" --project="$GCP_PROJECT" --format="value(status.url)" 2>/dev/null || echo "https://${SERVICE_NAME}-${GCP_PROJECT}.run.app")

  echo "============================================================"
  echo "✨ Web Component Deployment Successful! ($DEPLOY_ENV) ✨"
  echo "🌐 Web UI & API   : $SERVICE_URL"
  echo "📱 Mobile Terminal: $SERVICE_URL/m"
  echo "🩺 Health Check   : $SERVICE_URL/health"
  echo "============================================================"
}

# 7. Function: Deploy Cloud Component (Rules, Indexes, Functions)
deploy_cloud() {
  echo "🔒 Deploying Cloud Infrastructure (Rules, Indexes, Triggers)..."
  if command -v firebase &> /dev/null; then
    firebase deploy --only firestore:rules,firestore:indexes,storage:rules,functions --project="$GCP_PROJECT"
    echo "✔ Cloud Rules, Indexes, and Functions deployed successfully."
  else
    echo "ℹ Firebase CLI not detected. Security rules and indexes can also be managed via Google Cloud Console."
  fi
}

# 8. Execution Matrix
case "$SELECTED_COMPONENT" in
  web)
    deploy_web
    ;;
  cloud)
    deploy_cloud
    ;;
  full|all)
    deploy_cloud
    deploy_web
    ;;
  *)
    echo "❌ Unknown component: $SELECTED_COMPONENT (valid: 'web', 'cloud', 'full')"
    exit 1
    ;;
esac
