# Stripe Webhook Setup Guide

## Overview
This guide will help you set up Stripe webhooks for the Tajir POS subscription system.

## Prerequisites
- Stripe account (https://stripe.com)
- Tajir POS application deployed
- Access to environment variables

## Step 1: Stripe Account Setup

### 1.1 Create Stripe Account
1. Go to https://stripe.com
2. Sign up for a new account
3. Complete business verification
4. Switch to "Test mode" for development

### 1.2 Get API Keys
1. Go to Developers → API Keys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)

## Step 2: Environment Variables

Add these to your environment variables:

### Local Development (.env file)
```bash
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Railway Production
```bash
railway variables set STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
railway variables set STRIPE_SECRET_KEY=sk_test_your_secret_key_here
railway variables set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Step 3: Webhook Endpoint Configuration

### 3.1 Create Webhook Endpoint
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Configure:
   - **Endpoint URL:** `https://tajirtech.com/api/subscription/webhook`
   - **Description:** "Tajir POS Subscription Webhooks"

### 3.2 Select Events
Choose these events to listen for:
```
✅ invoice.payment_succeeded
✅ invoice.payment_failed
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ payment_intent.succeeded
✅ payment_intent.payment_failed
```

### 3.3 Get Webhook Secret
1. After creating the endpoint, click on it
2. Go to "Signing secret" section
3. Click "Reveal" and copy the secret (starts with `whsec_`)
4. Add this to your environment variables

## Step 4: Testing

### 4.1 Test Webhook Endpoint
```bash
python test_webhook.py
```

### 4.2 Test with Stripe CLI (Optional)
```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward events to local endpoint
stripe listen --forward-to localhost:5000/api/subscription/webhook
```

### 4.3 Test Payment Flow
1. Go to https://tajirtech.com
2. Click "Pricing" → Select "Basic" or "Pro" plan
3. Use test card: `4242 4242 4242 4242`
4. Check webhook events in Stripe Dashboard

## Step 5: Production Setup

### 5.1 Switch to Live Mode
1. In Stripe Dashboard, toggle "Test mode" off
2. Get live API keys
3. Update environment variables with live keys
4. Create new webhook endpoint for production

### 5.2 Update Webhook URL
- **Production URL:** `https://tajirtech.com/api/subscription/webhook`
- **Test URL:** `https://tajirtech.com/api/subscription/webhook` (same endpoint handles both)

## Webhook Events Handled

| Event | Description | Action |
|-------|-------------|---------|
| `invoice.payment_succeeded` | Payment completed successfully | Activate subscription, send confirmation |
| `invoice.payment_failed` | Payment failed | Notify user, retry payment |
| `customer.subscription.created` | New subscription created | Log subscription creation |
| `customer.subscription.updated` | Subscription modified | Update subscription status |
| `customer.subscription.deleted` | Subscription cancelled | Deactivate subscription |
| `payment_intent.succeeded` | Payment intent completed | Process payment |
| `payment_intent.payment_failed` | Payment intent failed | Handle failure |

## Security Notes

1. **Webhook Signature Verification:** All webhooks are verified using HMAC signatures
2. **Idempotency:** Duplicate events are handled gracefully
3. **Error Handling:** Failed webhook processing is logged and retried
4. **Rate Limiting:** Webhook processing is rate-limited to prevent abuse

## Troubleshooting

### Common Issues

1. **Webhook not receiving events:**
   - Check endpoint URL is correct
   - Verify webhook secret is set
   - Check firewall/network settings

2. **Signature verification failed:**
   - Ensure webhook secret matches Stripe dashboard
   - Check timestamp tolerance (5 minutes)

3. **Events not processing:**
   - Check application logs
   - Verify database connection
   - Test with Stripe CLI

### Debug Commands

```bash
# Check webhook endpoint status
curl -X GET https://tajirtech.com/api/subscription/webhook

# Test webhook with sample payload
python test_webhook.py

# View recent webhook events
stripe events list --limit 10
```

## Support

For issues with webhook setup:
1. Check Stripe Dashboard → Webhooks for event logs
2. Review application logs for errors
3. Test with Stripe CLI for debugging
4. Contact support if issues persist

## Next Steps

After webhook setup is complete:
1. Test complete payment flow
2. Set up monitoring and alerts
3. Configure production webhooks
4. Set up subscription management UI
