# Customer Loyalty Program Guide

## Overview

The Customer Loyalty Program is a comprehensive rewards system designed to drive repeat business and increase customer engagement. It includes points-based rewards, tiered membership levels, personalized offers, referral programs, and automated birthday/anniversary rewards.

## Features

### 🎯 Core Features

1. **Points System**
   - Earn points for every purchase
   - Customizable point rates (points per AED)
   - Points redemption with configurable limits
   - Points expiration tracking

2. **Tiered Rewards**
   - Bronze, Silver, Gold, Platinum tiers
   - Automatic tier upgrades based on points
   - Tier-specific benefits (discounts, multipliers, perks)
   - Visual tier indicators with color coding

3. **Personalized Offers**
   - AI-driven recommendations based on purchase history
   - Birthday and anniversary special offers
   - Referral program with bonus points
   - Targeted promotions for different customer segments

4. **Customer Management**
   - Easy customer enrollment
   - Loyalty profile management
   - Purchase history tracking
   - Points balance monitoring

5. **Analytics & Reporting**
   - Program performance metrics
   - Customer engagement analytics
   - Tier distribution charts
   - Points issuance and redemption tracking

## Database Schema

### Tables Created

1. **loyalty_config** - Program configuration settings
2. **customer_loyalty** - Customer loyalty profiles
3. **loyalty_tiers** - Tier definitions and benefits
4. **loyalty_transactions** - Points transactions history
5. **loyalty_rewards** - Available rewards catalog
6. **reward_redemptions** - Reward redemption tracking
7. **personalized_offers** - AI-driven personalized offers

### Key Fields

#### loyalty_config
- `points_per_aed` - Points earned per AED spent
- `aed_per_point` - AED value per point for redemption
- `min_points_redemption` - Minimum points required for redemption
- `max_points_redemption_percent` - Maximum percentage of bill that can be paid with points
- `birthday_bonus_points` - Bonus points given on customer birthday
- `anniversary_bonus_points` - Bonus points given on customer anniversary
- `referral_bonus_points` - Bonus points for successful referrals

#### customer_loyalty
- `total_points` - Lifetime points earned
- `available_points` - Current points balance
- `tier_level` - Current loyalty tier (Bronze/Silver/Gold/Platinum)
- `total_purchases` - Number of purchases made
- `total_spent` - Total amount spent
- `referral_code` - Unique referral code for the customer
- `birthday` - Customer birthday for automated rewards
- `anniversary_date` - Customer anniversary date

#### loyalty_tiers
- `tier_level` - Tier name (Bronze/Silver/Gold/Platinum)
- `points_threshold` - Points required to reach this tier
- `discount_percent` - Discount percentage for this tier
- `bonus_points_multiplier` - Points multiplier for this tier
- `free_delivery` - Free delivery benefit
- `priority_service` - Priority service benefit
- `exclusive_offers` - Exclusive offers benefit

## Setup Instructions

### 1. Database Migration

Run the migration script to create all necessary tables:

```bash
python add_loyalty_tables.py
```

This will:
- Create all loyalty program tables
- Add loyalty settings to shop_settings table
- Insert default loyalty tiers (Bronze, Silver, Gold, Platinum)

### 2. Configuration

1. Navigate to **Loyalty Program** in the sidebar
2. Go to the **Configuration** tab
3. Configure the following settings:

#### Basic Settings
- **Enable Loyalty Program**: Toggle to enable/disable the program
- **Program Name**: Custom name for your loyalty program
- **Points per AED**: How many points customers earn per AED spent
- **AED per Point**: Value of each point in AED for redemption

#### Redemption Settings
- **Min Points for Redemption**: Minimum points required to redeem
- **Max Redemption %**: Maximum percentage of bill that can be paid with points

#### Bonus Points
- **Birthday Bonus Points**: Points given on customer birthday
- **Anniversary Bonus Points**: Points given on customer anniversary
- **Referral Bonus Points**: Points given for successful referrals

### 3. Tier Configuration

1. Go to the **Tiers & Rewards** tab
2. Click **Add Tier** to create custom tiers
3. Configure tier benefits:
   - **Tier Name**: Name of the tier
   - **Tier Level**: Bronze/Silver/Gold/Platinum
   - **Points Threshold**: Points required to reach this tier
   - **Discount %**: Discount percentage for this tier
   - **Points Multiplier**: Bonus points multiplier
   - **Benefits**: Free delivery, priority service, exclusive offers

### 4. Rewards Setup

1. In the **Tiers & Rewards** tab, click **Add Reward**
2. Configure reward details:
   - **Reward Name**: Name of the reward
   - **Reward Type**: Discount, free item, points bonus, etc.
   - **Points Cost**: Points required to redeem this reward
   - **Discount %**: Discount percentage (if applicable)
   - **Description**: Detailed description of the reward

## Usage Guide

### For Shop Owners

#### Managing Customers

1. **Enrolling Customers**
   - Go to **Loyalty Program** → **Customers** tab
   - Find customers who aren't enrolled
   - Click **Enroll in Loyalty Program**
   - Customers will automatically receive a referral code

2. **Viewing Customer Profiles**
   - Click on any enrolled customer to view their profile
   - See points balance, tier level, purchase history
   - View recent transactions and available rewards

3. **Searching Customers**
   - Use the search bar to find specific customers
   - Search by name, phone, or email

#### Managing Tiers & Rewards

1. **Adding Tiers**
   - Go to **Tiers & Rewards** tab
   - Click **Add Tier**
   - Configure tier settings and benefits
   - Save to activate the tier

2. **Adding Rewards**
   - Click **Add Reward**
   - Configure reward details and points cost
   - Save to make the reward available

#### Monitoring Analytics

1. **Program Overview**
   - View total enrolled customers
   - See total points issued and redeemed
   - Monitor active points balance

2. **Tier Distribution**
   - Visual chart showing customer distribution across tiers
   - Percentage breakdown of each tier

3. **Recent Activity**
   - Track recent loyalty transactions
   - Monitor program engagement

### For Customers

#### Earning Points

- **Automatic Earning**: Points are automatically earned on every purchase
- **Tier Multipliers**: Higher tiers earn more points per AED
- **Bonus Points**: Birthday, anniversary, and referral bonuses
- **Tier Upgrades**: Automatic upgrades when reaching tier thresholds

#### Using Points

- **Redemption**: Points can be redeemed during checkout
- **Minimum Requirements**: Must meet minimum points threshold
- **Maximum Limits**: Limited to maximum redemption percentage
- **Rewards**: Exchange points for discounts, free items, or services

#### Referral Program

- **Unique Codes**: Each customer gets a unique referral code
- **Sharing**: Customers can share their code with friends
- **Bonus Points**: Both referrer and referee get bonus points
- **Tracking**: Referral relationships are tracked in the system

## API Endpoints

### Configuration
- `GET /api/loyalty/config` - Get loyalty program configuration
- `PUT /api/loyalty/config` - Update loyalty program configuration

### Customers
- `GET /api/loyalty/customers` - Get all customers with loyalty info
- `GET /api/loyalty/customers/<id>` - Get specific customer loyalty profile
- `POST /api/loyalty/customers/<id>/enroll` - Enroll customer in loyalty program

### Tiers
- `GET /api/loyalty/tiers` - Get all loyalty tiers
- `POST /api/loyalty/tiers` - Create new loyalty tier

### Rewards
- `GET /api/loyalty/rewards` - Get available rewards
- `POST /api/loyalty/rewards` - Create new reward

### Analytics
- `GET /api/loyalty/analytics` - Get loyalty program analytics
- `GET /api/loyalty/transactions` - Get loyalty transactions
- `GET /api/loyalty/offers` - Get personalized offers

## Integration with Billing

### Automatic Points Earning

When a bill is created:
1. System checks if customer is enrolled in loyalty program
2. Calculates points based on total amount and tier multiplier
3. Records points transaction
4. Updates customer loyalty profile
5. Checks for tier upgrades
6. Returns points earned in bill creation response

### Points Redemption

During checkout:
1. Customer can choose to redeem points
2. System validates minimum points and maximum redemption limits
3. Calculates discount based on points redeemed
4. Updates bill total and points balance
5. Records redemption transaction

## Best Practices

### Configuration Tips

1. **Point Values**
   - Start with 1 point per AED for easy calculation
   - Set AED per point to 0.01 for 1% value
   - Adjust based on your profit margins

2. **Tier Thresholds**
   - Bronze: 0 points (entry level)
   - Silver: 1,000 points (moderate spenders)
   - Gold: 5,000 points (regular customers)
   - Platinum: 15,000 points (VIP customers)

3. **Redemption Limits**
   - Set minimum points to 100-500 for meaningful redemptions
   - Limit maximum redemption to 10-20% to protect margins
   - Consider seasonal promotions with higher limits

### Customer Engagement

1. **Communication**
   - Inform customers about points earned after each purchase
   - Send birthday and anniversary greetings with bonus points
   - Promote referral program benefits

2. **Rewards Strategy**
   - Offer immediate value (discounts) and aspirational rewards (free items)
   - Create urgency with limited-time offers
   - Personalize rewards based on purchase history

3. **Tier Benefits**
   - Make tier benefits clearly visible and valuable
   - Ensure smooth tier upgrade experience
   - Celebrate customer achievements

### Analytics & Optimization

1. **Monitor Key Metrics**
   - Enrollment rate and retention
   - Points earning vs redemption rates
   - Tier distribution and upgrade rates
   - Customer lifetime value by tier

2. **Optimize Program**
   - Adjust point values based on profitability
   - Refine tier thresholds based on customer behavior
   - Test different reward types and values

3. **Seasonal Adjustments**
   - Increase point multipliers during slow periods
   - Offer special rewards during peak seasons
   - Create holiday-specific promotions

## Troubleshooting

### Common Issues

1. **Points Not Earning**
   - Check if loyalty program is enabled
   - Verify customer is enrolled
   - Check point calculation settings

2. **Tier Not Upgrading**
   - Verify points threshold settings
   - Check if customer has enough points
   - Ensure tier is active

3. **Redemption Issues**
   - Check minimum points requirement
   - Verify maximum redemption percentage
   - Ensure customer has sufficient points

### Debug Steps

1. **Check Configuration**
   - Verify all settings in Configuration tab
   - Ensure program is enabled
   - Check point calculation values

2. **Review Customer Profile**
   - Check customer enrollment status
   - Verify points balance and tier
   - Review transaction history

3. **Database Verification**
   - Check loyalty tables exist
   - Verify data integrity
   - Review transaction logs

## Future Enhancements

### Planned Features

1. **Mobile App Integration**
   - Customer-facing mobile app
   - QR code scanning for points
   - Push notifications for offers

2. **Advanced Analytics**
   - Predictive customer behavior
   - ROI analysis for rewards
   - Customer segmentation

3. **Marketing Automation**
   - Automated email campaigns
   - SMS notifications
   - Social media integration

4. **Gamification**
   - Achievement badges
   - Leaderboards
   - Challenges and contests

### Customization Options

1. **Branding**
   - Custom program names and colors
   - Branded reward certificates
   - Personalized communication

2. **Integration**
   - Third-party loyalty platforms
   - Payment gateway integration
   - CRM system integration

3. **Advanced Rules**
   - Product-specific point rates
   - Time-based multipliers
   - Conditional rewards

## Support

For technical support or questions about the loyalty program:

1. Check this documentation first
2. Review the troubleshooting section
3. Contact support with specific error messages
4. Provide screenshots of any issues

## Conclusion

The Customer Loyalty Program is a powerful tool for increasing customer retention and driving repeat business. By following this guide and implementing best practices, you can create a successful loyalty program that benefits both your business and your customers.

Remember to:
- Start simple and iterate based on customer feedback
- Monitor analytics regularly to optimize performance
- Communicate clearly with customers about program benefits
- Continuously improve and expand the program based on results

