# Feature Roadmap - POS Platform

## Phase 1: Core Payment & Order Enhancements
**Priority: High | Timeline: 2-3 weeks**

### 1. Tendered Amount for Cash Payments
- Add input field for cash amount tendered by customer
- Calculate and display change due in real-time
- Update payment flow to include tendered/change information
- Store tendered amount in transactions table

### 2. Change Due Calculator
- Automatic calculation of change (tendered - total)
- Visual display of change breakdown (bills/coins)
- Print change amount on receipt
- Alert if tendered amount is less than total

### 3. Save Customer Order via Phone Number
- Quick order lookup by customer phone number
- Link orders to customer profiles automatically
- Order history accessible via phone search
- SMS order confirmation to saved number

**Database Changes:**
- Add `tendered_amount` and `change_due` columns to `transactions` table
- Ensure `customer_phone` is indexed on `orders` table for fast lookup

---

## Phase 2: Communication & Notifications
**Priority: Medium | Timeline: 3-4 weeks**

### 4. Email & SMS Notifications
- Order confirmation via SMS/Email
- Payment receipt delivery
- Order status updates (preparing, ready, completed)
- Reservation confirmations and reminders
- Kitchen notifications for new orders

### 5. Bulk SMS to Customers
- Send promotional messages to customer database
- Filter customers by: last order date, total spent, location
- SMS templates for common campaigns
- Schedule SMS for future delivery
- Track delivery status and engagement
- Compliance with SMS marketing regulations

**Technical Requirements:**
- Integrate with Twilio (already configured)
- Create email templates using React Email
- Add Resend for email delivery
- Create `sms_campaigns` and `email_campaigns` tables
- Implement unsubscribe functionality

---

## Phase 3: Advanced Features & Revenue
**Priority: Medium-High | Timeline: 4-6 weeks**

### 6. Refunds System
- Full and partial refund capability
- Refund approval workflow (requires admin role)
- Refund reason tracking
- Update inventory on refunded items
- Generate refund receipts
- Refund reporting and analytics

### 7. Social Media Purchase Page
- Single-page checkout for social media links
- Product catalog with images
- Shopping cart functionality
- Mobile-optimized design
- Direct payment integration
- Order tracking via SMS/Email
- Shareable product links for Instagram/Facebook

### 8. Premium Features System
- Subscription tiers (Basic, Pro, Enterprise)
- Feature gating based on subscription level
- Premium features include:
  - Advanced analytics & reporting
  - Priority customer support
  - Multi-location management
  - Custom branding
  - API access
  - Bulk SMS (higher limits)
- Stripe integration for subscription billing
- Usage-based pricing for SMS/Email

**Database Changes:**
- Create `refunds` table with link to original transaction
- Create `subscription_plans` table
- Create `user_subscriptions` table
- Add `plan_tier` to `business_profiles`
- Create `social_media_products` table
- Create `social_media_orders` table

---

## Implementation Priorities

### Must Have (Phase 1)
✅ Critical for daily operations
✅ Improves cash handling accuracy
✅ Enhances customer experience

### Should Have (Phase 2)
✅ Improves customer engagement
✅ Reduces manual communication work
✅ Increases repeat business

### Nice to Have (Phase 3)
✅ Opens new revenue streams
✅ Provides competitive advantage
✅ Enables business growth

---

## Technical Considerations

### Security
- All refunds require admin approval (use existing `user_roles` system)
- Email/SMS opt-out compliance
- Rate limiting on bulk SMS
- Secure payment handling for premium features

### Performance
- Index customer phone numbers for fast lookup
- Cache subscription status to avoid repeated DB queries
- Queue bulk SMS jobs to prevent timeout
- Optimize social media page for mobile loading

### Dependencies
- Twilio: Already configured for SMS
- Resend: Need API key for email
- Stripe: Need API key for subscriptions (optional Stripe integration available)

---

## Next Steps

1. **Review & Approve**: Review this roadmap and prioritize phases
2. **Phase 1 Kickoff**: Start with payment enhancements
3. **Design Review**: Create UI mockups for new features
4. **Database Migration**: Plan schema changes for each phase
5. **Iterative Delivery**: Ship features incrementally within each phase
