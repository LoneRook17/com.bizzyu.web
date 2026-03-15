export interface BusinessInfo {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  instagram: string;
  campus: string;
}

export interface DealInfo {
  title: string;
  description: string;
  category: string;
  redemptionFrequency: string;
  limitedSupplyCount: string;
  estimatedSavings: string;
  startDate: string;
  endDate: string;
}

export interface MediaInfo {
  logoUrl: string;
  dealImageUrl: string;
}

export interface Submission {
  id: string;
  business: BusinessInfo;
  deal: DealInfo;
  media: MediaInfo;
  status: "pending" | "approved" | "rejected" | "live";
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormData {
  business: BusinessInfo;
  deal: DealInfo;
  media: MediaInfo;
}

export const EMPTY_FORM: FormData = {
  business: {
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    instagram: "",
    campus: "",
  },
  deal: {
    title: "",
    description: "",
    category: "",
    redemptionFrequency: "",
    limitedSupplyCount: "",
    estimatedSavings: "",
    startDate: "",
    endDate: "",
  },
  media: {
    logoUrl: "",
    dealImageUrl: "",
  },
};

export const DEAL_CATEGORIES = [
  "Food & Dining",
  "Drinks & Bars",
  "Entertainment",
  "Fitness & Wellness",
  "Retail & Shopping",
  "Services",
  "Other",
];

export const REDEMPTION_OPTIONS = [
  {
    value: "once_per_day",
    label: "Once Per Day",
    info: "After a student claims this deal, it locks for 24 hours before they can claim again.",
  },
  {
    value: "once_per_week",
    label: "Once Per Week",
    info: "After a student claims this deal, it locks for 7 days before they can claim again.",
  },
  {
    value: "once_per_month",
    label: "Once Per Month",
    info: "After a student claims this deal, it locks for 30 days before they can claim again.",
  },
  {
    value: "limited_supply",
    label: "Limited Supply",
    info: "Only a set number of claims are available total. Once they're gone, the deal is done.",
  },
];
