# Credit Card Subscription Implementation Plan

## 1. Database Schema Updates

### Subscription Plans Table
```sql
CREATE TABLE subscription_plans (
    plan_id SERIAL PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL,
    plan_type VARCHAR(50) NOT NULL, -- 'trial', 'basic', 'pro', 'enterprise'
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'AED',
    features JSONB, -- Store plan features as JSON
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### User Subscriptions Table
```sql
CREATE TABLE user_subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    stripe_subscription_id VARCHAR(255), -- Stripe subscription ID
    stripe_customer_id VARCHAR(255), -- Stripe customer ID
    status VARCHAR(50) NOT NULL, -- 'active', 'canceled', 'past_due', 'unpaid'
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id)
);
```

### Payment History Table
```sql
CREATE TABLE payment_history (
    payment_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    subscription_id INTEGER,
    stripe_payment_intent_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'AED',
    status VARCHAR(50) NOT NULL, -- 'succeeded', 'failed', 'pending'
    payment_method VARCHAR(50), -- 'card', 'bank_transfer'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(subscription_id)
);
```

## 2. Backend Implementation (Flask)

### Stripe Integration
```python
import stripe
from flask import request, jsonify, session

# Initialize Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

@app.route('/api/create-payment-intent', methods=['POST'])
def create_payment_intent():
    """Create Stripe payment intent for subscription"""
    try:
        data = request.get_json()
        user_id = get_current_user_id()
        plan_id = data.get('plan_id')
        billing_cycle = data.get('billing_cycle', 'monthly') # 'monthly' or 'yearly'
        
        # Get plan details
        conn = get_db_connection()
        cursor = execute_query(conn, 'SELECT * FROM subscription_plans WHERE plan_id = ?', (plan_id,))
        plan = cursor.fetchone()
        conn.close()
        
        if not plan:
            return jsonify({'error': 'Plan not found'}), 404
        
        # Calculate amount
        amount = plan['price_monthly'] if billing_cycle == 'monthly' else plan['price_yearly']
        
        # Create Stripe customer if not exists
        customer = stripe.Customer.create(
            email=session.get('user_email'),
            metadata={'user_id': user_id}
        )
        
        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100), # Convert to cents
            currency='aed',
            customer=customer.id,
            metadata={
                'user_id': user_id,
                'plan_id': plan_id,
                'billing_cycle': billing_cycle
            }
        )
        
        return jsonify({
            'client_secret': intent.client_secret,
            'customer_id': customer.id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/confirm-subscription', methods=['POST'])
def confirm_subscription():
    """Confirm subscription after successful payment"""
    try:
        data = request.get_json()
        user_id = get_current_user_id()
        payment_intent_id = data.get('payment_intent_id')
        plan_id = data.get('plan_id')
        billing_cycle = data.get('billing_cycle')
        
        # Verify payment intent
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if intent.status != 'succeeded':
            return jsonify({'error': 'Payment not successful'}), 400
        
        # Create subscription
        conn = get_db_connection()
        
        # Get plan details
        cursor = execute_query(conn, 'SELECT * FROM subscription_plans WHERE plan_id = ?', (plan_id,))
        plan = cursor.fetchone()
        
        # Create Stripe subscription
        subscription = stripe.Subscription.create(
            customer=intent.customer,
            items=[{
                'price_data': {
                    'currency': 'aed',
                    'product_data': {
                        'name': plan['plan_name'],
                    },
                    'unit_amount': int(plan['price_monthly'] * 100) if billing_cycle == 'monthly' else int(plan['price_yearly'] * 100),
                    'recurring': {
                        'interval': 'month' if billing_cycle == 'monthly' else 'year',
                    },
                },
            }],
            metadata={
                'user_id': user_id,
                'plan_id': plan_id
            }
        )
        
        # Save subscription to database
        execute_update(conn, '''
            INSERT INTO user_subscriptions 
            (user_id, plan_id, stripe_subscription_id, stripe_customer_id, status, 
             current_period_start, current_period_end)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id, plan_id, subscription.id, intent.customer, 'active',
            datetime.fromtimestamp(subscription.current_period_start),
            datetime.fromtimestamp(subscription.current_period_end)
        ))
        
        # Update user plan
        execute_update(conn, '''
            UPDATE user_plans 
            SET plan_type = ?, plan_start_date = CURRENT_DATE, is_active = TRUE
            WHERE user_id = ?
        ''', (plan['plan_type'], user_id))
        
        # Record payment
        execute_update(conn, '''
            INSERT INTO payment_history 
            (user_id, stripe_payment_intent_id, amount, currency, status)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, payment_intent_id, plan['price_monthly'] if billing_cycle == 'monthly' else plan['price_yearly'], 'AED', 'succeeded'))
        
        conn.close()
        
        return jsonify({'success': True, 'subscription_id': subscription.id})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cancel-subscription', methods=['POST'])
def cancel_subscription():
    """Cancel user subscription"""
    try:
        user_id = get_current_user_id()
        
        conn = get_db_connection()
        cursor = execute_query(conn, '''
            SELECT stripe_subscription_id FROM user_subscriptions 
            WHERE user_id = ? AND status = 'active'
        ''', (user_id,))
        subscription = cursor.fetchone()
        
        if subscription:
            # Cancel in Stripe
            stripe.Subscription.modify(
                subscription['stripe_subscription_id'],
                cancel_at_period_end=True
            )
            
            # Update database
            execute_update(conn, '''
                UPDATE user_subscriptions 
                SET cancel_at_period_end = TRUE 
                WHERE user_id = ? AND status = 'active'
            ''', (user_id,))
        
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

## 3. Frontend Implementation

### Subscription Page HTML
```html
<!-- Add to templates/app.html -->
<section id="subscriptionSec" class="page hidden">
    <div class="max-w-4xl mx-auto p-6">
        <h2 class="text-2xl font-bold mb-6">Choose Your Plan</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Basic Plan -->
            <div class="border rounded-lg p-6">
                <h3 class="text-xl font-semibold">Basic</h3>
                <div class="text-3xl font-bold">AED 499<span class="text-sm">/year</span></div>
                <ul class="mt-4 space-y-2">
                    <li>✓ Billing & Invoicing</li>
                    <li>✓ Product Management</li>
                    <li>✓ Customer Management</li>
                    <li>✓ Basic Reports</li>
                </ul>
                <button onclick="selectPlan('basic')" class="w-full mt-4 bg-blue-600 text-white py-2 rounded">
                    Select Plan
                </button>
            </div>
            
            <!-- Pro Plan -->
            <div class="border rounded-lg p-6 border-blue-500">
                <h3 class="text-xl font-semibold">Pro</h3>
                <div class="text-3xl font-bold">AED 899<span class="text-sm">/year</span></div>
                <ul class="mt-4 space-y-2">
                    <li>✓ Everything in Basic</li>
                    <li>✓ Advanced Analytics</li>
                    <li>✓ Priority Support</li>
                    <li>✓ Custom Features</li>
                </ul>
                <button onclick="selectPlan('pro')" class="w-full mt-4 bg-blue-600 text-white py-2 rounded">
                    Select Plan
                </button>
            </div>
            
            <!-- Enterprise Plan -->
            <div class="border rounded-lg p-6">
                <h3 class="text-xl font-semibold">Enterprise</h3>
                <div class="text-3xl font-bold">Custom</div>
                <ul class="mt-4 space-y-2">
                    <li>✓ Everything in Pro</li>
                    <li>✓ Multi-location</li>
                    <li>✓ Dedicated Support</li>
                    <li>✓ Custom Integration</li>
                </ul>
                <button onclick="contactSales()" class="w-full mt-4 bg-gray-600 text-white py-2 rounded">
                    Contact Sales
                </button>
            </div>
        </div>
    </div>
</section>

<!-- Payment Modal -->
<div id="paymentModal" class="fixed inset-0 bg-black bg-opacity-50 hidden">
    <div class="flex items-center justify-center min-h-screen p-4">
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 class="text-xl font-semibold mb-4">Complete Payment</h3>
            <div id="card-element" class="border rounded p-3 mb-4">
                <!-- Stripe Elements will create form elements here -->
            </div>
            <div id="card-errors" class="text-red-500 mb-4"></div>
            <button id="submit-payment" class="w-full bg-blue-600 text-white py-2 rounded">
                Pay Now
            </button>
            <button onclick="closePaymentModal()" class="w-full mt-2 bg-gray-300 text-gray-700 py-2 rounded">
                Cancel
            </button>
        </div>
    </div>
</div>
```

### JavaScript Implementation
```javascript
// Add to static/js/modules/subscription.js
let stripe, elements, cardElement;

async function initializeStripe() {
    // Load Stripe.js
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => {
        stripe = Stripe('pk_test_your_publishable_key'); // Replace with your key
        elements = stripe.elements();
        cardElement = elements.create('card');
        cardElement.mount('#card-element');
        
        cardElement.on('change', (event) => {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        });
    };
    document.head.appendChild(script);
}

async function selectPlan(planType) {
    const planMap = {
        'basic': 1,
        'pro': 2,
        'enterprise': 3
    };
    
    const planId = planMap[planType];
    
    try {
        // Create payment intent
        const response = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                plan_id: planId,
                billing_cycle: 'yearly'
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('Error: ' + data.error);
            return;
        }
        
        // Show payment modal
        document.getElementById('paymentModal').classList.remove('hidden');
        
        // Store payment intent client secret
        window.paymentIntentClientSecret = data.client_secret;
        window.currentPlanId = planId;
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error creating payment intent');
    }
}

async function submitPayment() {
    const submitButton = document.getElementById('submit-payment');
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';
    
    try {
        const {error, paymentIntent} = await stripe.confirmCardPayment(
            window.paymentIntentClientSecret,
            {
                payment_method: {
                    card: cardElement,
                }
            }
        );
        
        if (error) {
            document.getElementById('card-errors').textContent = error.message;
            submitButton.disabled = false;
            submitButton.textContent = 'Pay Now';
        } else {
            // Payment succeeded
            await confirmSubscription(paymentIntent.id);
        }
    } catch (err) {
        console.error('Error:', err);
        alert('Payment failed');
        submitButton.disabled = false;
        submitButton.textContent = 'Pay Now';
    }
}

async function confirmSubscription(paymentIntentId) {
    try {
        const response = await fetch('/api/confirm-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                payment_intent_id: paymentIntentId,
                plan_id: window.currentPlanId,
                billing_cycle: 'yearly'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Subscription activated successfully!');
            closePaymentModal();
            // Redirect to dashboard or refresh page
            location.reload();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error confirming subscription');
    }
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.add('hidden');
}

function contactSales() {
    // Implement contact sales functionality
    window.open('mailto:sales@tajirtech.com?subject=Enterprise Plan Inquiry');
}

// Initialize Stripe when page loads
document.addEventListener('DOMContentLoaded', initializeStripe);
```

## 4. Environment Variables

Add to your `.env` file:
```
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## 5. Webhook Handling

```python
@app.route('/api/stripe-webhook', methods=['POST'])
def stripe_webhook():
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv('STRIPE_WEBHOOK_SECRET')
        )
    except ValueError:
        return 'Invalid payload', 400
    except stripe.error.SignatureVerificationError:
        return 'Invalid signature', 400
    
    # Handle the event
    if event['type'] == 'invoice.payment_succeeded':
        # Handle successful payment
        handle_successful_payment(event['data']['object'])
    elif event['type'] == 'invoice.payment_failed':
        # Handle failed payment
        handle_failed_payment(event['data']['object'])
    elif event['type'] == 'customer.subscription.deleted':
        # Handle subscription cancellation
        handle_subscription_cancellation(event['data']['object'])
    
    return jsonify({'status': 'success'})
```

## 6. Security Considerations

1. **Never store credit card data** - Use Stripe's secure tokenization
2. **Validate all webhook signatures** - Prevent webhook spoofing
3. **Use HTTPS** - Required for PCI compliance
4. **Implement rate limiting** - Prevent abuse
5. **Log all payment events** - For audit and debugging

## 7. Testing

1. **Use Stripe test cards** for development
2. **Test webhook endpoints** using Stripe CLI
3. **Test subscription lifecycle** (create, update, cancel)
4. **Test error scenarios** (failed payments, expired cards)

## 8. Deployment Checklist

- [ ] Set up Stripe account and get API keys
- [ ] Configure webhook endpoints
- [ ] Update database schema
- [ ] Deploy backend changes
- [ ] Test payment flow
- [ ] Set up monitoring and alerts
- [ ] Configure production Stripe keys
- [ ] Test with real payment methods

This implementation provides a complete subscription system with credit card payments, proper error handling, and security best practices.
