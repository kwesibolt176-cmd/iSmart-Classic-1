import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const industryCategories: Record<string, { name: string; icon: string; subcategories: string[] }[]> = {
  // Food & Beverage
  bakery: [
    { name: "Breads", icon: "🍞", subcategories: ["Loaves", "Rolls", "Baguettes", "Specialty"] },
    { name: "Pastries", icon: "🥐", subcategories: ["Croissants", "Danish", "Puff Pastry", "Tarts"] },
    { name: "Cakes", icon: "🎂", subcategories: ["Birthday", "Wedding", "Custom", "Cupcakes"] },
    { name: "Beverages", icon: "☕", subcategories: ["Coffee", "Tea", "Smoothies", "Juices"] },
  ],
  bar_brewery: [
    { name: "Beer", icon: "🍺", subcategories: ["Craft", "Lager", "Ale", "Stout"] },
    { name: "Spirits", icon: "🥃", subcategories: ["Whiskey", "Vodka", "Rum", "Gin"] },
    { name: "Wine", icon: "🍷", subcategories: ["Red", "White", "Rosé", "Sparkling"] },
    { name: "Food", icon: "🍔", subcategories: ["Appetizers", "Main", "Snacks"] },
  ],
  catering: [
    { name: "Event Types", icon: "🎉", subcategories: ["Corporate", "Wedding", "Private", "Public"] },
    { name: "Menu Items", icon: "🍽️", subcategories: ["Appetizers", "Mains", "Desserts", "Beverages"] },
    { name: "Services", icon: "👨‍🍳", subcategories: ["Full Service", "Drop-off", "Buffet", "Plated"] },
  ],
  coffee_shop: [
    { name: "Hot Drinks", icon: "☕", subcategories: ["Espresso", "Latte", "Cappuccino", "Tea"] },
    { name: "Cold Drinks", icon: "🧊", subcategories: ["Iced Coffee", "Frappuccino", "Smoothies", "Juices"] },
    { name: "Food", icon: "🥪", subcategories: ["Pastries", "Sandwiches", "Salads", "Snacks"] },
  ],
  food_truck: [
    { name: "Main Menu", icon: "🌮", subcategories: ["Signature", "Combos", "Sides", "Kids"] },
    { name: "Beverages", icon: "🥤", subcategories: ["Soft Drinks", "Water", "Specialty"] },
    { name: "Specials", icon: "⭐", subcategories: ["Daily Special", "Seasonal", "Limited Time"] },
  ],
  franchise: [
    { name: "Food", icon: "🍔", subcategories: ["Burgers", "Sandwiches", "Sides", "Desserts"] },
    { name: "Beverages", icon: "🥤", subcategories: ["Soft Drinks", "Coffee", "Shakes", "Water"] },
    { name: "Combos", icon: "🎁", subcategories: ["Value Meals", "Family Packs", "Kids Meals"] },
  ],
  full_service_restaurant: [
    { name: "Appetizers", icon: "🥗", subcategories: ["Salads", "Soups", "Starters", "Shared"] },
    { name: "Main Course", icon: "🍽️", subcategories: ["Meat", "Seafood", "Vegetarian", "Pasta"] },
    { name: "Desserts", icon: "🍰", subcategories: ["Cakes", "Ice Cream", "Pastries", "Fruits"] },
    { name: "Beverages", icon: "🥤", subcategories: ["Hot Drinks", "Cold Drinks", "Alcoholic", "Non-Alcoholic"] },
  ],
  quick_service: [
    { name: "Combos", icon: "🍔", subcategories: ["Value Meals", "Family Packs", "Kids Meals"] },
    { name: "Sides", icon: "🍟", subcategories: ["Fries", "Salads", "Snacks"] },
    { name: "Drinks", icon: "🥤", subcategories: ["Soft Drinks", "Shakes", "Coffee"] },
  ],
  restaurant: [
    { name: "Food", icon: "🍽️", subcategories: ["Appetizers", "Main Course", "Desserts", "Sides"] },
    { name: "Beverages", icon: "🥤", subcategories: ["Hot Drinks", "Cold Drinks", "Alcoholic", "Non-Alcoholic"] },
    { name: "Ingredients", icon: "🥗", subcategories: ["Vegetables", "Meat", "Dairy", "Spices"] },
  ],
  
  // Retail
  clothing_retail: [
    { name: "Men's", icon: "👔", subcategories: ["Shirts", "Pants", "Suits", "Accessories"] },
    { name: "Women's", icon: "👗", subcategories: ["Dresses", "Tops", "Bottoms", "Accessories"] },
    { name: "Kids", icon: "👶", subcategories: ["Boys", "Girls", "Baby", "Teens"] },
    { name: "Footwear", icon: "👟", subcategories: ["Casual", "Formal", "Athletic", "Sandals"] },
  ],
  garden_retail: [
    { name: "Plants", icon: "🌱", subcategories: ["Indoor", "Outdoor", "Flowers", "Trees"] },
    { name: "Tools", icon: "🔧", subcategories: ["Hand Tools", "Power Tools", "Watering", "Storage"] },
    { name: "Supplies", icon: "🌿", subcategories: ["Soil", "Fertilizer", "Pots", "Seeds"] },
  ],
  grocery: [
    { name: "Fresh", icon: "🥬", subcategories: ["Fruits", "Vegetables", "Meat", "Dairy"] },
    { name: "Pantry", icon: "🥫", subcategories: ["Canned", "Dry Goods", "Snacks", "Baking"] },
    { name: "Frozen", icon: "❄️", subcategories: ["Meals", "Ice Cream", "Vegetables", "Meat"] },
    { name: "Beverages", icon: "🥤", subcategories: ["Water", "Juice", "Soda", "Alcohol"] },
  ],
  home_gift: [
    { name: "Home Decor", icon: "🏠", subcategories: ["Wall Art", "Lighting", "Textiles", "Accents"] },
    { name: "Gifts", icon: "🎁", subcategories: ["Personal", "Seasonal", "Corporate", "Cards"] },
    { name: "Kitchen", icon: "🍳", subcategories: ["Cookware", "Dinnerware", "Utensils", "Appliances"] },
  ],
  wine_liquor: [
    { name: "Wine", icon: "🍷", subcategories: ["Red", "White", "Rosé", "Sparkling"] },
    { name: "Spirits", icon: "🥃", subcategories: ["Whiskey", "Vodka", "Rum", "Gin"] },
    { name: "Beer", icon: "🍺", subcategories: ["Craft", "Import", "Domestic", "Non-Alcoholic"] },
    { name: "Accessories", icon: "🍾", subcategories: ["Glasses", "Openers", "Storage", "Gift Sets"] },
  ],
  retail: [
    { name: "Electronics", icon: "📱", subcategories: ["Phones", "Computers", "Accessories", "Audio"] },
    { name: "Clothing", icon: "👕", subcategories: ["Men", "Women", "Kids", "Accessories"] },
    { name: "Home & Living", icon: "🏠", subcategories: ["Furniture", "Decor", "Kitchen", "Bedding"] },
    { name: "Books & Stationery", icon: "📚", subcategories: ["Books", "Office Supplies", "Art Supplies"] },
  ],
  
  // Beauty
  barbershop: [
    { name: "Haircuts", icon: "✂️", subcategories: ["Classic", "Fade", "Beard Trim", "Kids"] },
    { name: "Grooming", icon: "🧔", subcategories: ["Shave", "Beard Care", "Facial", "Styling"] },
    { name: "Products", icon: "🧴", subcategories: ["Pomade", "Oils", "Aftershave", "Brushes"] },
  ],
  beauty_salon: [
    { name: "Hair", icon: "💇", subcategories: ["Cut", "Color", "Style", "Treatment"] },
    { name: "Nails", icon: "💅", subcategories: ["Manicure", "Pedicure", "Gel", "Art"] },
    { name: "Skin", icon: "✨", subcategories: ["Facial", "Waxing", "Makeup", "Lashes"] },
    { name: "Products", icon: "🧴", subcategories: ["Hair Care", "Skin Care", "Cosmetics", "Tools"] },
  ],
  hair_salon: [
    { name: "Cuts", icon: "✂️", subcategories: ["Women", "Men", "Kids", "Specialty"] },
    { name: "Color", icon: "🎨", subcategories: ["Full Color", "Highlights", "Balayage", "Touch-up"] },
    { name: "Treatments", icon: "💆", subcategories: ["Deep Condition", "Keratin", "Scalp", "Repair"] },
    { name: "Styling", icon: "💇", subcategories: ["Blowout", "Updo", "Extensions", "Braids"] },
  ],
  med_spa: [
    { name: "Injectables", icon: "💉", subcategories: ["Botox", "Fillers", "PRP", "Kybella"] },
    { name: "Skin", icon: "✨", subcategories: ["Laser", "Peels", "Microneedling", "LED"] },
    { name: "Body", icon: "🧘", subcategories: ["Sculpting", "Cellulite", "Hair Removal", "Vein"] },
    { name: "Wellness", icon: "🌟", subcategories: ["IV Therapy", "Supplements", "Consultations"] },
  ],
  nail_salon: [
    { name: "Manicure", icon: "💅", subcategories: ["Basic", "Gel", "Acrylic", "Dip"] },
    { name: "Pedicure", icon: "🦶", subcategories: ["Basic", "Spa", "Gel", "Luxury"] },
    { name: "Art", icon: "🎨", subcategories: ["Simple", "Complex", "3D", "Custom"] },
    { name: "Products", icon: "🧴", subcategories: ["Polish", "Tools", "Care", "Gift Sets"] },
  ],
  tattoo_piercing: [
    { name: "Tattoos", icon: "🎨", subcategories: ["Small", "Medium", "Large", "Custom"] },
    { name: "Piercings", icon: "💎", subcategories: ["Ear", "Facial", "Body", "Dermal"] },
    { name: "Jewelry", icon: "✨", subcategories: ["Studs", "Hoops", "Barbells", "Custom"] },
    { name: "Aftercare", icon: "🧴", subcategories: ["Balms", "Cleaning", "Sprays", "Kits"] },
  ],
  salon: [
    { name: "Hair Services", icon: "💇", subcategories: ["Cut", "Color", "Style", "Treatment"] },
    { name: "Beauty Services", icon: "💅", subcategories: ["Nails", "Facial", "Makeup", "Waxing"] },
    { name: "Products", icon: "🧴", subcategories: ["Hair Care", "Skin Care", "Cosmetics", "Tools"] },
  ],
  
  // Health & Wellness
  cbd: [
    { name: "Oils", icon: "💧", subcategories: ["Tinctures", "Drops", "Sprays", "Capsules"] },
    { name: "Topicals", icon: "🧴", subcategories: ["Creams", "Balms", "Lotions", "Patches"] },
    { name: "Edibles", icon: "🍬", subcategories: ["Gummies", "Chocolates", "Drinks", "Mints"] },
    { name: "Wellness", icon: "🌿", subcategories: ["Sleep", "Stress", "Pain", "Focus"] },
  ],
  day_spa: [
    { name: "Massage", icon: "💆", subcategories: ["Swedish", "Deep Tissue", "Hot Stone", "Couples"] },
    { name: "Facial", icon: "✨", subcategories: ["Classic", "Anti-aging", "Hydrating", "Acne"] },
    { name: "Body", icon: "🧘", subcategories: ["Wrap", "Scrub", "Soak", "Detox"] },
    { name: "Packages", icon: "🎁", subcategories: ["Half Day", "Full Day", "Couples", "Group"] },
  ],
  fitness: [
    { name: "Memberships", icon: "🏋️", subcategories: ["Monthly", "Annual", "Day Pass", "Student"] },
    { name: "Classes", icon: "🧘", subcategories: ["Yoga", "Spin", "HIIT", "Strength"] },
    { name: "Training", icon: "💪", subcategories: ["Personal", "Group", "Online", "Nutrition"] },
    { name: "Products", icon: "🥤", subcategories: ["Supplements", "Apparel", "Equipment", "Accessories"] },
  ],
  healthcare: [
    { name: "Consultations", icon: "🩺", subcategories: ["General", "Specialist", "Follow-up", "Emergency"] },
    { name: "Treatments", icon: "💊", subcategories: ["Therapy", "Procedures", "Tests", "Vaccinations"] },
    { name: "Medical Supplies", icon: "🏥", subcategories: ["Medicines", "Equipment", "Consumables"] },
  ],
  
  // Home & Commercial
  cleaning: [
    { name: "Residential", icon: "🏠", subcategories: ["Regular", "Deep Clean", "Move In/Out", "Post-Construction"] },
    { name: "Commercial", icon: "🏢", subcategories: ["Office", "Retail", "Medical", "Industrial"] },
    { name: "Specialty", icon: "✨", subcategories: ["Carpet", "Window", "Pressure Wash", "Upholstery"] },
  ],
  contractors: [
    { name: "Construction", icon: "🏗️", subcategories: ["New Build", "Renovation", "Addition", "Commercial"] },
    { name: "Electrical", icon: "⚡", subcategories: ["Installation", "Repair", "Upgrade", "Inspection"] },
    { name: "Plumbing", icon: "🔧", subcategories: ["Install", "Repair", "Emergency", "Maintenance"] },
    { name: "HVAC", icon: "❄️", subcategories: ["Install", "Repair", "Maintenance", "Inspection"] },
  ],
  landscaping: [
    { name: "Lawn Care", icon: "🌿", subcategories: ["Mowing", "Fertilizing", "Aeration", "Seeding"] },
    { name: "Design", icon: "🌺", subcategories: ["Planting", "Hardscape", "Lighting", "Water Features"] },
    { name: "Maintenance", icon: "🌳", subcategories: ["Pruning", "Mulching", "Cleanup", "Irrigation"] },
  ],
  
  // Services
  automotive: [
    { name: "Repair", icon: "🔧", subcategories: ["Engine", "Brakes", "Transmission", "Electrical"] },
    { name: "Maintenance", icon: "🚗", subcategories: ["Oil Change", "Tires", "Inspection", "Tune-up"] },
    { name: "Detailing", icon: "✨", subcategories: ["Wash", "Interior", "Exterior", "Full Detail"] },
    { name: "Parts", icon: "⚙️", subcategories: ["OEM", "Aftermarket", "Accessories", "Fluids"] },
  ],
  nonprofit: [
    { name: "Programs", icon: "🤝", subcategories: ["Education", "Community", "Health", "Environment"] },
    { name: "Events", icon: "🎉", subcategories: ["Fundraiser", "Awareness", "Volunteer", "Gala"] },
    { name: "Donations", icon: "💝", subcategories: ["One-time", "Recurring", "In-kind", "Corporate"] },
  ],
  pet_services: [
    { name: "Grooming", icon: "🐕", subcategories: ["Bath", "Haircut", "Nails", "Full Groom"] },
    { name: "Boarding", icon: "🏠", subcategories: ["Overnight", "Day Care", "Extended", "Luxury"] },
    { name: "Training", icon: "🎾", subcategories: ["Basic", "Advanced", "Behavior", "Private"] },
    { name: "Products", icon: "🦴", subcategories: ["Food", "Treats", "Toys", "Accessories"] },
  ],
  services: [
    { name: "Consulting", icon: "💼", subcategories: ["Business", "Financial", "Legal", "IT"] },
    { name: "Professional Services", icon: "⚡", subcategories: ["Accounting", "Marketing", "Design", "Development"] },
    { name: "Maintenance", icon: "🔧", subcategories: ["Repair", "Installation", "Inspection", "Support"] },
  ],
  recreation: [
    { name: "Activities", icon: "🎮", subcategories: ["Games", "Sports", "Tours", "Classes"] },
    { name: "Rentals", icon: "🚴", subcategories: ["Equipment", "Vehicles", "Space", "Party"] },
    { name: "Events", icon: "🎉", subcategories: ["Birthday", "Corporate", "Group", "Custom"] },
  ],
  transportation: [
    { name: "Rides", icon: "🚕", subcategories: ["Standard", "Premium", "Shared", "Airport"] },
    { name: "Delivery", icon: "📦", subcategories: ["Same Day", "Express", "Scheduled", "Freight"] },
    { name: "Rental", icon: "🚗", subcategories: ["Cars", "Vans", "Trucks", "Specialty"] },
  ],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, industry } = await req.json();

    if (!userId || !industry) {
      return new Response(
        JSON.stringify({ error: "userId and industry are required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const categories = industryCategories[industry as keyof typeof industryCategories] || [];

    // Insert categories and subcategories
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      
      // Insert category
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .insert({
          user_id: userId,
          name: category.name,
          icon: category.icon,
          display_order: i,
          is_active: true,
        })
        .select()
        .single();

      if (categoryError) {
        console.error('Error inserting category:', categoryError);
        continue;
      }

      // Insert subcategories
      if (category.subcategories && categoryData) {
        const subcategoriesData = category.subcategories.map((subName, j) => ({
          user_id: userId,
          category_id: categoryData.id,
          name: subName,
          display_order: j,
          is_active: true,
        }));

        const { error: subError } = await supabase
          .from('subcategories')
          .insert(subcategoriesData);

        if (subError) {
          console.error('Error inserting subcategories:', subError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Categories created successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in seed-industry-categories:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
