#!/bin/bash

# Test Owner Logo Fix
# Verifies that /api/owner/info returns theme_config with logoUrl

# Configuration
BACKEND_URL="${BACKEND_URL:-https://fuelfinder.duckdns.org}"
OWNER_DOMAIN="${1:-ifuel-dangay}"

echo "🧪 Testing Owner Logo Fix"
echo "============================================"
echo "Backend: $BACKEND_URL"
echo "Owner Domain: $OWNER_DOMAIN"
echo ""

# Test 1: Check if endpoint is reachable
echo "📡 Test 1: Checking endpoint availability..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "x-owner-domain: $OWNER_DOMAIN" \
  "$BACKEND_URL/api/owner/info")

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Endpoint reachable (HTTP $HTTP_STATUS)"
else
  echo "❌ Endpoint failed (HTTP $HTTP_STATUS)"
  echo "   Check if backend is running and domain exists"
  exit 1
fi

echo ""

# Test 2: Check response structure
echo "📋 Test 2: Fetching owner info..."
RESPONSE=$(curl -s -H "x-owner-domain: $OWNER_DOMAIN" \
  "$BACKEND_URL/api/owner/info")

echo "$RESPONSE" | jq '.' 2>/dev/null || {
  echo "❌ Invalid JSON response"
  echo "Response: $RESPONSE"
  exit 1
}

echo ""

# Test 3: Check theme_config field
echo "🎨 Test 3: Checking theme_config field..."
THEME_CONFIG=$(echo "$RESPONSE" | jq -r '.theme_config')

if [ "$THEME_CONFIG" = "null" ] || [ -z "$THEME_CONFIG" ]; then
  echo "❌ theme_config is missing or null"
  echo "   Middleware fix may not be applied yet"
  exit 1
elif [ "$THEME_CONFIG" = "{}" ]; then
  echo "⚠️  theme_config exists but is empty"
  echo "   Fix applied, but no logo URL set in database"
else
  echo "✅ theme_config field present"
  echo "$RESPONSE" | jq '.theme_config'
fi

echo ""

# Test 4: Check logoUrl specifically
echo "🖼️  Test 4: Checking logoUrl field..."
LOGO_URL=$(echo "$RESPONSE" | jq -r '.theme_config.logoUrl')

if [ "$LOGO_URL" = "null" ] || [ -z "$LOGO_URL" ]; then
  echo "⚠️  logoUrl is null or missing"
  echo "   To set a logo, run:"
  echo "   UPDATE owners SET theme_config = jsonb_set("
  echo "     COALESCE(theme_config, '{}'::jsonb), '{logoUrl}',"
  echo "     to_jsonb('YOUR_LOGO_URL'::text), true"
  echo "   ) WHERE domain = '$OWNER_DOMAIN';"
else
  echo "✅ logoUrl found: $LOGO_URL"
  
  # Test 5: Check if logo URL is accessible
  echo ""
  echo "🌐 Test 5: Checking logo URL accessibility..."
  LOGO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$LOGO_URL")
  
  if [ "$LOGO_STATUS" = "200" ]; then
    echo "✅ Logo URL is accessible (HTTP $LOGO_STATUS)"
  else
    echo "⚠️  Logo URL returned HTTP $LOGO_STATUS"
    echo "   Make sure the URL is publicly accessible"
  fi
fi

echo ""
echo "============================================"
echo "🎉 Test Complete!"
echo ""
echo "📱 Frontend Test:"
echo "   Visit: https://$OWNER_DOMAIN.fuelfinder.com/login"
echo "   Open DevTools → Network → Check /api/owner/info response"
echo ""
