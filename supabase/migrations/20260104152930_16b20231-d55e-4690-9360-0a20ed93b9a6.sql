-- Create system_templates table for managing all communication templates
CREATE TABLE IF NOT EXISTS public.system_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  category TEXT NOT NULL DEFAULT 'system',
  subject TEXT,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_templates ENABLE ROW LEVEL SECURITY;

-- Create policies - templates are readable by authenticated users, editable only by super admins
CREATE POLICY "Templates are viewable by authenticated users"
ON public.system_templates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super admins can manage templates"
ON public.system_templates
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_system_templates_updated_at
BEFORE UPDATE ON public.system_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default customer journey templates
INSERT INTO public.system_templates (name, type, category, subject, content, variables, is_system) VALUES

-- Order Templates
('Order Confirmation Email', 'email', 'order', 'Your Order {{order_number}} is Confirmed!', 
'<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(to right, #4F46E5, #7C3AED); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0;">Order Confirmed!</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px;">
      <p>Hi {{customer_name}},</p>
      <p>Thank you for your order! We''ve received it and are preparing it now.</p>
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Order Details</h3>
        <p><strong>Order Number:</strong> {{order_number}}</p>
        <p><strong>Total:</strong> {{currency}} {{order_total}}</p>
      </div>
      <p>We''ll notify you when your order is ready!</p>
      <p>Best regards,<br>{{business_name}}</p>
    </div>
  </div>
</body>
</html>', 
'["customer_name", "order_number", "order_total", "currency", "business_name"]', true),

('Order Confirmation SMS', 'sms', 'order', NULL, 
'Order Confirmed! {{order_number}}
Total: {{currency}} {{order_total}}
We''re preparing your order. - {{business_name}}', 
'["order_number", "order_total", "currency", "business_name"]', true),

('Order Ready Email', 'email', 'order', 'Your Order {{order_number}} is Ready!',
'<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #22C55E; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0;">Your Order is Ready!</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px;">
      <p>Hi {{customer_name}},</p>
      <p>Great news! Your order {{order_number}} is now ready for pickup.</p>
      <p>Thank you for your patience!</p>
      <p>Best regards,<br>{{business_name}}</p>
    </div>
  </div>
</body>
</html>',
'["customer_name", "order_number", "business_name"]', true),

('Order Ready SMS', 'sms', 'order', NULL,
'{{customer_name}}, your order {{order_number}} is READY for pickup! - {{business_name}}',
'["customer_name", "order_number", "business_name"]', true),

-- Invoice Templates
('Invoice Email', 'email', 'invoice', 'Invoice {{invoice_number}} from {{business_name}}',
'<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(to right, #3B82F6, #8B5CF6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0;">INVOICE</h1>
      <p style="color: white; margin: 10px 0 0 0;">{{invoice_number}}</p>
    </div>
    <div style="background: #f9fafb; padding: 30px;">
      <p>Dear {{customer_name}},</p>
      <p>Please find attached your invoice from {{business_name}}.</p>
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Invoice Number:</strong> {{invoice_number}}</p>
        <p><strong>Amount Due:</strong> {{currency}} {{invoice_total}}</p>
        <p><strong>Due Date:</strong> {{due_date}}</p>
      </div>
      <p>Thank you for your business!</p>
      <p>Best regards,<br>{{business_name}}</p>
    </div>
  </div>
</body>
</html>',
'["customer_name", "invoice_number", "invoice_total", "due_date", "currency", "business_name"]', true),

('Invoice SMS', 'sms', 'invoice', NULL,
'Invoice {{invoice_number}} from {{business_name}}
Amount: {{currency}} {{invoice_total}}
Due: {{due_date}}',
'["invoice_number", "invoice_total", "due_date", "currency", "business_name"]', true),

('Payment Reminder Email', 'email', 'invoice', 'Reminder: Invoice {{invoice_number}} Due Soon',
'<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #F59E0B; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0;">Payment Reminder</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px;">
      <p>Dear {{customer_name}},</p>
      <p>This is a friendly reminder that invoice {{invoice_number}} is due on {{due_date}}.</p>
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Amount Due:</strong> {{currency}} {{invoice_total}}</p>
      </div>
      <p>Please ensure payment is made by the due date to avoid any late fees.</p>
      <p>Best regards,<br>{{business_name}}</p>
    </div>
  </div>
</body>
</html>',
'["customer_name", "invoice_number", "invoice_total", "due_date", "currency", "business_name"]', true),

('Payment Reminder SMS', 'sms', 'invoice', NULL,
'Reminder: Invoice {{invoice_number}} ({{currency}} {{invoice_total}}) due {{due_date}}. - {{business_name}}',
'["invoice_number", "invoice_total", "due_date", "currency", "business_name"]', true),

-- Reservation Templates
('Reservation Confirmation Email', 'email', 'reservation', 'Your Reservation is Confirmed - {{reservation_date}}',
'<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(to right, #10B981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0;">Reservation Confirmed!</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px;">
      <p>Hi {{customer_name}},</p>
      <p>Your reservation has been confirmed!</p>
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Date:</strong> {{reservation_date}}</p>
        <p><strong>Time:</strong> {{reservation_time}}</p>
        <p><strong>Party Size:</strong> {{party_size}}</p>
      </div>
      <p>We look forward to seeing you!</p>
      <p>Best regards,<br>{{business_name}}</p>
    </div>
  </div>
</body>
</html>',
'["customer_name", "reservation_date", "reservation_time", "party_size", "business_name"]', true),

('Reservation Confirmation SMS', 'sms', 'reservation', NULL,
'Reservation confirmed for {{reservation_date}} at {{reservation_time}}. Party of {{party_size}}. See you soon! - {{business_name}}',
'["reservation_date", "reservation_time", "party_size", "business_name"]', true),

('Reservation Reminder Email', 'email', 'reservation', 'Reminder: Your Reservation Tomorrow',
'<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #6366F1; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0;">Reminder</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px;">
      <p>Hi {{customer_name}},</p>
      <p>Just a friendly reminder about your upcoming reservation.</p>
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Date:</strong> {{reservation_date}}</p>
        <p><strong>Time:</strong> {{reservation_time}}</p>
      </div>
      <p>We look forward to seeing you!</p>
      <p>Best regards,<br>{{business_name}}</p>
    </div>
  </div>
</body>
</html>',
'["customer_name", "reservation_date", "reservation_time", "business_name"]', true),

('Reservation Reminder SMS', 'sms', 'reservation', NULL,
'Reminder: Reservation tomorrow {{reservation_date}} at {{reservation_time}}. - {{business_name}}',
'["reservation_date", "reservation_time", "business_name"]', true),

-- Payment Templates
('Payment Receipt Email', 'email', 'payment', 'Payment Receipt - Thank You!',
'<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #22C55E; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0;">Payment Received!</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px;">
      <p>Dear {{customer_name}},</p>
      <p>Thank you for your payment. This email confirms we have received your payment.</p>
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Amount Paid:</strong> {{currency}} {{amount_paid}}</p>
        <p><strong>Payment Date:</strong> {{payment_date}}</p>
        <p><strong>Reference:</strong> {{payment_reference}}</p>
      </div>
      <p>Thank you for your business!</p>
      <p>Best regards,<br>{{business_name}}</p>
    </div>
  </div>
</body>
</html>',
'["customer_name", "amount_paid", "payment_date", "payment_reference", "currency", "business_name"]', true),

('Payment Receipt SMS', 'sms', 'payment', NULL,
'Payment received! {{currency}} {{amount_paid}} on {{payment_date}}. Thank you! - {{business_name}}',
'["amount_paid", "payment_date", "currency", "business_name"]', true),

-- Staff Templates
('Staff Invitation Email', 'email', 'staff', 'You''re Invited to Join {{business_name}}',
'<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #4F46E5; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0;">You''re Invited!</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px;">
      <p>Hi {{staff_name}},</p>
      <p>You''ve been invited to join {{business_name}} as a {{staff_role}}.</p>
      <p>Click the button below to accept your invitation and set up your account:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{invitation_link}}" style="background: #4F46E5; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; display: inline-block;">Accept Invitation</a>
      </div>
      <p>This invitation will expire in 7 days.</p>
      <p>Best regards,<br>{{business_name}}</p>
    </div>
  </div>
</body>
</html>',
'["staff_name", "staff_role", "business_name", "invitation_link"]', true),

-- Customer Welcome
('Welcome Email', 'email', 'customer', 'Welcome to {{business_name}}!',
'<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(to right, #8B5CF6, #EC4899); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0;">Welcome!</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px;">
      <p>Hi {{customer_name}},</p>
      <p>Welcome to {{business_name}}! We''re thrilled to have you as a customer.</p>
      <p>Thank you for choosing us. We look forward to serving you!</p>
      <p>Best regards,<br>{{business_name}}</p>
    </div>
  </div>
</body>
</html>',
'["customer_name", "business_name"]', true),

('Welcome SMS', 'sms', 'customer', NULL,
'Welcome to {{business_name}}, {{customer_name}}! Thank you for joining us. We look forward to serving you!',
'["customer_name", "business_name"]', true);
