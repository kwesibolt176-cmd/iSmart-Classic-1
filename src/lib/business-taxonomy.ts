/**
 * Business categories / industries accepted by the iSmart
 * `/publicauth/register-business` endpoint. Both `category` and `industry`
 * are required strings, so we offer a curated taxonomy at sign-up.
 */
export const BUSINESS_CATEGORIES: { category: string; industries: string[] }[] = [
  {
    category: "Retail & Commerce",
    industries: ["Supermarket & Grocery", "Fashion & Apparel", "Electronics & Gadgets", "General Merchandise", "Online Store"],
  },
  {
    category: "Food & Hospitality",
    industries: ["Restaurant", "Fast Food & Takeaway", "Bar & Lounge", "Hotel & Guest House", "Catering Services"],
  },
  {
    category: "Financial Technology",
    industries: ["Payment Gateway Services", "Mobile Money Agency", "Lending & Microfinance", "Insurance Services", "Forex & Remittance"],
  },
  {
    category: "Health & Wellness",
    industries: ["Pharmacy", "Clinic & Hospital", "Laboratory & Diagnostics", "Fitness & Gym", "Beauty & Spa"],
  },
  {
    category: "Education",
    industries: ["School", "Tutoring & Test Prep", "Vocational Training", "Online Courses"],
  },
  {
    category: "Transport & Logistics",
    industries: ["Courier & Delivery", "Ride Hailing", "Freight & Haulage", "Travel & Tours"],
  },
  {
    category: "Professional Services",
    industries: ["Consulting", "Legal Services", "Accounting & Audit", "Marketing & Advertising", "IT & Software Services"],
  },
  {
    category: "Construction & Real Estate",
    industries: ["Building Contractor", "Hardware & Building Materials", "Real Estate Agency", "Property Management"],
  },
  {
    category: "Agriculture",
    industries: ["Crop Farming", "Poultry & Livestock", "Agro Processing", "Farm Inputs & Agrochemicals"],
  },
  {
    category: "Entertainment & Media",
    industries: ["Events & Ticketing", "Music & Production", "Digital Content", "Gaming"],
  },
  {
    category: "Other Services",
    industries: ["Laundry & Cleaning", "Repairs & Maintenance", "Printing & Stationery", "Other"],
  },
];

/**
 * ORC legal forms accepted by the Merchant API `POST /v1/businesses`
 * (`BusinessCreate.businessType`). Any other value is rejected with 400.
 */
export const BUSINESS_TYPES = [
  { value: "sole_proprietorship", label: "Business Name (Sole Proprietorship)" },
  { value: "subsidiary_business_name", label: "Subsidiary Business Name" },
  { value: "incorporated_private_partnership", label: "Incorporated Private Partnership" },
  { value: "company_limited_by_shares", label: "Company Limited by Shares" },
  { value: "company_limited_by_guarantee", label: "Company Limited by Guarantee" },
  { value: "company_unlimited_by_shares", label: "Company Unlimited by Shares" },
  { value: "external_company", label: "External Company" },
  { value: "professional_body", label: "Professional Body" },
] as const;

export type BusinessTypeValue = (typeof BUSINESS_TYPES)[number]["value"];

export const getIndustriesForCategory = (category: string): string[] =>
  BUSINESS_CATEGORIES.find((c) => c.category === category)?.industries ?? [];
