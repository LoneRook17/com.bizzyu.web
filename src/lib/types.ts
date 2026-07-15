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

/**
 * Optional time window for a deal, e.g. "3pm to 6pm, Mon to Thu".
 *
 * `days` uses 0=Sunday..6=Saturday, matching JS getDay(). The Laravel deal
 * model has its own `availability_windows` with a `day_of_week` column, but it
 * is empty on every live deal, so the convention there is unverified. This
 * submission is read by a human from the email (which spells the days out in
 * words), so nothing depends on the numbers lining up yet. Confirm the
 * backend's numbering before anything automated consumes this.
 */
export interface DealAvailability {
  enabled: boolean;
  /** 24h "HH:MM", as produced by <input type="time">. */
  startTime: string;
  endTime: string;
  days: number[];
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
  availability: DealAvailability;
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
    // Every day, so switching the toggle on only asks for the two times.
    availability: { enabled: false, startTime: "", endTime: "", days: [0, 1, 2, 3, 4, 5, 6] },
  },
  media: {
    logoUrl: "",
    dealImageUrl: "",
  },
};

export const DAY_OPTIONS = [
  { value: 0, short: "Sun", label: "Sunday" },
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
];

/** "15:00" to "3:00 PM". Returns "" for empty/malformed input. */
export function formatTime12h(value: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value?.trim() ?? "");
  if (!m) return "";
  const h = Number(m[1]);
  if (h > 23 || Number(m[2]) > 59) return "";
  const suffix = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m[2]} ${suffix}`;
}

/**
 * One human-readable line for the window, for the notification email and the
 * review step. Returns "" when the toggle is off or the times are incomplete,
 * so callers can fall back to "All day".
 */
export function formatAvailability(a: DealAvailability | undefined): string {
  if (!a?.enabled) return "";
  const from = formatTime12h(a.startTime);
  const to = formatTime12h(a.endTime);
  if (!from || !to) return "";

  const days = [...(a.days ?? [])].sort((x, y) => x - y);
  // No days means no window at all. Returning a string here would read as
  // "No days selected, 3:00 PM to 6:00 PM" and would defeat callers that fall
  // back on "" to prompt for the missing input.
  if (days.length === 0) return "";

  let dayText: string;
  if (days.length === 7) dayText = "Every day";
  else if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) dayText = "Weekdays";
  else if (days.length === 2 && days.includes(0) && days.includes(6)) dayText = "Weekends";
  else dayText = days.map((d) => DAY_OPTIONS[d]?.short).filter(Boolean).join(", ");

  return `${dayText}, ${from} to ${to}`;
}

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
