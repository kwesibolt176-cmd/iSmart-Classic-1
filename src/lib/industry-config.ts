// Centralized industry configuration for consistent terminology across the app

export interface IndustryConfig {
  // Product/service terminology
  productLabel: string;       // "Products", "Menu Items", "Services"
  productLabelPlural: string; // "Products", "Menu", "Services"
  addProductLabel: string;    // "Add Product", "Add Dish", "Add Service"
  catalogLabel: string;       // "Catalog", "Menu", "Services"
  inventoryLabel: string;     // "Inventory", "Dishes", "Service Items"
  
  // Order terminology
  orderLabel: string;         // "Order", "Order", "Booking"
  orderLabelPlural: string;   // "Orders", "Orders", "Bookings"
  
  // Customer terminology
  customerLabel: string;      // "Customer", "Guest", "Client"
  
  // Cart terminology
  cartLabel: string;          // "Cart", "Order", "Booking"
  checkoutLabel: string;      // "Checkout", "Checkout", "Book Now"
  
  // Staff terminology
  staffLabel: string;         // "Staff", "Server", "Technician"
  
  // Shows specific features
  showIngredients: boolean;
  showTables: boolean;
  showKitchen: boolean;
  showAppointments: boolean;
  trackStock: boolean;        // Default stock tracking behavior
}

// Food & beverage industries
const foodIndustries = [
  "restaurant", "bakery", "bar_brewery", "catering", "coffee_shop", 
  "food_truck", "franchise", "full_service_restaurant", "quick_service"
];

// Retail industries
const retailIndustries = [
  "retail", "grocery", "clothing", "clothing_retail", "home_gift", 
  "wine_liquor", "garden", "garden_retail"
];

// Beauty industries
const beautyIndustries = [
  "salon", "barbershop", "hair_salon", "nail_salon", "beauty_salon", "tattoo_piercing"
];

// Wellness industries
const wellnessIndustries = [
  "spa", "med_spa", "day_spa", "fitness", "healthcare", "cbd"
];

// Home services industries
const homeServiceIndustries = [
  "cleaning", "contractors", "landscaping"
];

// Automotive industries
const automotiveIndustries = [
  "automotive", "transportation"
];

// Professional services
const professionalIndustries = [
  "services", "professional_services", "nonprofit", "recreation", "pet_services"
];

export const isFoodIndustry = (industry?: string): boolean => {
  return foodIndustries.includes(industry || "");
};

export const isRetailIndustry = (industry?: string): boolean => {
  return retailIndustries.includes(industry || "");
};

export const isBeautyIndustry = (industry?: string): boolean => {
  return beautyIndustries.includes(industry || "");
};

export const isWellnessIndustry = (industry?: string): boolean => {
  return wellnessIndustries.includes(industry || "");
};

export const isHomeServiceIndustry = (industry?: string): boolean => {
  return homeServiceIndustries.includes(industry || "");
};

export const isAutomotiveIndustry = (industry?: string): boolean => {
  return automotiveIndustries.includes(industry || "");
};

export const isProfessionalIndustry = (industry?: string): boolean => {
  return professionalIndustries.includes(industry || "");
};

export const isServiceIndustry = (industry?: string): boolean => {
  return isBeautyIndustry(industry) || 
         isWellnessIndustry(industry) || 
         isHomeServiceIndustry(industry) || 
         isAutomotiveIndustry(industry) ||
         isProfessionalIndustry(industry);
};

export const getIndustryConfig = (industry?: string): IndustryConfig => {
  // Food & Beverage
  if (isFoodIndustry(industry)) {
    return {
      productLabel: "Dish",
      productLabelPlural: "Menu",
      addProductLabel: "Add Dish",
      catalogLabel: "Menu",
      inventoryLabel: "Dishes",
      orderLabel: "Order",
      orderLabelPlural: "Orders",
      customerLabel: "Guest",
      cartLabel: "Order",
      checkoutLabel: "Place Order",
      staffLabel: "Server",
      showIngredients: true,
      showTables: true,
      showKitchen: true,
      showAppointments: false,
      trackStock: false, // Dishes typically don't track stock directly
    };
  }
  
  // Retail
  if (isRetailIndustry(industry)) {
    return {
      productLabel: "Product",
      productLabelPlural: "Products",
      addProductLabel: "Add Product",
      catalogLabel: "Catalog",
      inventoryLabel: "Inventory",
      orderLabel: "Order",
      orderLabelPlural: "Orders",
      customerLabel: "Customer",
      cartLabel: "Cart",
      checkoutLabel: "Checkout",
      staffLabel: "Sales Associate",
      showIngredients: false,
      showTables: false,
      showKitchen: false,
      showAppointments: false,
      trackStock: true,
    };
  }
  
  // Beauty
  if (isBeautyIndustry(industry)) {
    return {
      productLabel: "Service",
      productLabelPlural: "Services",
      addProductLabel: "Add Service",
      catalogLabel: "Services",
      inventoryLabel: "Service Menu",
      orderLabel: "Appointment",
      orderLabelPlural: "Appointments",
      customerLabel: "Client",
      cartLabel: "Booking",
      checkoutLabel: "Book Now",
      staffLabel: "Stylist",
      showIngredients: false,
      showTables: false,
      showKitchen: false,
      showAppointments: true,
      trackStock: false,
    };
  }
  
  // Wellness
  if (isWellnessIndustry(industry)) {
    return {
      productLabel: "Service",
      productLabelPlural: "Services",
      addProductLabel: "Add Service",
      catalogLabel: "Services",
      inventoryLabel: "Treatments",
      orderLabel: "Session",
      orderLabelPlural: "Sessions",
      customerLabel: "Client",
      cartLabel: "Booking",
      checkoutLabel: "Book Session",
      staffLabel: "Therapist",
      showIngredients: false,
      showTables: false,
      showKitchen: false,
      showAppointments: true,
      trackStock: false,
    };
  }
  
  // Automotive
  if (isAutomotiveIndustry(industry)) {
    return {
      productLabel: "Service",
      productLabelPlural: "Services",
      addProductLabel: "Add Service",
      catalogLabel: "Services",
      inventoryLabel: "Service Menu",
      orderLabel: "Job",
      orderLabelPlural: "Jobs",
      customerLabel: "Customer",
      cartLabel: "Work Order",
      checkoutLabel: "Create Job",
      staffLabel: "Technician",
      showIngredients: false,
      showTables: false,
      showKitchen: false,
      showAppointments: true,
      trackStock: true, // Parts tracking
    };
  }
  
  // Home Services
  if (isHomeServiceIndustry(industry)) {
    return {
      productLabel: "Service",
      productLabelPlural: "Services",
      addProductLabel: "Add Service",
      catalogLabel: "Services",
      inventoryLabel: "Service List",
      orderLabel: "Job",
      orderLabelPlural: "Jobs",
      customerLabel: "Client",
      cartLabel: "Quote",
      checkoutLabel: "Create Quote",
      staffLabel: "Crew Member",
      showIngredients: false,
      showTables: false,
      showKitchen: false,
      showAppointments: true,
      trackStock: false,
    };
  }
  
  // Pet Services
  if (industry === "pet_services") {
    return {
      productLabel: "Service",
      productLabelPlural: "Services",
      addProductLabel: "Add Service",
      catalogLabel: "Services",
      inventoryLabel: "Service Menu",
      orderLabel: "Appointment",
      orderLabelPlural: "Appointments",
      customerLabel: "Pet Parent",
      cartLabel: "Booking",
      checkoutLabel: "Book Now",
      staffLabel: "Groomer",
      showIngredients: false,
      showTables: false,
      showKitchen: false,
      showAppointments: true,
      trackStock: false,
    };
  }
  
  // Default - General Services/Products
  return {
    productLabel: "Product",
    productLabelPlural: "Products",
    addProductLabel: "Add Product",
    catalogLabel: "Catalog",
    inventoryLabel: "Inventory",
    orderLabel: "Order",
    orderLabelPlural: "Orders",
    customerLabel: "Customer",
    cartLabel: "Cart",
    checkoutLabel: "Checkout",
    staffLabel: "Staff",
    showIngredients: false,
    showTables: false,
    showKitchen: false,
    showAppointments: false,
    trackStock: true,
  };
};

// Helper to get status labels based on industry
export const getOrderStatusLabels = (industry?: string): Record<string, string> => {
  if (isFoodIndustry(industry)) {
    return {
      pending: "New",
      preparing: "Preparing",
      ready: "Ready",
      served: "Served",
      completed: "Completed",
    };
  }
  
  if (isBeautyIndustry(industry) || isWellnessIndustry(industry)) {
    return {
      pending: "Scheduled",
      preparing: "In Progress",
      ready: "Finishing",
      served: "Done",
      completed: "Completed",
    };
  }
  
  if (isAutomotiveIndustry(industry) || isHomeServiceIndustry(industry)) {
    return {
      pending: "Pending",
      preparing: "In Progress",
      ready: "Completed",
      served: "Delivered",
      completed: "Closed",
    };
  }
  
  // Default retail/generic
  return {
    pending: "Pending",
    preparing: "Processing",
    ready: "Ready",
    served: "Picked Up",
    completed: "Completed",
  };
};
