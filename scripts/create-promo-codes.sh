#!/bin/bash

# Script to create promo codes in Stripe
# Make sure you have Stripe CLI installed: https://stripe.com/docs/stripe-cli

echo "🎁 Creating Promo Codes for AI Grocery List"
echo "============================================"
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Install it first:"
    echo "   brew install stripe/stripe-cli/stripe"
    echo "   OR download from: https://stripe.com/docs/stripe-cli"
    exit 1
fi

# Login check
echo "Checking Stripe authentication..."
stripe config --list &> /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Not logged in to Stripe. Run: stripe login"
    exit 1
fi

echo "✅ Stripe CLI ready"
echo ""

# Create coupons
echo "📝 Creating coupons..."
echo ""

# 1. Beta Tester - 100% off for 1 month
echo "Creating Beta Tester coupon (100% off, 1 month)..."
BETA_COUPON=$(stripe coupons create \
  --percent-off 100 \
  --duration repeating \
  --duration-in-months 1 \
  --name "Beta Tester - Free Month" \
  --id "beta-free-month" \
  2>&1 | grep -o 'id: [^ ]*' | cut -d' ' -f2)

if [ -z "$BETA_COUPON" ]; then
    echo "⚠️  Beta coupon might already exist, trying to use existing..."
    BETA_COUPON="beta-free-month"
fi
echo "✅ Beta coupon: $BETA_COUPON"

# 2. Launch Special - 50% off for 3 months
echo "Creating Launch Special coupon (50% off, 3 months)..."
LAUNCH_COUPON=$(stripe coupons create \
  --percent-off 50 \
  --duration repeating \
  --duration-in-months 3 \
  --name "Launch Special - 50% Off" \
  --id "launch-50-off" \
  2>&1 | grep -o 'id: [^ ]*' | cut -d' ' -f2)

if [ -z "$LAUNCH_COUPON" ]; then
    echo "⚠️  Launch coupon might already exist, trying to use existing..."
    LAUNCH_COUPON="launch-50-off"
fi
echo "✅ Launch coupon: $LAUNCH_COUPON"

# 3. Friend Referral - $5 off
echo "Creating Friend Referral coupon (\$5 off)..."
FRIEND_COUPON=$(stripe coupons create \
  --amount-off 500 \
  --currency usd \
  --duration once \
  --name "Friend Referral - \$5 Off" \
  --id "friend-5-off" \
  2>&1 | grep -o 'id: [^ ]*' | cut -d' ' -f2)

if [ -z "$FRIEND_COUPON" ]; then
    echo "⚠️  Friend coupon might already exist, trying to use existing..."
    FRIEND_COUPON="friend-5-off"
fi
echo "✅ Friend coupon: $FRIEND_COUPON"

echo ""
echo "📋 Creating promotion codes..."
echo ""

# Create promotion codes
# Beta codes (50 uses)
echo "Creating BETA2025 code..."
stripe promotion_codes create \
  --coupon "$BETA_COUPON" \
  --code "BETA2025" \
  --max-redemptions 50 \
  --metadata.description="Beta tester free month" \
  > /dev/null 2>&1
echo "✅ BETA2025 (50 uses, 100% off for 1 month)"

echo "Creating EARLYADOPTER code..."
stripe promotion_codes create \
  --coupon "$BETA_COUPON" \
  --code "EARLYADOPTER" \
  --max-redemptions 100 \
  --metadata.description="Early adopter free month" \
  > /dev/null 2>&1
echo "✅ EARLYADOPTER (100 uses, 100% off for 1 month)"

# Launch codes (200+ uses)
echo "Creating LAUNCH50 code..."
stripe promotion_codes create \
  --coupon "$LAUNCH_COUPON" \
  --code "LAUNCH50" \
  --max-redemptions 200 \
  --metadata.description="Launch special 50% off" \
  > /dev/null 2>&1
echo "✅ LAUNCH50 (200 uses, 50% off for 3 months)"

echo "Creating NEWYEAR2026 code..."
stripe promotion_codes create \
  --coupon "$LAUNCH_COUPON" \
  --code "NEWYEAR2026" \
  --max-redemptions 500 \
  --metadata.description="New Year 2026 special" \
  > /dev/null 2>&1
echo "✅ NEWYEAR2026 (500 uses, 50% off for 3 months)"

# Referral codes (unlimited)
echo "Creating FRIEND5 code..."
stripe promotion_codes create \
  --coupon "$FRIEND_COUPON" \
  --code "FRIEND5" \
  --metadata.description="Friend referral discount" \
  > /dev/null 2>&1
echo "✅ FRIEND5 (unlimited uses, $5 off)"

echo "Creating FAMILY5 code..."
stripe promotion_codes create \
  --coupon "$FRIEND_COUPON" \
  --code "FAMILY5" \
  --metadata.description="Family referral discount" \
  > /dev/null 2>&1
echo "✅ FAMILY5 (unlimited uses, $5 off)"

echo ""
echo "🎉 All promo codes created successfully!"
echo ""
echo "📋 Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Beta Testers (100% off, 1 month):"
echo "  • BETA2025 (50 uses)"
echo "  • EARLYADOPTER (100 uses)"
echo ""
echo "Launch Special (50% off, 3 months):"
echo "  • LAUNCH50 (200 uses)"
echo "  • NEWYEAR2026 (500 uses)"
echo ""
echo "Referrals (\$5 off, once):"
echo "  • FRIEND5 (unlimited)"
echo "  • FAMILY5 (unlimited)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "View all codes: https://dashboard.stripe.com/promotion_codes"
echo ""

