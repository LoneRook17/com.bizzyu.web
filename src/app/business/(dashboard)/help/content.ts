import type { LucideIcon } from "lucide-react"
import {
  Rocket, MapPin, CalendarDays, CreditCard, Zap, Tag, BarChart3, Users,
  Settings, RotateCcw, Smartphone, HelpCircle, Mail, DoorOpen,
} from "lucide-react"
import {
  ANALYTICS_HELP_INTRO,
  ANALYTICS_HELP_TABS,
  ANALYTICS_HELP_REVENUE_FAQ,
} from "@/lib/business/analytics-copy"
import { PROMOTER_COMMISSION_AVAILABLE_AFTER_COPY } from "@/lib/business/promoter-commission-hold"
import { PROMOTER_WITHDRAW_HELP_AFTER_HOLD } from "@/lib/business/withdraw-copy"

/** A content block within a subsection. */
export type Block =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "note"; text: string }

export interface SubSection {
  id: string
  title: string
  blocks: Block[]
}

export interface FAQ {
  q: string
  a: string
}

export interface HelpSection {
  id: string
  title: string
  icon: LucideIcon
  intro: string
  subsections: SubSection[]
  faqs?: FAQ[]
}

/** Flatten a section into searchable plain text. */
export function sectionText(s: HelpSection): string {
  const parts: string[] = [s.title, s.intro]
  for (const sub of s.subsections) {
    parts.push(sub.title)
    for (const b of sub.blocks) {
      if (b.kind === "p" || b.kind === "note") parts.push(b.text)
      else parts.push(b.items.join(" "))
    }
  }
  for (const f of s.faqs ?? []) parts.push(f.q, f.a)
  return parts.join(" ").toLowerCase()
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "getting-started",
    title: "Getting started",
    icon: Rocket,
    intro: "Everything you need to get up and running on Bizzy.",
    subsections: [
      {
        id: "welcome",
        title: "Welcome to Bizzy for business",
        blocks: [
          { kind: "p", text: "Bizzy helps bars, clubs, restaurants, and venues sell tickets, run Weekly Cover, offer deals, and manage line skips to college students. It's your all-in-one tool for reaching students on campus." },
          { kind: "p", text: "From this dashboard you can:" },
          { kind: "ul", items: [
            "Events: create named events, sell tickets, and track who shows up",
            "Weekly Cover: sell Cover for your regular nights (pink on Events)",
            "Line skips: the standalone skip-the-line product (not a Weekly Cover tier)",
            "Deals: post special offers that drive foot traffic",
            "Analytics: see tickets sold, Weekly Cover nights, revenue, and top-performing deals",
            "Team: invite staff, managers, and promoters",
            "Settings: manage venues, connect Stripe, update your info",
            "Scanner: scan named-event QR tickets at the door. Weekly Cover uses any phone camera.",
          ] },
        ],
      },
      {
        id: "your-account",
        title: "Your account",
        blocks: [
          { kind: "p", text: "Log in with the email and password you used when you signed up." },
          { kind: "p", text: "To reset your password, click \"Forgot password\" on the login page, enter your email, and follow the reset link (check spam if it doesn't arrive within a few minutes)." },
          { kind: "note", text: "Locked out and the reset link isn't working? Email support@bizzyu.com and we'll help you get back in." },
        ],
      },
      {
        id: "account-approval",
        title: "Account approval",
        blocks: [
          { kind: "p", text: "After you sign up, your account goes through a quick review:" },
          { kind: "ol", items: [
            "You sign up and fill in your business details",
            "The Bizzy team reviews your information",
            "Once approved, you get full access to create events, Weekly Cover, deals, and line skips",
          ] },
          { kind: "p", text: "Approval usually takes 1-2 business days. While you wait you can still log in, explore the dashboard, and set up your venue." },
        ],
      },
      {
        id: "connecting-stripe",
        title: "Connecting Stripe (getting paid)",
        blocks: [
          { kind: "p", text: "Stripe is the payment service that handles the money. When a customer buys a ticket or line skip, Stripe collects payment and sends your share to your bank account." },
          { kind: "p", text: "You must connect Stripe before you can create any paid events, Weekly Cover, or line skips. To connect:" },
          { kind: "ol", items: [
            "Go to Settings in the sidebar",
            "Find the Stripe Connect section and click \"Set up business Stripe\"",
            "Follow Stripe's wizard, they'll ask for your business details, bank account, and a photo ID for verification",
            "Once finished, you're brought back to the Bizzy dashboard",
          ] },
          { kind: "note", text: "After each sale, money typically arrives in your bank account within 2-3 business days." },
        ],
      },
      {
        id: "bizzy-app",
        title: "Using the Bizzy app on your phone",
        blocks: [
          { kind: "p", text: "Alongside this dashboard, the Bizzy phone app lets you scan tickets, sell at the door with Tap-to-Pay, and more." },
          { kind: "ol", items: [
            "Download the Bizzy app from the App Store or Google Play",
            "Create an account using your phone number (you'll get a verification code)",
            "Your phone number links the app to your business account so everything stays in sync",
          ] },
        ],
      },
    ],
  },
  {
    id: "venues",
    title: "Venues",
    icon: MapPin,
    intro: "Venues are the physical locations where your events happen.",
    subsections: [
      {
        id: "what-is-venue",
        title: "What is a venue?",
        blocks: [
          { kind: "p", text: "A venue is a physical location: your bar, club, restaurant, or any place you host events or offer deals." },
          { kind: "ul", items: [
            "Your business can have multiple venues",
            "Every event, Weekly Cover series, deal, and line skip is attached to a specific venue",
            "Each venue has its own page in the app",
          ] },
          { kind: "p", text: "Use the venue switcher at the top of the sidebar to move between venues. Selecting a venue filters the whole dashboard to that location; \"All venues\" shows everything." },
        ],
      },
      {
        id: "first-venue",
        title: "Setting up your first venue",
        blocks: [
          { kind: "p", text: "When you first log in after approval, you'll add your first venue:" },
          { kind: "ol", items: [
            "Venue name: the name of your bar, club, or restaurant",
            "Address: how customers find you",
            "Description: what kind of place it is and the vibe",
            "Photo: shows in the app, so make it a good one",
            "Website and Instagram (optional)",
          ] },
        ],
      },
      {
        id: "adding-venues",
        title: "Adding and editing venues",
        blocks: [
          { kind: "p", text: "Add another location from the venue dropdown (\"Add venue\") or from Settings → Your venues." },
          { kind: "p", text: "To edit, go to Settings → Your venues, click Edit on the venue, update the details, and save. Changes appear in the app right away." },
        ],
      },
    ],
  },
  {
    id: "events",
    title: "Events",
    icon: CalendarDays,
    intro: "Create named events, sell tickets, and manage everything on event day. Weekly Cover is a different product (pink). Don't guess from a title that ends in Cover.",
    subsections: [
      {
        id: "what-are-events",
        title: "What are events?",
        blocks: [
          { kind: "p", text: "Events are named one-time happenings at your venue: concerts, DJ nights, watch parties, themed nights. In the app they show as green. A night titled something Cover can still be an event." },
          { kind: "ul", items: [
            "Sell tickets for paid events, or run a free event. Guests still get a real, scannable ticket",
            "Customers buy tickets right from their phone in the Bizzy app",
            "Staff check people in with the in-app scanner or a 6-digit door code",
          ] },
          { kind: "note", text: "Regular weekly Cover nights are Weekly Cover, not events. Create those from Events → Create → the pink Weekly Cover tile. See Weekly Cover." },
        ],
      },
      {
        id: "creating-event",
        title: "Creating an event",
        blocks: [
          { kind: "ol", items: [
            "Go to Events (or Home) and click Create, then pick the green Event tile",
            "Add a catchy name and a clear description",
            "Set the date, time, and location (pre-filled from your venue)",
            "Upload an eye-catching flyer image",
            "Toggle 21+ if needed, and pick the venue",
            "Add your ticket types",
          ] },
        ],
      },
      {
        id: "setting-up-tickets",
        title: "Setting up tickets",
        blocks: [
          { kind: "p", text: "You can have multiple ticket types for one event (e.g. General Admission $10, VIP $25). For each type set:" },
          { kind: "ul", items: [
            "Name: e.g. General Admission, VIP, Early Bird",
            "Price: set to $0 for free tickets",
            "Quantity: leave blank for no limit",
            "Max per person: the most one person can buy at once",
          ] },
          { kind: "note", text: "A small service fee is added on top of your ticket price and paid by the customer. You receive the full amount you set." },
        ],
      },
      {
        id: "managing-event",
        title: "Managing your event",
        blocks: [
          { kind: "p", text: "Open any event and click \"Manage\" to:" },
          { kind: "ul", items: [
            "View analytics: tickets sold, revenue, and check-ins",
            "View check-ins: who's arrived and who hasn't",
            "Manage promo codes and the event team",
            "View promoters and how their referrals are performing",
            "Duplicate the event, or cancel it",
          ] },
        ],
      },
      {
        id: "promo-codes",
        title: "Promo codes",
        blocks: [
          { kind: "p", text: "Promo codes offer discounts on tickets, great for promoters, VIPs, or early supporters." },
          { kind: "ol", items: [
            "Go to your event → Manage → Promo codes → \"Create promo code\"",
            "Set the code name customers type at checkout (e.g. FRIENDS50)",
            "Choose percentage-off or fixed-amount-off",
            "Set the max number of uses",
          ] },
          { kind: "p", text: "The service fee is calculated on the discounted price, not the original." },
        ],
      },
      {
        id: "scanning-tickets",
        title: "Event day: scanning tickets",
        blocks: [
          { kind: "ol", items: [
            "Go to Scanner in the sidebar (or use the Bizzy app)",
            "Point the camera at the customer's QR-code ticket",
            "Green = valid ticket, let them in. Red = already used or invalid, don't let them in",
          ] },
          { kind: "note", text: "Assign team members as Staff so they can scan tickets too, see the Team section." },
        ],
      },
      {
        id: "promoters",
        title: "Promoters",
        blocks: [
          { kind: "p", text: "Promoters sign up to promote your event and earn commission on every ticket they sell. They get a personal share link, and you can see exactly who's driving sales." },
          { kind: "ol", items: [
            "When creating or editing an event, enable the Promoter Program and set commission terms",
            "Users tap \"Get paid to promote\" in the app, verify their phone, and link Stripe",
            "Each promoter gets a personalized share link",
            "Visit Manage → Promoters to see clicks, sales, and commission earned",
          ] },
          { kind: "p", text: `Commissions accrue to the promoter's in-app wallet. They become available ${PROMOTER_COMMISSION_AVAILABLE_AFTER_COPY}. ${PROMOTER_WITHDRAW_HELP_AFTER_HOLD}` },
        ],
      },
    ],
  },
  {
    id: "weekly-cover",
    title: "Weekly Cover",
    icon: DoorOpen,
    intro: "Weekly Cover is a series of regular nights, not a named event. Guests buy Cover for one date. Pink in the app. Don't call it door access.",
    subsections: [
      {
        id: "what-is-weekly-cover",
        title: "What Weekly Cover is",
        blocks: [
          { kind: "p", text: "You set up one series: which weekdays it runs, door times, and Cover and/or Skip the Line prices. Bizzy generates each upcoming night. Customers buy that night only." },
          { kind: "ul", items: [
            "It is not a named Event, a subscription, or a membership",
            "A custom night (a date you edited) is still Weekly Cover. Editing the program still updates that night. Custom is not a forever fork and not a green event",
            "Don't guess from a title that ends in Cover. A show named Weekly Cover Launch Party can be a normal event",
          ] },
        ],
      },
      {
        id: "creating-weekly-cover",
        title: "Creating Weekly Cover",
        blocks: [
          { kind: "ol", items: [
            "Go to Events or Home and click Create",
            "Pick the pink Weekly Cover tile (not An event)",
            "Choose Weekly Cover, Skip the Line, or both",
            "Pick the nights of the week, then set doors and prices",
          ] },
          { kind: "note", text: "Stripe must be connected before paid nights can sell. There is no Weekly Cover item in the sidebar. Open a series from the Events list (Weekly Cover filter) or Home. Pink rows open the program." },
        ],
      },
      {
        id: "weekly-cover-door",
        title: "At the door",
        blocks: [
          { kind: "p", text: "Guests scan Cover with any phone camera and tap Check In. No staff login. Use the redemption list to check names off." },
          { kind: "note", text: "The in-app scanner and 6-digit door codes stay for named events. Don't send Weekly Cover there, and don't tell anyone door codes went away for events." },
        ],
      },
    ],
    faqs: [
      { q: "Is a custom night its own event now?", a: "No. A custom night is still Weekly Cover. Editing the program still restamps that night. If you want a one-off named show, create a separate Event from the green tile." },
      { q: "A student bought Skip the Line. Is that a line skip?", a: "Not always. It might be a Weekly Cover option for that night, a named-event ticket tier, or the standalone line-skip product. Check what they have in Wallet before you answer." },
    ],
  },
  {
    id: "tap-to-pay",
    title: "Tap-to-Pay / door sales",
    icon: CreditCard,
    intro: "Sell tickets at the door using your phone as a card reader.",
    subsections: [
      {
        id: "what-is-tap-to-pay",
        title: "What is Tap-to-Pay?",
        blocks: [
          { kind: "p", text: "Tap-to-Pay lets you sell tickets at the door. Customers tap their card or phone (like Apple Pay) on your phone, and they're in. Perfect for walk-up customers." },
        ],
      },
      {
        id: "setting-up-tap-to-pay",
        title: "Setting up and selling",
        blocks: [
          { kind: "p", text: "Your Stripe account must be connected first (see Getting started → Connecting Stripe). No extra hardware needed." },
          { kind: "ol", items: [
            "Open the Bizzy app and go to \"Accept payments\" (or the event's \"Sell at door\")",
            "Customers tap their card or phone on your phone to pay",
          ] },
          { kind: "p", text: "You can sell by selecting a preset ticket type, or by entering a custom amount on the numpad. Both record the sale in analytics automatically." },
        ],
      },
    ],
  },
  {
    id: "line-skips",
    title: "Line skips",
    icon: Zap,
    intro: "Line skips let customers pay to skip the line and get guaranteed entry.",
    subsections: [
      {
        id: "what-are-line-skips",
        title: "What are line skips?",
        blocks: [
          { kind: "p", text: "Customers buy a line skip in advance, show a QR code at the door, and go straight to the front of the line. This is the standalone line-skip product, not a Weekly Cover tier also named Skip the Line." },
          { kind: "note", text: "A line skip is guaranteed entry, and the price includes cover. The customer doesn't pay again at the door. All Bizzy line skips include cover." },
        ],
      },
      {
        id: "creating-line-skip",
        title: "Creating a line skip schedule",
        blocks: [
          { kind: "ol", items: [
            "Go to Line skips in the sidebar and click \"Create line skip\"",
            "Set the name, description, days of the week, and start date",
            "Set doors open/close times, price, and quantity per night",
          ] },
          { kind: "note", text: "Line skips run on a rolling schedule. The system creates upcoming nights 2 weeks ahead automatically. You don't create each night manually." },
        ],
      },
      {
        id: "managing-line-skip-nights",
        title: "Managing nights",
        blocks: [
          { kind: "p", text: "Open a line skip schedule to see all upcoming and past nights. For each night you can edit the price, quantity, or times, or cancel the night." },
        ],
      },
      {
        id: "scanning-line-skips",
        title: "Scanning line skips",
        blocks: [
          { kind: "note", text: "Line skips do NOT use the in-app scanner. Use your phone's regular camera app instead." },
          { kind: "ol", items: [
            "Open your phone's camera app (not the Bizzy app)",
            "Point it at the customer's QR code",
            "Tap the link that pops up, it shows whether the line skip is valid",
          ] },
        ],
      },
    ],
  },
  {
    id: "deals",
    title: "Deals",
    icon: Tag,
    intro: "Deals are free-to-create special offers that drive foot traffic to your venue.",
    subsections: [
      {
        id: "what-are-deals",
        title: "What are deals?",
        blocks: [
          { kind: "p", text: "Deals are special offers, discounts, freebies, BOGO offers, that customers claim in the app to use at your venue." },
          { kind: "ul", items: [
            "Customers see and claim deals in the Bizzy app",
            "Deals are completely free to create, no fees",
            "Think of them as free advertising that drives foot traffic",
          ] },
        ],
      },
      {
        id: "creating-deal",
        title: "Creating a deal",
        blocks: [
          { kind: "ol", items: [
            "Go to Deals in the sidebar and click \"Create deal\"",
            "Add a short, specific title and a clear description",
            "Pick a category and a claim frequency (daily, weekly, monthly, or anytime)",
            "Set estimated savings, a start date, and an eye-catching image",
            "Choose the venue",
          ] },
        ],
      },
      {
        id: "deal-tips",
        title: "Deal tips",
        blocks: [
          { kind: "ul", items: [
            "Deals with photos get significantly more claims",
            "Keep titles short and specific (\"$5 margs\" beats \"Special drink promotion\")",
            "Update deals regularly to keep your page fresh",
            "Seasonal and limited-time offers create urgency",
          ] },
        ],
      },
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: BarChart3,
    intro: ANALYTICS_HELP_INTRO,
    subsections: [
      {
        id: "understanding-analytics",
        title: "Understanding your analytics",
        blocks: [
          { kind: "p", text: ANALYTICS_HELP_TABS },
        ],
      },
      {
        id: "event-analytics",
        title: "Event analytics",
        blocks: [
          { kind: "p", text: "At a glance you'll see total events, total tickets sold (online + door), total revenue, and your check-in rate." },
          { kind: "p", text: "Click any event for revenue by ticket type, pre-sale vs. door split, and the full check-in list." },
        ],
      },
      {
        id: "what-numbers-mean",
        title: "What the numbers mean",
        blocks: [
          { kind: "ul", items: [
            "Revenue shown is your revenue: the amount you receive",
            "Pre-sale = tickets bought online before the event",
            "Door sale = tickets sold at the door via Tap-to-Pay",
            "Check-in rate = the percentage of ticket holders who got scanned in",
          ] },
        ],
      },
    ],
  },
  {
    id: "team",
    title: "Team management",
    icon: Users,
    intro: "Invite managers, staff, and promoters to help run your dashboard.",
    subsections: [
      {
        id: "what-is-team",
        title: "Two kinds of teams",
        blocks: [
          { kind: "p", text: "There are two different teams on Bizzy:" },
          { kind: "ul", items: [
            "Business team: people who work for your business ongoing (managers, staff, promoters). Set up from the Team page. They get dashboard access.",
            "Event team (co-hosts): people helping with one specific event only. Set up inside that event. They do NOT get full dashboard access.",
          ] },
        ],
      },
      {
        id: "roles-explained",
        title: "Business team roles",
        blocks: [
          { kind: "ul", items: [
            "Owner: full access to everything, including settings and billing",
            "Manager: create and manage events, deals, and line skips; view analytics; no business settings",
            "Staff: scan tickets, sell via Tap-to-Pay, view basic event info",
            "Promoter: view their share link and promotion performance",
          ] },
        ],
      },
      {
        id: "global-vs-venue",
        title: "Global vs. venue-specific",
        blocks: [
          { kind: "ul", items: [
            "Global: the member works across all your venues",
            "Venue-specific: the member only sees one venue",
          ] },
          { kind: "p", text: "If you have one venue, everyone sees the same thing." },
        ],
      },
      {
        id: "inviting-team",
        title: "Inviting members",
        blocks: [
          { kind: "ol", items: [
            "Go to Team in the sidebar and click \"Invite member\"",
            "Enter their email address",
            "Pick their role and venue assignment",
          ] },
          { kind: "p", text: "They'll get an email invitation. Once accepted, they have ongoing access based on their role. Only owners can manage business team members." },
        ],
      },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    intro: "Manage your venues, Stripe connection, and business profile.",
    subsections: [
      {
        id: "business-profile",
        title: "Business profile",
        blocks: [
          { kind: "ul", items: [
            "Update your business name, phone, and address",
            "Upload your business logo (shows in the app)",
            "Your email can't be changed here, contact support@bizzyu.com",
          ] },
        ],
      },
      {
        id: "stripe-settings",
        title: "Stripe Connect",
        blocks: [
          { kind: "ul", items: [
            "View your Stripe connection status",
            "Reconnect if Stripe needs more information",
            "Stay connected while you have active paid events or line skips",
          ] },
        ],
      },
      {
        id: "security-settings",
        title: "Security",
        blocks: [
          { kind: "p", text: "Reset your password from Settings → Security. Use a strong, unique password you don't use elsewhere." },
        ],
      },
    ],
  },
  {
    id: "cancellations",
    title: "Cancellations & refunds",
    icon: RotateCcw,
    intro: "What happens when you cancel, and how refunds work.",
    subsections: [
      {
        id: "refund-policy",
        title: "Our refund policy",
        blocks: [
          { kind: "ul", items: [
            "All sales are final, customers can't request individual refunds",
            "Refunds only happen when you cancel an event, a Weekly Cover night, or a line skip night",
            "If you cancel, every buyer gets a full refund automatically",
          ] },
        ],
      },
      {
        id: "cancelling-event",
        title: "Cancelling an event",
        blocks: [
          { kind: "ol", items: [
            "Go to the event → Manage → \"Cancel event\"",
            "Provide a reason for the cancellation",
            "If paid tickets were sold, the request goes to the Bizzy admin team for approval",
            "If there are no paid tickets, it cancels immediately",
          ] },
          { kind: "note", text: "You can't cancel an event that has already ended." },
        ],
      },
      {
        id: "what-happens-cancel",
        title: "What happens when you cancel",
        blocks: [
          { kind: "p", text: "When an event is cancelled, you reimburse every customer for the full amount they paid (ticket price plus fees) automatically through Stripe." },
          { kind: "ul", items: [
            "Every ticket holder receives a full refund",
            "The money is pulled back from your Stripe account",
            "Stripe may charge additional processing fees for the reversal",
          ] },
          { kind: "note", text: "Cancelling an event costs you money, be certain before you cancel." },
        ],
      },
      {
        id: "repeated-cancellations",
        title: "Repeated cancellations",
        blocks: [
          { kind: "p", text: "Cancelling occasionally is fine, but frequent cancellations trigger review:" },
          { kind: "ul", items: [
            "2nd cancellation in 90 days: a warning",
            "3rd in 90 days: your account is flagged for review",
            "4th or more: your account may be suspended",
          ] },
        ],
      },
    ],
  },
  {
    id: "customer-app",
    title: "The Bizzy app (customer side)",
    icon: Smartphone,
    intro: "Understanding what your customers see in the Bizzy app.",
    subsections: [
      {
        id: "how-customers-find-you",
        title: "How customers find you",
        blocks: [
          { kind: "ul", items: [
            "Your named events appear in the Events tab as green rows, sorted by date",
            "Your Weekly Cover nights appear in the Events tab and Happening Tonight as pink Weekly Cover, not as green events",
            "Your deals appear in the Deals tab",
            "Events → Venues lists venues that have upcoming named events or Weekly Cover, not places that only have deals",
          ] },
          { kind: "p", text: "Customers browse by campus, so your content is shown to students at the nearest university." },
        ],
      },
      {
        id: "how-customers-buy",
        title: "How customers buy and claim",
        blocks: [
          { kind: "p", text: "To buy a ticket, customers find your event, pick a ticket type and quantity, pay, and receive a QR-code ticket in their app wallet to show at the door." },
          { kind: "p", text: "To claim a deal, they tap \"Claim\" and show it to your staff. The app enforces the frequency you set (daily, weekly, monthly, or anytime)." },
        ],
      },
    ],
  },
  {
    id: "faq",
    title: "Frequently asked questions",
    icon: HelpCircle,
    intro: "Quick answers to the most common questions.",
    subsections: [],
    faqs: [
      { q: "When do I get paid?", a: "Money from ticket sales and line skips is transferred to your bank account through Stripe, typically within 2-3 business days after the transaction." },
      { q: "What fees does Bizzy charge?", a: "A small service fee is added on top of your price and paid by the customer. You receive the full amount you set. The fee comes out of the customer's total, not your pocket." },
      { q: "How do I see how much money I've made?", a: ANALYTICS_HELP_REVENUE_FAQ },
      { q: "Can I change the ticket price after people have bought tickets?", a: "Yes, you can change the price for future purchases. Existing ticket holders keep their original price." },
      { q: "What if my event sells out?", a: "A \"Sold out\" badge appears and no more tickets can be purchased. To sell more, increase the ticket quantity." },
      { q: "Do deals cost me anything?", a: "No. Creating and running deals on Bizzy is completely free. Deals drive foot traffic to your venue at no cost." },
      { q: "What does \"includes cover\" mean?", a: "On a standalone line skip, the price includes the cover charge. The customer pays once and doesn't pay again at the door. All Bizzy line skips include cover. Weekly Cover is a different product: guests buy Cover (or a Skip the Line option on that night)." },
      { q: "What's the difference between Weekly Cover and an event?", a: "Weekly Cover is a series of regular nights. Guests buy Cover for one date. It shows pink. A named event is a titled show or night (green) with in-app scanning and a 6-digit door code. Don't guess from a title that ends in Cover." },
      { q: "I can't log in. What do I do?", a: "Click \"Forgot password\" on the login page to reset it. If that doesn't work, email support@bizzyu.com." },
      { q: "The dashboard looks broken or won't load.", a: "Refresh the page first. If that doesn't help, clear your browser cache or try a different browser. Still stuck? Email support@bizzyu.com." },
      { q: "I need help with something not covered here.", a: "Email support@bizzyu.com or reach out to your Bizzy campus representative." },
    ],
  },
  {
    id: "contact",
    title: "Contact & support",
    icon: Mail,
    intro: "How to reach us when you need help.",
    subsections: [
      {
        id: "contact-info",
        title: "How to contact us",
        blocks: [
          { kind: "ul", items: [
            "Email: support@bizzyu.com",
            "For urgent issues on event night: contact your Bizzy campus representative directly",
            "Response time: within 24 hours on business days",
          ] },
          { kind: "p", text: "When emailing, include your business name, a description of the issue, and any screenshots that help." },
        ],
      },
    ],
  },
]
