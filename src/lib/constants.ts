export const APP_STORE_URL =
  "https://apps.apple.com/us/app/bizzy-college-deals-events/id6683306360";

export const INSTAGRAM_URL = "https://instagram.com/Bizzy.University";
export const TIKTOK_URL = "https://tiktok.com/@bizzyapp";
export const CONTACT_EMAIL = "Contact@BizzyU.com";
export const PARTNERSHIPS_EMAIL = "Partnerships@BizzyU.com";

export const CALENDLY_DEMO_URL =
  "https://calendly.com/partnerships-bizzyu/bizzy-bar-intro";

/* One path per audience. "For Businesses" lumped a café owner and a nightclub
   together, and they share almost nothing operationally: one wants five-minute
   setup and students through the door, the other wants ticketing economics and
   door tools. /students redirects to "/", so the homepage IS the student page. */
export const NAV_LINKS = [
  { label: "Students", href: "/" },
  { label: "Restaurants", href: "/post-a-deal" },
  { label: "Bars & Events", href: "/events" },
  { label: "About", href: "/about" },
];

export const CAMPUSES = [
  { name: "FGCU", location: "Fort Myers, FL" },
  { name: "USF", location: "Tampa, FL" },
  { name: "UGA", location: "Athens, GA" },
  { name: "ASU", location: "Tempe, AZ" },
];

export const STUDENT_FAQ = [
  {
    question: "What is Bizzy?",
    answer:
      "Bizzy is a free mobile app that connects college students with exclusive deals and events at local businesses near campus.",
  },
  {
    question: "Why should I use Bizzy?",
    answer:
      "Bizzy helps you save money and explore your college town with exclusive student-only deals at local restaurants, bars, and hangout spots - plus find events happening near you.",
  },
  {
    question: "How do I claim a deal?",
    answer:
      "Go in store, show the full deal to a staff member, and they'll tap the verify button to confirm it's a live deal. That's it - you're all set!",
  },
  {
    question: "What kinds of deals are available?",
    answer:
      "You'll find BOGO deals, meal deals, flat dollar off, free items with purchase, percentage discounts, and monthly exclusives on food, drinks, entertainment, and more. Every deal is exclusive to Bizzy - you can't find them anywhere else.",
  },
  {
    question: "What about events?",
    answer:
      "Bizzy has a full Events tab where you can discover bar nights, live music, themed events, campus activities, and more. You can RSVP or buy tickets to events directly in the app.",
  },
  {
    question: "Can I buy event tickets on Bizzy?",
    answer:
      "Yes! Businesses can sell tickets directly through Bizzy. You can browse events, buy tickets or RSVP right in the app - no third-party platforms needed.",
  },
];

export const EVENTS_FAQ = [
  {
    question: "Does Bizzy charge the venue?",
    answer:
      "No. Venues pay 0% platform fees. Your bar keeps 100% of the ticket, line skip, and cover price you set. Students pay the service fee at checkout.",
  },
  {
    question: "How does the promoter payout actually work?",
    answer:
      "You set a commission rate per event (e.g. 10%). Anyone who wants to earn grabs a personal referral link with their name. No approval needed. Every ticket sold through their link auto-pays the promoter. Bizzy pays out automatically within days. You see every dollar tracked in real time.",
  },
  {
    question: "Can we send SMS blasts to past attendees?",
    answer:
      "Yes. SMS blasts go to every student who's attended a past event at your venue. Personalized to your bar. One-tap to grab a line skip or ticket. Included and unlimited.",
  },
  {
    question: "Can my door staff use it?",
    answer:
      "Yes. Assign door staff to scan tickets, manage check-ins, and collect cover from their own phone. They never see payouts or customer data.",
  },
  {
    question: "How fast can we get going?",
    answer:
      "You can post events within a day. We help build your profile, ticket tiers, promo codes, staff access, and Stripe payout flow on a single setup call, then you take it from there.",
  },
];

export const BUSINESS_FAQ = [
  {
    question: "Is it really free for businesses?",
    answer:
      "Yes. No platform fees, no commissions, no percentage of sales. We don't take a cut from your sales or deal redemptions.",
  },
  {
    question: "What's the catch?",
    answer:
      "The only requirement is that your deal must be exclusive to Bizzy - meaning the deal you list can't be offered to anyone but Bizzy users.",
  },
  {
    question: "What kinds of deals can I list?",
    answer:
      "BOGO deals, meal deals, flat dollar off, free items with purchase, percentage discounts, and monthly exclusives. We help you choose what works best for your business.",
  },
  {
    question: "Can I promote events and sell tickets?",
    answer:
      "Yes! You can list events in the app for students to discover, RSVP, or buy tickets. You can also use Tap to Pay to accept cover charges and payments at the door. You keep 100% of your proceeds - powered by Stripe.",
  },
  {
    question: "Does Bizzy take a percentage of sales or redemptions?",
    answer:
      "No. Bizzy does not take a cut from your sales, deal redemptions, or ticket sales.",
  },
  {
    question: "Is there any technical setup required?",
    answer:
      "No special equipment or POS integration needed. Students show the Bizzy deal at checkout, and a staff member taps the verify button. That's it.",
  },
  {
    question: "Can I change or remove my deals after I list?",
    answer:
      "Yes. Manage everything yourself from the Deals section of your business dashboard, edit a deal, pause it, or take it down anytime, and the change goes live right away.",
  },
  {
    question: "How will I know if my deal is working?",
    answer:
      "Your business dashboard has a built-in Analytics tab. Track views, redemptions, and how each deal is performing in real time, broken down by location.",
  },
  {
    question: "How do I get started?",
    answer:
      "Create your free account and post your first deal right from your dashboard, about 5 minutes, no call needed. Just hit Get Started Free to sign up.",
  },
];
