#!/bin/bash

# This script cleans up all OpenShift resources associated with the Red Hat Quest game.
# It removes all components deployed by openshift-deployment.yaml

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🧹 Starting OpenShift resource cleanup for Red Hat Quest Game..."
echo "📍 Project: $(oc project -q)"
echo "---"

# Application labels for bulk deletion
APP_LABEL="app=redhat-quest-game"

echo "🗑️  Deleting HorizontalPodAutoscaler..."
oc delete hpa redhat-quest-hpa --ignore-not-found=true

echo "🗑️  Deleting NetworkPolicy..."
oc delete networkpolicy redhat-quest-network-policy --ignore-not-found=true

echo "🗑️  Deleting Routes..."
oc delete route redhat-quest-game-route --ignore-not-found=true
oc delete route redhat-quest-admin-route --ignore-not-found=true
oc delete route redhat-quest-leaderboard-route --ignore-not-found=true

echo "🗑️  Deleting Services..."
oc delete service redhat-quest-game-service --ignore-not-found=true

echo "🗑️  Deleting Deployment..."
oc delete deployment redhat-quest-game --ignore-not-found=true

echo "🗑️  Deleting ConfigMap..."
oc delete configmap redhat-quest-config --ignore-not-found=true

echo "🗑️  Deleting ServiceAccount..."
oc delete serviceaccount redhat-quest-sa --ignore-not-found=true

echo "---"
echo "🔍 Verifying cleanup - checking for remaining resources with label: $APP_LABEL"

# Check for any remaining resources
REMAINING_RESOURCES=$(oc get all,configmap,networkpolicy,hpa,serviceaccount -l $APP_LABEL --ignore-not-found=true 2>/dev/null | grep -v "No resources found" | wc -l)

if [ "$REMAINING_RESOURCES" -gt 1 ]; then
    echo "⚠️  Warning: Some resources may still exist:"
    oc get all,configmap,networkpolicy,hpa,serviceaccount -l $APP_LABEL --ignore-not-found=true
    echo ""
    echo "🔧 To force delete remaining resources, run:"
    echo "   oc delete all,configmap,networkpolicy,hpa,serviceaccount -l $APP_LABEL --force --grace-period=0"
else
    echo "✅ All Red Hat Quest Game resources have been successfully removed!"
fi

echo "---"
echo "🎮 Red Hat Quest Game cleanup complete."
echo "📝 Note: This cleanup script only removes resources deployed by openshift-deployment.yaml"
echo "💡 If you deployed additional resources manually, you may need to remove them separately."