import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Utensils, 
  ShoppingBag, 
  Scissors, 
  Wrench, 
  Building2,
  Sparkles,
  Gift,
  Calendar,
  Receipt,
  Bell,
  Star,
  PartyPopper,
  Coffee,
  Truck,
  Dumbbell,
  Heart,
  Home,
  Car,
  PawPrint,
  Leaf,
  Wine,
  Cake,
  Brush,
  Stethoscope
} from "lucide-react";

interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  subject: string;
  body: string;
  variables: string[];
}

interface IndustryTemplatesProps {
  industry?: string;
  onSelectTemplate: (subject: string, body: string) => void;
}

const TEMPLATES: Record<string, IndustryTemplate[]> = {
  restaurant: [
    {
      id: "rest-welcome",
      name: "Welcome Email",
      description: "Welcome new customers to your restaurant",
      category: "Welcome",
      icon: Sparkles,
      subject: "Welcome to {{business_name}}! 🍽️",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #2563eb; text-align: center;">Welcome, {{customer_name}}!</h1>
  
  <p>Thank you for dining with us at <strong>{{business_name}}</strong>. We're thrilled to have you as part of our family!</p>
  
  <div style="background: linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%); padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h2 style="margin-top: 0; color: #1f2937;">🎁 Special Welcome Offer</h2>
    <p>Enjoy <strong>10% off</strong> your next visit! Just show this email when you arrive.</p>
  </div>
  
  <p>We can't wait to serve you again!</p>
  
  <p style="color: #6b7280; font-size: 14px;">
    Best regards,<br>
    The {{business_name}} Team
  </p>
</div>`,
      variables: ["customer_name", "business_name"]
    },
    {
      id: "rest-reservation",
      name: "Reservation Confirmation",
      description: "Confirm restaurant reservations",
      category: "Reservations",
      icon: Calendar,
      subject: "Your Reservation at {{business_name}} is Confirmed! ✅",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #16a34a; text-align: center;">Reservation Confirmed!</h1>
  
  <p>Hi {{customer_name}},</p>
  
  <p>Your table is reserved at <strong>{{business_name}}</strong>.</p>
  
  <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #16a34a; margin: 20px 0;">
    <p style="margin: 0;"><strong>📅 Date:</strong> {{reservation_date}}</p>
    <p style="margin: 8px 0;"><strong>⏰ Time:</strong> {{reservation_time}}</p>
    <p style="margin: 8px 0;"><strong>👥 Party Size:</strong> {{party_size}} guests</p>
    <p style="margin: 0;"><strong>🪑 Table:</strong> {{table_name}}</p>
  </div>
  
  <p>Need to make changes? Please call us at {{business_phone}} or reply to this email.</p>
  
  <p style="color: #6b7280; font-size: 14px;">See you soon!<br>{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name", "reservation_date", "reservation_time", "party_size", "table_name", "business_phone"]
    },
    {
      id: "rest-promo",
      name: "Special Promotion",
      description: "Promote special offers and events",
      category: "Promotions",
      icon: PartyPopper,
      subject: "🔥 Exclusive Offer Just for You, {{customer_name}}!",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">🎉 Special Offer!</h1>
  </div>
  
  <div style="padding: 30px; background: white;">
    <p>Hi {{customer_name}},</p>
    
    <p>We have an exclusive offer just for you!</p>
    
    <div style="text-align: center; padding: 20px;">
      <span style="font-size: 48px; font-weight: bold; color: #ef4444;">20% OFF</span>
      <p style="color: #6b7280;">Your entire order this weekend</p>
    </div>
    
    <p>Don't miss out on this limited-time offer. Visit us before {{offer_end_date}}!</p>
    
    <div style="text-align: center; margin: 20px 0;">
      <a href="{{booking_link}}" style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reserve Your Table</a>
    </div>
  </div>
  
  <p style="color: #6b7280; font-size: 14px; text-align: center;">{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name", "offer_end_date", "booking_link"]
    }
  ],
  bakery: [
    {
      id: "bakery-welcome",
      name: "Welcome Email",
      description: "Welcome new bakery customers",
      category: "Welcome",
      icon: Cake,
      subject: "Welcome to {{business_name}}! 🍰",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #f59e0b; text-align: center;">Welcome, {{customer_name}}! 🧁</h1>
  
  <p>Thank you for choosing <strong>{{business_name}}</strong>! We're delighted to have you as part of our baking family.</p>
  
  <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <h2 style="margin-top: 0; color: #b45309;">🎁 Sweet Welcome Gift</h2>
    <p style="font-size: 20px; color: #b45309;"><strong>Free Pastry</strong> with your next order!</p>
    <p style="font-size: 14px; color: #92400e;">Just mention this email</p>
  </div>
  
  <p>From fresh-baked breads to decadent cakes, we put love into every bite. Can't wait to see you!</p>
  
  <p style="color: #6b7280; font-size: 14px;">Freshly yours,<br>The {{business_name}} Team</p>
</div>`,
      variables: ["customer_name", "business_name"]
    },
    {
      id: "bakery-order-ready",
      name: "Order Ready for Pickup",
      description: "Notify customers their order is ready",
      category: "Orders",
      icon: Receipt,
      subject: "Your Order from {{business_name}} is Ready! 🥐",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #16a34a; text-align: center;">Your Order is Ready! ✅</h1>
  
  <p>Hi {{customer_name}},</p>
  
  <p>Great news! Your order from <strong>{{business_name}}</strong> is fresh out of the oven and ready for pickup.</p>
  
  <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #16a34a; margin: 20px 0;">
    <p style="margin: 0;"><strong>📦 Order #:</strong> {{order_number}}</p>
    <p style="margin: 8px 0;"><strong>📍 Pickup at:</strong> {{business_address}}</p>
    <p style="margin: 0;"><strong>⏰ Pickup by:</strong> {{pickup_time}}</p>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">Thank you for your order!<br>{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name", "order_number", "business_address", "pickup_time"]
    },
    {
      id: "bakery-custom-cake",
      name: "Custom Cake Inquiry",
      description: "Follow up on custom cake orders",
      category: "Custom Orders",
      icon: Cake,
      subject: "Your Custom Cake Consultation at {{business_name}} 🎂",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #f59e0b; text-align: center;">Let's Create Your Dream Cake! 🎂</h1>
  
  <p>Hi {{customer_name}},</p>
  
  <p>Thank you for your interest in a custom cake from <strong>{{business_name}}</strong>!</p>
  
  <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #b45309;">Next Steps:</h3>
    <ul style="margin-bottom: 0; color: #92400e;">
      <li>We'll call you within 24 hours to discuss your vision</li>
      <li>Share any inspiration photos you have</li>
      <li>We'll provide a custom quote</li>
    </ul>
  </div>
  
  <p>Questions? Call us at {{business_phone}}!</p>
  
  <p style="color: #6b7280; font-size: 14px;">Sweet regards,<br>{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name", "business_phone"]
    }
  ],
  coffee_shop: [
    {
      id: "coffee-welcome",
      name: "Welcome Email",
      description: "Welcome new coffee shop customers",
      category: "Welcome",
      icon: Coffee,
      subject: "Welcome to {{business_name}}! ☕",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #78350f; text-align: center;">Welcome, {{customer_name}}! ☕</h1>
  
  <p>Thank you for visiting <strong>{{business_name}}</strong>! We're thrilled to be your new caffeine destination.</p>
  
  <div style="background: linear-gradient(135deg, #fef3c7 0%, #d6d3d1 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <h2 style="margin-top: 0; color: #78350f;">☕ First Drink on Us!</h2>
    <p style="font-size: 20px; color: #78350f;"><strong>FREE Drink Upgrade</strong></p>
    <p style="font-size: 14px; color: #57534e;">Show this email on your next visit</p>
  </div>
  
  <p>Whether you're a latte lover or espresso enthusiast, we've got you covered!</p>
  
  <p style="color: #6b7280; font-size: 14px;">Caffeinated regards,<br>The {{business_name}} Team</p>
</div>`,
      variables: ["customer_name", "business_name"]
    },
    {
      id: "coffee-loyalty",
      name: "Loyalty Program Invite",
      description: "Invite customers to join loyalty program",
      category: "Loyalty",
      icon: Star,
      subject: "Earn Free Coffee at {{business_name}}! ⭐",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #78350f; text-align: center;">Join Our Rewards Program! ⭐</h1>
  
  <p>Hi {{customer_name}},</p>
  
  <p>Love your coffee? Get rewarded for it at <strong>{{business_name}}</strong>!</p>
  
  <div style="background: #78350f; color: white; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <h2 style="margin-top: 0;">How It Works</h2>
    <p style="font-size: 18px;">Buy 9 drinks → Get the 10th FREE!</p>
    <p style="font-size: 14px; opacity: 0.9;">Plus exclusive member-only offers</p>
  </div>
  
  <p>Start earning points on every purchase. It's free to join!</p>
  
  <p style="color: #6b7280; font-size: 14px;">See you soon!<br>{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name"]
    }
  ],
  bar_brewery: [
    {
      id: "bar-welcome",
      name: "Welcome Email",
      description: "Welcome new bar/brewery customers",
      category: "Welcome",
      icon: Wine,
      subject: "Welcome to {{business_name}}! 🍻",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #b45309; text-align: center;">Welcome, {{customer_name}}! 🍺</h1>
  
  <p>Thanks for stopping by <strong>{{business_name}}</strong>! We're glad you found us.</p>
  
  <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <h2 style="margin-top: 0; color: #b45309;">🍻 First Round Special</h2>
    <p style="font-size: 20px; color: #b45309;"><strong>Happy Hour Prices</strong> on your next visit!</p>
    <p style="font-size: 14px; color: #92400e;">Show this email to redeem</p>
  </div>
  
  <p>Cheers to great times ahead!</p>
  
  <p style="color: #6b7280; font-size: 14px;">Cheers,<br>The {{business_name}} Team</p>
</div>`,
      variables: ["customer_name", "business_name"]
    },
    {
      id: "bar-event",
      name: "Event Announcement",
      description: "Announce upcoming events",
      category: "Events",
      icon: PartyPopper,
      subject: "🎉 You're Invited: {{event_name}} at {{business_name}}!",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">🎉 {{event_name}}</h1>
  </div>
  
  <div style="padding: 30px; background: white;">
    <p>Hi {{customer_name}},</p>
    
    <p>You're invited to an exclusive event at <strong>{{business_name}}</strong>!</p>
    
    <div style="background: #f3e8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0;"><strong>📅 Date:</strong> {{event_date}}</p>
      <p style="margin: 8px 0;"><strong>⏰ Time:</strong> {{event_time}}</p>
      <p style="margin: 0;"><strong>🎵 Featuring:</strong> {{event_details}}</p>
    </div>
    
    <div style="text-align: center; margin: 20px 0;">
      <a href="{{rsvp_link}}" style="background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">RSVP Now</a>
    </div>
  </div>
</div>`,
      variables: ["customer_name", "business_name", "event_name", "event_date", "event_time", "event_details", "rsvp_link"]
    }
  ],
  food_truck: [
    {
      id: "truck-welcome",
      name: "Welcome Email",
      description: "Welcome new food truck followers",
      category: "Welcome",
      icon: Truck,
      subject: "Thanks for Finding Us! 🚚 {{business_name}}",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #ea580c; text-align: center;">Hey {{customer_name}}! 🚚</h1>
  
  <p>Thanks for tracking down <strong>{{business_name}}</strong>! We're stoked you found us.</p>
  
  <div style="background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <h2 style="margin-top: 0; color: #ea580c;">🎁 Welcome Discount</h2>
    <p style="font-size: 20px; color: #ea580c;"><strong>15% OFF</strong> your next order!</p>
    <p style="font-size: 14px; color: #c2410c;">Code: WELCOME15</p>
  </div>
  
  <p>Follow us on social media to always know where we'll be parked next!</p>
  
  <p style="color: #6b7280; font-size: 14px;">See you on the streets!<br>{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name"]
    },
    {
      id: "truck-location",
      name: "Location Update",
      description: "Let customers know where you're parked",
      category: "Updates",
      icon: Truck,
      subject: "📍 Find Us Today: {{business_name}} Location Update!",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #ea580c; text-align: center;">We're On the Move! 🚚</h1>
  
  <p>Hi {{customer_name}},</p>
  
  <p>Hungry? Here's where you can find <strong>{{business_name}}</strong> today!</p>
  
  <div style="background: #fff7ed; padding: 20px; border-radius: 8px; border-left: 4px solid #ea580c; margin: 20px 0;">
    <p style="margin: 0;"><strong>📍 Location:</strong> {{location}}</p>
    <p style="margin: 8px 0;"><strong>⏰ Hours:</strong> {{hours}}</p>
    <p style="margin: 0;"><strong>🍔 Today's Special:</strong> {{daily_special}}</p>
  </div>
  
  <p>See you there!</p>
  
  <p style="color: #6b7280; font-size: 14px;">{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name", "location", "hours", "daily_special"]
    }
  ],
  retail: [
    {
      id: "retail-welcome",
      name: "Welcome Email",
      description: "Welcome new retail customers",
      category: "Welcome",
      icon: Sparkles,
      subject: "Welcome to {{business_name}}! 🛍️",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #8b5cf6; text-align: center;">Welcome, {{customer_name}}!</h1>
  
  <p>Thank you for shopping with <strong>{{business_name}}</strong>. We're excited to have you!</p>
  
  <div style="background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <h2 style="margin-top: 0; color: #7c3aed;">🎁 Welcome Gift</h2>
    <p style="font-size: 24px; font-weight: bold; color: #7c3aed;">15% OFF</p>
    <p>Use code: <strong>WELCOME15</strong></p>
  </div>
  
  <p>Start shopping now and discover our latest collections!</p>
  
  <p style="color: #6b7280; font-size: 14px;">Happy shopping!<br>The {{business_name}} Team</p>
</div>`,
      variables: ["customer_name", "business_name"]
    },
    {
      id: "retail-order",
      name: "Order Confirmation",
      description: "Confirm customer orders",
      category: "Orders",
      icon: Receipt,
      subject: "Order Confirmed! #{{order_number}} 📦",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #16a34a; text-align: center;">Order Confirmed! ✅</h1>
  
  <p>Hi {{customer_name}},</p>
  
  <p>Great news! Your order has been confirmed.</p>
  
  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
    <p style="margin: 0;"><strong>Order Number:</strong> #{{order_number}}</p>
    <p style="margin: 8px 0;"><strong>Order Total:</strong> {{order_total}}</p>
    <p style="margin: 0;"><strong>Status:</strong> Processing</p>
  </div>
  
  <p>We'll notify you when your order ships.</p>
  
  <p style="color: #6b7280; font-size: 14px;">Thank you for shopping with us!<br>{{business_name}}</p>
</div>`,
      variables: ["customer_name", "order_number", "order_total", "business_name"]
    },
    {
      id: "retail-sale",
      name: "Sale Announcement",
      description: "Announce sales and discounts",
      category: "Promotions",
      icon: Gift,
      subject: "🎉 BIG SALE - Up to 50% OFF at {{business_name}}!",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 36px;">MEGA SALE</h1>
    <p style="color: white; font-size: 24px; margin: 10px 0;">Up to 50% OFF</p>
  </div>
  
  <div style="padding: 30px; background: white;">
    <p>Hi {{customer_name}},</p>
    
    <p>Our biggest sale of the season is here! Don't miss out on incredible savings.</p>
    
    <ul style="padding-left: 20px;">
      <li>Up to 50% off selected items</li>
      <li>Free shipping on orders over 50</li>
      <li>Extra 10% off with code: EXTRA10</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{shop_link}}" style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 18px;">Shop Now</a>
    </div>
    
    <p style="color: #6b7280; font-size: 12px; text-align: center;">Sale ends {{sale_end_date}}. Terms and conditions apply.</p>
  </div>
</div>`,
      variables: ["customer_name", "business_name", "shop_link", "sale_end_date"]
    }
  ],
  salon: [
    {
      id: "salon-welcome",
      name: "Welcome Email",
      description: "Welcome new salon clients",
      category: "Welcome",
      icon: Sparkles,
      subject: "Welcome to {{business_name}}! ✨",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #ec4899; text-align: center;">Welcome, {{customer_name}}! 💇‍♀️</h1>
  
  <p>Thank you for choosing <strong>{{business_name}}</strong> for your beauty needs!</p>
  
  <div style="background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <h2 style="margin-top: 0; color: #db2777;">First Visit Special</h2>
    <p style="font-size: 20px; color: #db2777;"><strong>20% OFF</strong> your first service</p>
  </div>
  
  <p>Book your appointment today and let us make you look and feel amazing!</p>
  
  <p style="color: #6b7280; font-size: 14px;">See you soon!<br>The {{business_name}} Team</p>
</div>`,
      variables: ["customer_name", "business_name"]
    },
    {
      id: "salon-reminder",
      name: "Appointment Reminder",
      description: "Remind clients of upcoming appointments",
      category: "Appointments",
      icon: Bell,
      subject: "Reminder: Your Appointment Tomorrow at {{business_name}} 📅",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #ec4899; text-align: center;">Appointment Reminder 💅</h1>
  
  <p>Hi {{customer_name}},</p>
  
  <p>Just a friendly reminder about your upcoming appointment!</p>
  
  <div style="background: #fdf2f8; padding: 20px; border-radius: 8px; border-left: 4px solid #ec4899; margin: 20px 0;">
    <p style="margin: 0;"><strong>📅 Date:</strong> {{appointment_date}}</p>
    <p style="margin: 8px 0;"><strong>⏰ Time:</strong> {{appointment_time}}</p>
    <p style="margin: 8px 0;"><strong>💇 Service:</strong> {{service_name}}</p>
    <p style="margin: 0;"><strong>👤 Stylist:</strong> {{stylist_name}}</p>
  </div>
  
  <p>Need to reschedule? Please call us at {{business_phone}} at least 24 hours in advance.</p>
  
  <p style="color: #6b7280; font-size: 14px;">We look forward to seeing you!<br>{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name", "appointment_date", "appointment_time", "service_name", "stylist_name", "business_phone"]
    },
    {
      id: "salon-review",
      name: "Request Review",
      description: "Ask for customer reviews",
      category: "Feedback",
      icon: Star,
      subject: "How was your visit to {{business_name}}? ⭐",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #ec4899; text-align: center;">Thank You! 💖</h1>
  
  <p>Hi {{customer_name}},</p>
  
  <p>Thank you for visiting <strong>{{business_name}}</strong>! We hope you loved your {{service_name}}.</p>
  
  <p>We'd love to hear your feedback! Your review helps us improve and helps others find us.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{review_link}}" style="background: #ec4899; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Leave a Review ⭐</a>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">Thank you for your support!<br>{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name", "service_name", "review_link"]
    }
  ],
  barbershop: [
    {
      id: "barber-welcome",
      name: "Welcome Email",
      description: "Welcome new barbershop clients",
      category: "Welcome",
      icon: Scissors,
      subject: "Welcome to {{business_name}}! ✂️",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1e3a5f; text-align: center;">Welcome, {{customer_name}}! 💈</h1>
  
  <p>Thanks for choosing <strong>{{business_name}}</strong>! We're glad you found us.</p>
  
  <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <h2 style="margin-top: 0; color: #1e3a5f;">✂️ First Cut Deal</h2>
    <p style="font-size: 20px; color: #1e3a5f;"><strong>15% OFF</strong> your first haircut</p>
  </div>
  
  <p>Book your next appointment and leave looking sharp!</p>
  
  <p style="color: #6b7280; font-size: 14px;">Stay fresh,<br>The {{business_name}} Team</p>
</div>`,
      variables: ["customer_name", "business_name"]
    },
    {
      id: "barber-reminder",
      name: "Haircut Reminder",
      description: "Remind clients it's time for a trim",
      category: "Reminders",
      icon: Bell,
      subject: "Time for a Fresh Cut? 💈 {{business_name}}",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1e3a5f; text-align: center;">Looking a Little Shaggy? ✂️</h1>
  
  <p>Hey {{customer_name}},</p>
  
  <p>It's been a while since your last visit to <strong>{{business_name}}</strong>. Time for a fresh cut?</p>
  
  <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <p style="font-size: 18px; color: #1e3a5f; margin: 0;">Book now and stay looking sharp!</p>
  </div>
  
  <div style="text-align: center; margin: 20px 0;">
    <a href="{{booking_link}}" style="background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Book Appointment</a>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">See you soon!<br>{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name", "booking_link"]
    }
  ],
  spa: [
    {
      id: "spa-welcome",
      name: "Welcome Email",
      description: "Welcome new spa clients",
      category: "Welcome",
      icon: Heart,
      subject: "Welcome to {{business_name}}! 🧘‍♀️",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #0d9488; text-align: center;">Welcome, {{customer_name}}! 🌿</h1>
  
  <p>Thank you for choosing <strong>{{business_name}}</strong> for your wellness journey.</p>
  
  <div style="background: linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <h2 style="margin-top: 0; color: #0d9488;">🧘 First Visit Gift</h2>
    <p style="font-size: 20px; color: #0d9488;"><strong>Complimentary Upgrade</strong></p>
    <p style="font-size: 14px; color: #0f766e;">Add aromatherapy to any treatment</p>
  </div>
  
  <p>We look forward to helping you relax, rejuvenate, and feel your best.</p>
  
  <p style="color: #6b7280; font-size: 14px;">Peaceful wishes,<br>The {{business_name}} Team</p>
</div>`,
      variables: ["customer_name", "business_name"]
    },
    {
      id: "spa-package",
      name: "Spa Package Promotion",
      description: "Promote spa packages and specials",
      category: "Promotions",
      icon: Gift,
      subject: "🌸 Treat Yourself: Exclusive Spa Packages at {{business_name}}",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">🌿 Escape & Unwind</h1>
  </div>
  
  <div style="padding: 30px; background: white;">
    <p>Hi {{customer_name}},</p>
    
    <p>You deserve a break. Discover our exclusive spa packages at <strong>{{business_name}}</strong>.</p>
    
    <div style="background: #f0fdfa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #0d9488;">Featured Package: {{package_name}}</h3>
      <p>{{package_description}}</p>
      <p style="font-size: 24px; color: #0d9488; font-weight: bold;">{{package_price}}</p>
    </div>
    
    <div style="text-align: center; margin: 20px 0;">
      <a href="{{booking_link}}" style="background: #0d9488; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Book Your Escape</a>
    </div>
  </div>
</div>`,
      variables: ["customer_name", "business_name", "package_name", "package_description", "package_price", "booking_link"]
    }
  ],
  fitness: [
    {
      id: "fitness-welcome",
      name: "Welcome Email",
      description: "Welcome new gym/fitness members",
      category: "Welcome",
      icon: Dumbbell,
      subject: "Welcome to {{business_name}}! 💪",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #dc2626; text-align: center;">Welcome, {{customer_name}}! 💪</h1>
  
  <p>Congratulations on taking the first step towards your fitness goals with <strong>{{business_name}}</strong>!</p>
  
  <div style="background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <h2 style="margin-top: 0; color: #dc2626;">🎯 New Member Bonus</h2>
    <p style="font-size: 20px; color: #dc2626;"><strong>FREE Personal Training Session</strong></p>
    <p style="font-size: 14px; color: #b91c1c;">Let's get you started right!</p>
  </div>
  
  <p>Your fitness journey starts now. We're here to support you every step of the way!</p>
  
  <p style="color: #6b7280; font-size: 14px;">Let's crush it!<br>The {{business_name}} Team</p>
</div>`,
      variables: ["customer_name", "business_name"]
    },
    {
      id: "fitness-class",
      name: "Class Schedule",
      description: "Share weekly class schedule",
      category: "Classes",
      icon: Calendar,
      subject: "📅 This Week's Classes at {{business_name}}",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #dc2626; text-align: center;">This Week's Classes 🏋️</h1>
  
  <p>Hey {{customer_name}},</p>
  
  <p>Here's what's happening at <strong>{{business_name}}</strong> this week!</p>
  
  <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #dc2626;">Featured Classes</h3>
    <ul style="margin-bottom: 0;">
      <li><strong>Monday:</strong> HIIT Blast - 6:00 AM & 6:00 PM</li>
      <li><strong>Wednesday:</strong> Yoga Flow - 7:00 AM</li>
      <li><strong>Friday:</strong> Spin Class - 5:30 PM</li>
      <li><strong>Saturday:</strong> Full Body Bootcamp - 9:00 AM</li>
    </ul>
  </div>
  
  <div style="text-align: center; margin: 20px 0;">
    <a href="{{schedule_link}}" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Full Schedule</a>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">See you there!<br>{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name", "schedule_link"]
    },
    {
      id: "fitness-motivation",
      name: "Motivation Email",
      description: "Keep members motivated",
      category: "Engagement",
      icon: Star,
      subject: "Don't Give Up! 💪 {{business_name}} Believes in You",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #f97316 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">YOU'VE GOT THIS! 🔥</h1>
  </div>
  
  <div style="padding: 30px; background: white;">
    <p>Hey {{customer_name}},</p>
    
    <p>We noticed it's been a little while since your last workout. No judgment – life happens!</p>
    
    <p>But remember: every workout counts, no matter how small. Your <strong>{{business_name}}</strong> family is here to support you.</p>
    
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="font-size: 18px; color: #dc2626; font-weight: bold; margin: 0;">"The only bad workout is the one that didn't happen."</p>
    </div>
    
    <div style="text-align: center; margin: 20px 0;">
      <a href="{{booking_link}}" style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Book Your Next Session</a>
    </div>
  </div>
</div>`,
      variables: ["customer_name", "business_name", "booking_link"]
    }
  ],
  healthcare: [
    {
      id: "health-welcome",
      name: "Welcome Email",
      description: "Welcome new patients",
      category: "Welcome",
      icon: Stethoscope,
      subject: "Welcome to {{business_name}} 🏥",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #0ea5e9; text-align: center;">Welcome, {{customer_name}}!</h1>
  
  <p>Thank you for choosing <strong>{{business_name}}</strong> for your healthcare needs. We're honored to be your partner in health.</p>
  
  <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #0ea5e9;">Before Your First Visit</h3>
    <ul style="margin-bottom: 0;">
      <li>Bring a valid ID and insurance card</li>
      <li>Arrive 15 minutes early to complete paperwork</li>
      <li>Prepare a list of current medications</li>
    </ul>
  </div>
  
  <p>Questions? Call us at {{business_phone}}.</p>
  
  <p style="color: #6b7280; font-size: 14px;">To your health,<br>The {{business_name}} Team</p>
</div>`,
      variables: ["customer_name", "business_name", "business_phone"]
    },
    {
      id: "health-reminder",
      name: "Appointment Reminder",
      description: "Remind patients of appointments",
      category: "Appointments",
      icon: Bell,
      subject: "Appointment Reminder: {{business_name}} 📅",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #0ea5e9; text-align: center;">Appointment Reminder</h1>
  
  <p>Hi {{customer_name}},</p>
  
  <p>This is a friendly reminder about your upcoming appointment at <strong>{{business_name}}</strong>.</p>
  
  <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
    <p style="margin: 0;"><strong>📅 Date:</strong> {{appointment_date}}</p>
    <p style="margin: 8px 0;"><strong>⏰ Time:</strong> {{appointment_time}}</p>
    <p style="margin: 8px 0;"><strong>👨‍⚕️ Provider:</strong> {{provider_name}}</p>
    <p style="margin: 0;"><strong>📍 Location:</strong> {{business_address}}</p>
  </div>
  
  <p>Please arrive 10 minutes early. Need to reschedule? Call us at {{business_phone}}.</p>
  
  <p style="color: #6b7280; font-size: 14px;">{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name", "appointment_date", "appointment_time", "provider_name", "business_address", "business_phone"]
    }
  ],
  automotive: [
    {
      id: "auto-welcome",
      name: "Welcome Email",
      description: "Welcome new auto service customers",
      category: "Welcome",
      icon: Car,
      subject: "Welcome to {{business_name}}! 🚗",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1e40af; text-align: center;">Welcome, {{customer_name}}! 🚗</h1>
  
  <p>Thanks for trusting <strong>{{business_name}}</strong> with your vehicle. We're committed to keeping you on the road!</p>
  
  <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <h2 style="margin-top: 0; color: #1e40af;">🔧 New Customer Offer</h2>
    <p style="font-size: 20px; color: #1e40af;"><strong>10% OFF</strong> your first service</p>
  </div>
  
  <p>We look forward to serving you!</p>
  
  <p style="color: #6b7280; font-size: 14px;">Drive safe,<br>The {{business_name}} Team</p>
</div>`,
      variables: ["customer_name", "business_name"]
    },
    {
      id: "auto-service-due",
      name: "Service Reminder",
      description: "Remind customers of service due",
      category: "Reminders",
      icon: Bell,
      subject: "🔧 Your Vehicle Service is Due - {{business_name}}",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1e40af; text-align: center;">Time for a Check-Up! 🔧</h1>
  
  <p>Hi {{customer_name}},</p>
  
  <p>According to our records, your {{vehicle_info}} is due for service at <strong>{{business_name}}</strong>.</p>
  
  <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #1e40af;">Recommended Service:</h3>
    <p style="margin: 0;">{{service_type}}</p>
  </div>
  
  <p>Regular maintenance keeps your vehicle running smoothly and prevents costly repairs.</p>
  
  <div style="text-align: center; margin: 20px 0;">
    <a href="{{booking_link}}" style="background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Schedule Service</a>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">{{business_name}}<br>{{business_phone}}</p>
</div>`,
      variables: ["customer_name", "business_name", "vehicle_info", "service_type", "booking_link", "business_phone"]
    },
    {
      id: "auto-ready",
      name: "Vehicle Ready",
      description: "Notify customers vehicle is ready",
      category: "Updates",
      icon: Car,
      subject: "✅ Your Vehicle is Ready - {{business_name}}",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #16a34a; text-align: center;">Your Vehicle is Ready! ✅</h1>
  
  <p>Hi {{customer_name}},</p>
  
  <p>Great news! Your {{vehicle_info}} is ready for pickup at <strong>{{business_name}}</strong>.</p>
  
  <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #16a34a; margin: 20px 0;">
    <p style="margin: 0;"><strong>Service Completed:</strong> {{service_type}}</p>
    <p style="margin: 8px 0;"><strong>Total:</strong> {{total_amount}}</p>
    <p style="margin: 0;"><strong>Pickup Hours:</strong> {{business_hours}}</p>
  </div>
  
  <p>Please bring this email or a valid ID for pickup.</p>
  
  <p style="color: #6b7280; font-size: 14px;">Thank you for your business!<br>{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name", "vehicle_info", "service_type", "total_amount", "business_hours"]
    }
  ],
  pet_services: [
    {
      id: "pet-welcome",
      name: "Welcome Email",
      description: "Welcome new pet parents",
      category: "Welcome",
      icon: PawPrint,
      subject: "Welcome to {{business_name}}! 🐾",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #84cc16; text-align: center;">Welcome, {{customer_name}}! 🐾</h1>
  
  <p>Thank you for trusting <strong>{{business_name}}</strong> with your furry family member!</p>
  
  <div style="background: linear-gradient(135deg, #ecfccb 0%, #d9f99d 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <h2 style="margin-top: 0; color: #65a30d;">🐶 Welcome Treat</h2>
    <p style="font-size: 20px; color: #65a30d;"><strong>15% OFF</strong> your first visit</p>
  </div>
  
  <p>We can't wait to meet {{pet_name}}!</p>
  
  <p style="color: #6b7280; font-size: 14px;">Wagging tails,<br>The {{business_name}} Team</p>
</div>`,
      variables: ["customer_name", "business_name", "pet_name"]
    },
    {
      id: "pet-grooming-reminder",
      name: "Grooming Reminder",
      description: "Remind customers about pet grooming",
      category: "Reminders",
      icon: Bell,
      subject: "🛁 Time for {{pet_name}}'s Spa Day! - {{business_name}}",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #84cc16; text-align: center;">Grooming Time! 🛁</h1>
  
  <p>Hi {{customer_name}},</p>
  
  <p>Is {{pet_name}} looking a little shaggy? It might be time for a grooming session at <strong>{{business_name}}</strong>!</p>
  
  <div style="background: #ecfccb; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <p style="font-size: 18px; color: #65a30d; margin: 0;">Regular grooming keeps {{pet_name}} healthy & happy!</p>
  </div>
  
  <div style="text-align: center; margin: 20px 0;">
    <a href="{{booking_link}}" style="background: #84cc16; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Book Grooming</a>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">See you soon!<br>{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name", "pet_name", "booking_link"]
    }
  ],
  home_services: [
    {
      id: "home-welcome",
      name: "Welcome Email",
      description: "Welcome new home service customers",
      category: "Welcome",
      icon: Home,
      subject: "Welcome to {{business_name}}! 🏠",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #059669; text-align: center;">Welcome, {{customer_name}}! 🏠</h1>
  
  <p>Thank you for choosing <strong>{{business_name}}</strong> for your home service needs!</p>
  
  <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <h2 style="margin-top: 0; color: #059669;">🏠 First-Time Customer Discount</h2>
    <p style="font-size: 20px; color: #059669;"><strong>25 OFF</strong> your first service</p>
  </div>
  
  <p>We're committed to providing reliable, quality service for your home.</p>
  
  <p style="color: #6b7280; font-size: 14px;">Best regards,<br>The {{business_name}} Team</p>
</div>`,
      variables: ["customer_name", "business_name"]
    },
    {
      id: "home-quote",
      name: "Quote Follow-Up",
      description: "Follow up on service quotes",
      category: "Sales",
      icon: Receipt,
      subject: "Your Quote from {{business_name}} - Ready to Schedule?",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #059669; text-align: center;">Your Quote Summary 📋</h1>
  
  <p>Hi {{customer_name}},</p>
  
  <p>Thank you for your interest in <strong>{{business_name}}</strong>. Here's a summary of your quote:</p>
  
  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
    <p style="margin: 0;"><strong>Service:</strong> {{service_type}}</p>
    <p style="margin: 8px 0;"><strong>Estimated Cost:</strong> {{quote_amount}}</p>
    <p style="margin: 0;"><strong>Valid Until:</strong> {{quote_expiry}}</p>
  </div>
  
  <p>Ready to move forward? We'd be happy to schedule your service at your convenience.</p>
  
  <div style="text-align: center; margin: 20px 0;">
    <a href="{{booking_link}}" style="background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Schedule Service</a>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">Questions? Call us at {{business_phone}}<br>{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name", "service_type", "quote_amount", "quote_expiry", "booking_link", "business_phone"]
    },
    {
      id: "home-completed",
      name: "Service Completed",
      description: "Follow up after service completion",
      category: "Follow-Up",
      icon: Star,
      subject: "Service Complete! How Did We Do? - {{business_name}}",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #059669; text-align: center;">Service Complete! ✅</h1>
  
  <p>Hi {{customer_name}},</p>
  
  <p>Thank you for choosing <strong>{{business_name}}</strong>! We hope you're satisfied with our work.</p>
  
  <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0;"><strong>Service Completed:</strong> {{service_type}}</p>
    <p style="margin: 8px 0;"><strong>Date:</strong> {{service_date}}</p>
  </div>
  
  <p>Your feedback helps us improve! Would you mind leaving us a quick review?</p>
  
  <div style="text-align: center; margin: 20px 0;">
    <a href="{{review_link}}" style="background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Leave a Review ⭐</a>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">Thank you for your business!<br>{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name", "service_type", "service_date", "review_link"]
    }
  ],
  landscaping: [
    {
      id: "landscape-welcome",
      name: "Welcome Email",
      description: "Welcome new landscaping customers",
      category: "Welcome",
      icon: Leaf,
      subject: "Welcome to {{business_name}}! 🌿",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #22c55e; text-align: center;">Welcome, {{customer_name}}! 🌿</h1>
  
  <p>Thank you for choosing <strong>{{business_name}}</strong> to beautify your outdoor space!</p>
  
  <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <h2 style="margin-top: 0; color: #16a34a;">🌱 New Customer Special</h2>
    <p style="font-size: 20px; color: #16a34a;"><strong>FREE</strong> lawn assessment</p>
  </div>
  
  <p>We're excited to help you create the outdoor oasis you've always dreamed of!</p>
  
  <p style="color: #6b7280; font-size: 14px;">Growing together,<br>The {{business_name}} Team</p>
</div>`,
      variables: ["customer_name", "business_name"]
    },
    {
      id: "landscape-seasonal",
      name: "Seasonal Service",
      description: "Promote seasonal landscaping services",
      category: "Promotions",
      icon: Leaf,
      subject: "🍂 Seasonal Lawn Care - {{business_name}}",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #22c55e; text-align: center;">Seasonal Service Time! 🌱</h1>
  
  <p>Hi {{customer_name}},</p>
  
  <p>It's that time of year! Your lawn needs some seasonal TLC from <strong>{{business_name}}</strong>.</p>
  
  <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #16a34a;">{{season}} Services Include:</h3>
    <ul style="margin-bottom: 0; color: #15803d;">
      <li>{{service_1}}</li>
      <li>{{service_2}}</li>
      <li>{{service_3}}</li>
    </ul>
  </div>
  
  <div style="text-align: center; margin: 20px 0;">
    <a href="{{booking_link}}" style="background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Schedule Now</a>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">{{business_name}}<br>{{business_phone}}</p>
</div>`,
      variables: ["customer_name", "business_name", "season", "service_1", "service_2", "service_3", "booking_link", "business_phone"]
    }
  ],
  cleaning: [
    {
      id: "clean-welcome",
      name: "Welcome Email",
      description: "Welcome new cleaning customers",
      category: "Welcome",
      icon: Brush,
      subject: "Welcome to {{business_name}}! ✨",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #0891b2; text-align: center;">Welcome, {{customer_name}}! ✨</h1>
  
  <p>Thank you for choosing <strong>{{business_name}}</strong>! We're thrilled to help keep your space sparkling clean.</p>
  
  <div style="background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <h2 style="margin-top: 0; color: #0891b2;">🧹 First Clean Special</h2>
    <p style="font-size: 20px; color: #0891b2;"><strong>20% OFF</strong> your first cleaning</p>
  </div>
  
  <p>A clean home is a happy home. Let us do the dirty work!</p>
  
  <p style="color: #6b7280; font-size: 14px;">Sparkling regards,<br>The {{business_name}} Team</p>
</div>`,
      variables: ["customer_name", "business_name"]
    },
    {
      id: "clean-recurring",
      name: "Recurring Service Offer",
      description: "Promote recurring cleaning services",
      category: "Promotions",
      icon: Calendar,
      subject: "🏠 Save with Regular Cleaning - {{business_name}}",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #0891b2; text-align: center;">Make Life Easier! 🧹</h1>
  
  <p>Hi {{customer_name}},</p>
  
  <p>Loved your recent cleaning? Never worry about a messy home again with our recurring service plans from <strong>{{business_name}}</strong>!</p>
  
  <div style="background: #cffafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #0891b2;">Recurring Service Savings:</h3>
    <ul style="margin-bottom: 0; color: #0e7490;">
      <li><strong>Weekly:</strong> Save 15%</li>
      <li><strong>Bi-Weekly:</strong> Save 10%</li>
      <li><strong>Monthly:</strong> Save 5%</li>
    </ul>
  </div>
  
  <div style="text-align: center; margin: 20px 0;">
    <a href="{{booking_link}}" style="background: #0891b2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Set Up Recurring Service</a>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name", "booking_link"]
    }
  ],
  services: [
    {
      id: "svc-welcome",
      name: "Welcome Email",
      description: "Welcome new service clients",
      category: "Welcome",
      icon: Sparkles,
      subject: "Welcome to {{business_name}}! 🤝",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #0891b2; text-align: center;">Welcome, {{customer_name}}!</h1>
  
  <p>Thank you for choosing <strong>{{business_name}}</strong>. We're committed to providing you with excellent service!</p>
  
  <div style="background: #ecfeff; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h2 style="margin-top: 0; color: #0891b2;">What's Next?</h2>
    <ul style="margin-bottom: 0;">
      <li>Our team will contact you within 24 hours</li>
      <li>We'll discuss your specific needs</li>
      <li>Get a customized quote</li>
    </ul>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">Best regards,<br>The {{business_name}} Team</p>
</div>`,
      variables: ["customer_name", "business_name"]
    },
    {
      id: "svc-invoice",
      name: "Invoice Email",
      description: "Send invoices to clients",
      category: "Billing",
      icon: Receipt,
      subject: "Invoice #{{invoice_number}} from {{business_name}}",
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #0891b2; text-align: center;">Invoice</h1>
  
  <p>Hi {{customer_name}},</p>
  
  <p>Please find your invoice details below:</p>
  
  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
    <p style="margin: 0;"><strong>Invoice #:</strong> {{invoice_number}}</p>
    <p style="margin: 8px 0;"><strong>Amount Due:</strong> {{invoice_total}}</p>
    <p style="margin: 0;"><strong>Due Date:</strong> {{due_date}}</p>
  </div>
  
  <div style="text-align: center; margin: 20px 0;">
    <a href="{{payment_link}}" style="background: #0891b2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Pay Now</a>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">Thank you for your business!<br>{{business_name}}</p>
</div>`,
      variables: ["customer_name", "business_name", "invoice_number", "invoice_total", "due_date", "payment_link"]
    }
  ]
};

// Industry mapping for aliases
const INDUSTRY_MAPPING: Record<string, string> = {
  // Food & Beverage
  restaurant: "restaurant",
  full_service: "restaurant",
  quick_service: "restaurant",
  franchise: "restaurant",
  bakery: "bakery",
  coffee_shop: "coffee_shop",
  cafe: "coffee_shop",
  bar: "bar_brewery",
  brewery: "bar_brewery",
  bar_brewery: "bar_brewery",
  food_truck: "food_truck",
  catering: "restaurant",
  // Retail
  retail: "retail",
  clothing: "retail",
  grocery: "retail",
  garden: "retail",
  home_gift: "retail",
  wine_liquor: "retail",
  // Beauty
  salon: "salon",
  hair_salon: "salon",
  beauty_salon: "salon",
  nail_salon: "salon",
  barbershop: "barbershop",
  barber: "barbershop",
  med_spa: "spa",
  tattoo_piercing: "salon",
  // Health & Wellness
  spa: "spa",
  day_spa: "spa",
  fitness: "fitness",
  gym: "fitness",
  healthcare: "healthcare",
  cbd: "retail",
  // Home & Commercial
  cleaning: "cleaning",
  contractors: "home_services",
  landscaping: "landscaping",
  home_services: "home_services",
  // Services
  automotive: "automotive",
  auto: "automotive",
  pet_services: "pet_services",
  pet: "pet_services",
  professional_services: "services",
  nonprofits: "services",
  recreation: "services",
  transportation: "services",
  services: "services",
};

const INDUSTRY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  restaurant: Utensils,
  bakery: Cake,
  coffee_shop: Coffee,
  bar_brewery: Wine,
  food_truck: Truck,
  retail: ShoppingBag,
  salon: Scissors,
  barbershop: Scissors,
  spa: Heart,
  fitness: Dumbbell,
  healthcare: Stethoscope,
  automotive: Car,
  pet_services: PawPrint,
  home_services: Home,
  landscaping: Leaf,
  cleaning: Brush,
  services: Wrench,
  default: Building2,
};

export const IndustryTemplates = ({ industry, onSelectTemplate }: IndustryTemplatesProps) => {
  const templates = useMemo(() => {
    const normalizedIndustry = industry?.toLowerCase().replace(/[-\s]/g, "_") || "services";
    const mappedIndustry = INDUSTRY_MAPPING[normalizedIndustry] || "services";
    return TEMPLATES[mappedIndustry] || TEMPLATES.services;
  }, [industry]);

  const IndustryIcon = useMemo(() => {
    const normalizedIndustry = industry?.toLowerCase().replace(/[-\s]/g, "_") || "default";
    const mappedIndustry = INDUSTRY_MAPPING[normalizedIndustry] || "default";
    return INDUSTRY_ICONS[mappedIndustry] || INDUSTRY_ICONS.default;
  }, [industry]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <IndustryIcon className="h-4 w-4" />
          Suggested Templates
        </CardTitle>
        <CardDescription className="text-xs">
          Industry-specific templates tailored for your business
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          <div className="p-4 pt-0 space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template.subject, template.body)}
                className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <template.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{template.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {template.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
