import { PARTNERSHIPS_EMAIL } from "@/lib/constants";

export const BRANDS_PATH = "/brands";
export const BRANDS_API_PATH = "/api/brands";
export const BRANDS_FORM_ID = "apply";
export const BRANDS_HOW_ID = "how-it-works";

/* ==========================================================================
   LAUNCH BLOCKER: the hero stat row ships with placeholders.
   Cooper supplies the real counts (universities on Bizzy, verified students)
   after /brands goes live. The page HIDES any stat still set to
   STAT_PLACEHOLDER, so the row shows only "Free to list" until the real
   counts are filled in here. Grep for STAT_PLACEHOLDER to find every use.
   ========================================================================== */
export const STAT_PLACEHOLDER = "[X]";

export const BRAND_STATS = [
  { value: STAT_PLACEHOLDER, label: "universities on Bizzy" },
  { value: STAT_PLACEHOLDER, label: "verified students" },
  { value: "Free", label: "to list" },
] as const;

/* LAUNCH CHECK: which inbox brands write to. Partnerships@ already receives
   the venue partnership inquiries, so it is the default; the build plan lists
   Contact@ as the alternative. Notification email goes to the same address
   unless BRANDS_NOTIFY_TO overrides it (see api/brands/route.ts). */
export const BRANDS_CONTACT_EMAIL = PARTNERSHIPS_EMAIL;

export const WHY_BIZZY = [
  {
    title: "Verified students only.",
    description:
      "Every Bizzy user is a college student. Your offer never leaks to the general public.",
    icon: "shield",
  },
  {
    title: "In the moment, not on a list.",
    description:
      "Students use Bizzy to find deals, events, and nights out on their campus. Your offer shows up where they're already deciding what to do and what to buy.",
    icon: "bolt",
  },
  {
    title: "Campus-level reach.",
    description:
      "Bizzy is live at every US university. Target nationally or see performance by campus.",
    icon: "map",
  },
] as const;

export const HOW_IT_WORKS = [
  { n: "1", title: "Apply.", description: "Tell us about your brand and your student offer." },
  {
    n: "2",
    title: "We review.",
    description:
      "We check that the offer is a real student perk (see requirements) and get it set up. Usually within a few business days.",
  },
  {
    n: "3",
    title: "Go live.",
    description: "Your offer appears in National Deals for students at every campus.",
  },
  {
    n: "4",
    title: "Track results.",
    description: "Partners get referral tracking and campus-level reporting.",
  },
] as const;

/* Offer Requirements. Meaning is fixed by the build plan; do not soften. */
export const QUALIFIES = [
  "A dedicated student plan or student pricing",
  "A percentage or dollar discount unlocked by student status",
  "A free trial extension or extra months for students",
  "A first-order or signup credit for students",
  "A student-only bundle or perk",
] as const;

export const DOES_NOT_QUALIFY = [
  "Standard pricing or a link to your regular pricing page",
  "A public promo code anyone can use",
  "“10% off for everyone”",
] as const;

export const TIERS = {
  listed: {
    name: "Listed",
    price: "Free",
    tagline: "Get your student offer in front of every campus.",
    features: [
      "Placement in National Deals at every campus",
      "You provide the offer and a landing link or code",
      "Pause or update any time",
    ],
  },
  partner: {
    name: "Partner",
    price: "By application",
    tagline: "For brands that want tracked, accountable student acquisition.",
    features: [
      "Everything in Listed",
      "Tracked referrals with agreed CPA or revenue share",
      "Featured placement and campus-level reporting",
      "Terms comparable to other student acquisition channels",
    ],
  },
} as const;

export const BRANDS_FAQ = [
  {
    question: "Does it cost anything to list?",
    answer: "No. Listing is free. Partner-tier terms are agreed case by case.",
  },
  {
    question: "How do you verify students?",
    answer:
      "Students verify with a school email and, where needed, proof of enrollment. Your existing verification (SheerID, for example) keeps working on your end.",
  },
  {
    question: "Can we see performance?",
    answer:
      "Partner-tier brands get referral tracking and campus-level reporting. Listed brands can request a summary.",
  },
  {
    question: "Can we pause or change our offer?",
    answer: "Yes, any time. Email us or resubmit the form with the update.",
  },
  {
    question: "Do you require exclusivity?",
    answer: "No.",
  },
  {
    question: "What if our student offer is already on UniDays or Student Beans?",
    answer:
      "That's fine. Bizzy is non-exclusive. Most partners keep their existing programs and add Bizzy as an additional channel.",
  },
  {
    question: "Who do we talk to?",
    answer: `Email ${BRANDS_CONTACT_EMAIL}. A person reads every message, and applications get a reply within a few business days.`,
  },
] as const;
