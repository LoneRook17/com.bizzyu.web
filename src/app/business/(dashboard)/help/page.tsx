"use client"

import { useState, useMemo, useRef, useEffect } from "react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FAQ {
  q: string
  a: string
}

interface SubSection {
  id: string
  title: string
  content: string          // rendered as HTML-like JSX via dangerouslySetInnerHTML
}

interface Section {
  id: string
  title: string
  icon: React.ReactNode
  intro: string
  subsections: SubSection[]
  faqs?: FAQ[]
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400">
      <div>
        <svg className="mx-auto mb-2 h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
        </svg>
        {label}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section Data                                                       */
/* ------------------------------------------------------------------ */

const SECTIONS: Section[] = [
  /* ---- 1. Getting Started ---- */
  {
    id: "getting-started",
    title: "Getting Started",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
    intro: "Everything you need to know to get up and running on Bizzy.",
    subsections: [
      {
        id: "welcome",
        title: "1.1 Welcome to Bizzy for Business",
        content: `
          <p><strong>Bizzy</strong> is a platform that helps bars, clubs, restaurants, and venues sell tickets, offer deals, and manage line skips to college students.</p>
          <p>Think of it as your all-in-one tool for reaching students on campus and making it easy for them to find your events, claim your deals, and skip the line at your venue.</p>
          <p><strong>What can you do from this dashboard?</strong></p>
          <ul>
            <li><strong>Events</strong> &mdash; Create events, sell tickets, and track who shows up</li>
            <li><strong>Line Skips</strong> &mdash; Let customers pay to skip the line on your busiest nights</li>
            <li><strong>Deals</strong> &mdash; Post special offers that drive foot traffic to your venue</li>
            <li><strong>Analytics</strong> &mdash; See how many tickets you&rsquo;ve sold, how much money you&rsquo;ve made, and which deals are performing best</li>
            <li><strong>Team</strong> &mdash; Invite your staff, managers, and promoters to help run things</li>
            <li><strong>Settings</strong> &mdash; Manage your venues, connect your bank account through Stripe, and update your business info</li>
            <li><strong>Scanner</strong> &mdash; Scan QR code tickets and line skips at the door</li>
          </ul>
          <p>All of these are accessible from the sidebar on the left side of your screen (or the menu icon at the top on mobile).</p>
        `,
      },
      {
        id: "your-account",
        title: "1.2 Your Account",
        content: `
          <p><strong>Logging in:</strong></p>
          <ol>
            <li>Go to the Bizzy business login page</li>
            <li>Enter the email address and password you used when you signed up</li>
            <li>Click &ldquo;Log In&rdquo;</li>
          </ol>
          <p><strong>Resetting your password:</strong></p>
          <ol>
            <li>On the login page, click &ldquo;Forgot Password&rdquo;</li>
            <li>Enter your email address</li>
            <li>Check your email for a reset link (check your spam folder if you don&rsquo;t see it within a few minutes)</li>
            <li>Click the link and create a new password</li>
          </ol>
          <p><strong>Locked out?</strong> If &ldquo;Forgot Password&rdquo; doesn&rsquo;t work or you&rsquo;re not receiving the email, contact us at <strong>support@bizzyu.com</strong> and we&rsquo;ll help you get back in.</p>
        `,
      },
      {
        id: "account-approval",
        title: "1.3 Account Approval",
        content: `
          <p>After you sign up, your account goes through a quick review process. Here&rsquo;s what to expect:</p>
          <ol>
            <li><strong>You sign up</strong> &mdash; fill in your business details and create your account</li>
            <li><strong>We review it</strong> &mdash; the Bizzy team checks your information to make sure everything looks good</li>
            <li><strong>You get approved</strong> &mdash; once approved, you&rsquo;ll have full access to create events, deals, and line skips</li>
          </ol>
          <p>Approval usually takes <strong>1&ndash;2 business days</strong>. While you wait, you can still log in, look around the dashboard, and set up your venue &mdash; you just can&rsquo;t create events or deals until you&rsquo;re approved.</p>
          <p>Haven&rsquo;t heard back after 2 business days? Email <strong>support@bizzyu.com</strong> and we&rsquo;ll check on your application.</p>
        `,
      },
      {
        id: "connecting-stripe",
        title: "1.4 Connecting Stripe (Getting Paid)",
        content: `
          <p><strong>Stripe</strong> is the payment service that handles all the money. When a customer buys a ticket or line skip, Stripe collects the payment and sends your share directly to your bank account. You don&rsquo;t need to understand how Stripe works behind the scenes &mdash; just follow these steps to connect it.</p>
          <p><strong>Why do I need Stripe?</strong> Without Stripe, you can&rsquo;t receive money from ticket sales or line skips. You <strong>must</strong> connect Stripe before you can create any paid events or line skips.</p>
          <p><strong>How to connect Stripe:</strong></p>
          <ol>
            <li>Go to <strong>Settings</strong> in the sidebar</li>
            <li>Find the &ldquo;Stripe Connect&rdquo; section</li>
            <li>Click <strong>&ldquo;Connect Stripe&rdquo;</strong></li>
            <li>You&rsquo;ll be taken to Stripe&rsquo;s website. Follow their step-by-step wizard. They&rsquo;ll ask for:
              <ul>
                <li>Your business name and type</li>
                <li>Your bank account details (routing number and account number &mdash; this is where your money goes)</li>
                <li>A photo of your ID for verification (this is a legal requirement for all payment platforms)</li>
                <li>Your business address and tax ID (if applicable)</li>
              </ul>
            </li>
            <li>Once you finish the Stripe setup, you&rsquo;ll be brought back to the Bizzy dashboard</li>
          </ol>
          <p><strong>How long until I get paid?</strong> After each ticket sale or line skip purchase, the money typically arrives in your bank account within <strong>2&ndash;3 business days</strong>.</p>
        `,
      },
      {
        id: "bizzy-app",
        title: "1.5 Using the Bizzy App on Your Phone",
        content: `
          <p>In addition to this dashboard (which you use on a computer or phone browser), you can also manage things from the <strong>Bizzy app</strong> on your phone. The app lets you scan tickets, sell at the door with Tap-to-Pay, and more &mdash; all from your pocket.</p>
          <p><strong>How to get set up:</strong></p>
          <ol>
            <li><strong>Download the Bizzy app</strong> from the App Store (iPhone) or Google Play (Android)</li>
            <li><strong>Create an account</strong> using your phone number (the app will send you a verification code to confirm it)</li>
            <li>Once you&rsquo;re in, your phone number links your app account to your business account so everything is synced up</li>
          </ol>
          <p>Once your phone number is linked, you&rsquo;ll be able to do everything from the app too &mdash; scan tickets at events, sell tickets at the door, and manage your events on the go.</p>
        `,
      },
    ],
  },

  /* ---- 2. Venues ---- */
  {
    id: "venues",
    title: "Venues",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    intro: "Venues are the physical locations where your events happen. Here's everything about setting them up.",
    subsections: [
      {
        id: "what-is-venue",
        title: "2.1 What is a Venue?",
        content: `
          <p>A <strong>venue</strong> is simply a physical location &mdash; your bar, club, restaurant, or any place where you host events or offer deals.</p>
          <p>Here&rsquo;s what you need to know:</p>
          <ul>
            <li>Your business can have <strong>multiple venues</strong> (for example, if you own two bar locations)</li>
            <li>Every event, deal, and line skip you create is attached to a specific venue</li>
            <li>Each venue has its own page in the Bizzy app where customers can see your upcoming events, deals, and line skips</li>
          </ul>
          <p><strong>The venue switcher:</strong> At the top of the sidebar, you&rsquo;ll see a dropdown menu. This lets you switch between your venues. When you select a venue, everything in the dashboard (events, deals, analytics) filters to show only that venue&rsquo;s data. Select &ldquo;All Venues&rdquo; to see everything at once.</p>
        `,
      },
      {
        id: "first-venue",
        title: "2.2 Setting Up Your First Venue",
        content: `
          <p>When you first log in after getting approved, you&rsquo;ll be asked to create your first venue. Here&rsquo;s what to fill in:</p>
          <ol>
            <li><strong>Venue name</strong> &mdash; the name of your bar, club, or restaurant</li>
            <li><strong>Address</strong> &mdash; the street address (this is how customers find you)</li>
            <li><strong>Description</strong> &mdash; a short description of your venue (what kind of place it is, the vibe, what you&rsquo;re known for)</li>
            <li><strong>Photo</strong> &mdash; upload a photo of your venue (this shows in the app, so make it a good one!)</li>
            <li><strong>Website &amp; Instagram</strong> (optional) &mdash; add links so customers can find you online</li>
          </ol>
          <p>That&rsquo;s it! Once your venue is created, you can start creating events, deals, and line skips.</p>
        `,
      },
      {
        id: "adding-venues",
        title: "2.3 Adding More Venues",
        content: `
          <p>If you have more than one location, you can add additional venues:</p>
          <ol>
            <li>Click the venue dropdown at the top of the sidebar</li>
            <li>Click <strong>&ldquo;Add Venue&rdquo;</strong> at the bottom of the dropdown</li>
            <li>Fill in the same information (name, address, description, photo)</li>
            <li>Your new venue will appear in the dropdown</li>
          </ol>
          <p>Each venue operates independently &mdash; it has its own events, deals, line skips, and analytics.</p>
        `,
      },
      {
        id: "editing-venue",
        title: "2.4 Editing a Venue",
        content: `
          <ol>
            <li>Go to <strong>Settings</strong> in the sidebar</li>
            <li>Find <strong>&ldquo;Your Venues&rdquo;</strong></li>
            <li>Click the pencil icon next to the venue you want to edit</li>
            <li>Update whatever you need (name, address, description, photo, website, Instagram)</li>
            <li>Save your changes</li>
          </ol>
          <p>Changes show up in the Bizzy app right away.</p>
        `,
      },
      {
        id: "switching-venues",
        title: "2.5 Switching Between Venues",
        content: `
          <ul>
            <li>Use the <strong>dropdown at the top of the sidebar</strong> to switch between venues</li>
            <li>Select <strong>&ldquo;All Venues&rdquo;</strong> to see everything across all your locations</li>
            <li>Select a <strong>specific venue</strong> to filter everything to just that location</li>
            <li>When you create something new (event, deal, line skip), it&rsquo;s created for whichever venue you currently have selected</li>
          </ul>
        `,
      },
    ],
  },

  /* ---- 3. Events ---- */
  {
    id: "events",
    title: "Events",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    intro: "Events are the heart of Bizzy. Create events, sell tickets, and manage everything on event day.",
    subsections: [
      {
        id: "what-are-events",
        title: "3.1 What are Events?",
        content: `
          <p>Events are one-time happenings at your venue &mdash; concerts, DJ nights, watch parties, themed nights, you name it.</p>
          <ul>
            <li>You can sell tickets for paid events or allow free RSVPs (where people just sign up to attend)</li>
            <li>Customers find your events in the Bizzy app and can purchase tickets right from their phone</li>
            <li>You get a QR code scanner to check people in at the door</li>
          </ul>
        `,
      },
      {
        id: "creating-event",
        title: "3.2 Creating an Event",
        content: `
          <ol>
            <li>Go to <strong>Events</strong> in the sidebar</li>
            <li>Click the green <strong>&ldquo;Create Event&rdquo;</strong> button in the top right</li>
            <li>Fill in the details:
              <ul>
                <li><strong>Event name</strong> &mdash; what customers will see (keep it catchy and clear, like &ldquo;Friday Night Vibes&rdquo; or &ldquo;March Madness Watch Party&rdquo;)</li>
                <li><strong>Description</strong> &mdash; tell people what to expect (music, dress code, drink specials, anything that makes them want to come)</li>
                <li><strong>Date and time</strong> &mdash; when the event starts and ends</li>
                <li><strong>Location</strong> &mdash; this fills in automatically from your venue, but you can change it if the event is at a different location</li>
                <li><strong>Flyer image</strong> &mdash; upload an eye-catching image. This is the first thing people see when they find your event in the app, so make it look good!</li>
                <li><strong>21+ toggle</strong> &mdash; turn this on if the event is only for people 21 and older</li>
                <li><strong>Venue</strong> &mdash; select which of your venues this event is at</li>
              </ul>
            </li>
            <li>Next, add your ticket types (see next section)</li>
          </ol>
        `,
      },
      {
        id: "setting-up-tickets",
        title: "3.3 Setting Up Tickets",
        content: `
          <p>You can have <strong>multiple ticket types</strong> for one event. For example: General Admission at $10 and VIP at $25.</p>
          <p>For each ticket type, you&rsquo;ll set:</p>
          <ul>
            <li><strong>Name</strong> &mdash; what to call this ticket (e.g., &ldquo;General Admission&rdquo;, &ldquo;VIP&rdquo;, &ldquo;Early Bird&rdquo;)</li>
            <li><strong>Price</strong> &mdash; how much you want to charge (set to $0 for free tickets)</li>
            <li><strong>Quantity</strong> &mdash; how many of this type you want to sell (leave blank if there&rsquo;s no limit)</li>
            <li><strong>Max per person</strong> &mdash; the most one person can buy at once</li>
          </ul>
          <p><strong>About the Bizzy service fee:</strong> A small service fee is added on top of your ticket price, and the <strong>customer</strong> pays it &mdash; not you. You receive the full amount you set for each ticket.</p>
        `,
      },
      {
        id: "managing-event",
        title: "3.4 Managing Your Event",
        content: `
          <p>Click on any event, then click <strong>&ldquo;Manage&rdquo;</strong> to see all your management options:</p>
          <ul>
            <li><strong>View analytics</strong> &mdash; see how many tickets you&rsquo;ve sold, how much revenue you&rsquo;ve earned, and how many people have checked in</li>
            <li><strong>View check-ins</strong> &mdash; see who has arrived and who hasn&rsquo;t shown up yet</li>
            <li><strong>Manage promo codes</strong> &mdash; create discount codes for your event (more details below)</li>
            <li><strong>Manage event team</strong> &mdash; add staff members who can scan tickets at the door</li>
            <li><strong>View tracking links</strong> &mdash; see which of your marketing links drove the most ticket sales</li>
            <li><strong>Duplicate event</strong> &mdash; quickly create a new event with the same details as this one (great for recurring nights)</li>
            <li><strong>Cancel event</strong> &mdash; cancel the event (see the Cancellations section below for what happens)</li>
          </ul>
        `,
      },
      {
        id: "editing-event",
        title: "3.5 Editing an Event",
        content: `
          <ol>
            <li>Click on any event</li>
            <li>Click <strong>&ldquo;Edit&rdquo;</strong></li>
            <li>Change whatever you need</li>
          </ol>
          <p><strong>One rule:</strong> You cannot change a paid event to a free event if tickets have already been sold. Everything else can be changed at any time.</p>
        `,
      },
      {
        id: "promo-codes",
        title: "3.6 Promo Codes",
        content: `
          <p>Promo codes let you offer discounts on tickets. They&rsquo;re great for promoters, VIPs, or early supporters.</p>
          <p><strong>How to create a promo code:</strong></p>
          <ol>
            <li>Go to your event &rarr; <strong>Manage</strong> &rarr; <strong>Promo Codes</strong></li>
            <li>Click <strong>&ldquo;Create Promo Code&rdquo;</strong></li>
            <li>Set the code name &mdash; this is what customers will type in at checkout (e.g., &ldquo;FRIENDS50&rdquo;)</li>
            <li>Choose the discount type:
              <ul>
                <li><strong>Percentage off</strong> &mdash; e.g., 50% off the ticket price</li>
                <li><strong>Fixed amount off</strong> &mdash; e.g., $5 off the ticket price</li>
              </ul>
            </li>
            <li>Set the <strong>max uses</strong> &mdash; how many times the code can be used in total</li>
          </ol>
          <p>Customers enter the code at checkout and the discount is applied automatically. The Bizzy service fee is calculated on the <strong>discounted</strong> price, not the original price.</p>
        `,
      },
      {
        id: "scanning-tickets",
        title: "3.7 Event Day \u2014 Scanning Tickets",
        content: `
          <p>On event day, you&rsquo;ll use the scanner to check people in at the door.</p>
          <ol>
            <li>Go to <strong>Scanner</strong> in the sidebar (or use the Bizzy app on your phone)</li>
            <li>Point the camera at the customer&rsquo;s QR code ticket (it&rsquo;s in the Bizzy app on their phone)</li>
            <li>The screen will show one of two results:
              <ul>
                <li><strong>Green = Valid ticket</strong> &mdash; let them in!</li>
                <li><strong>Red = Already used or invalid</strong> &mdash; don&rsquo;t let them in. This means the ticket was already scanned or isn&rsquo;t real.</li>
              </ul>
            </li>
          </ol>
          <p><strong>Tip:</strong> You can assign team members as &ldquo;Staff&rdquo; so they can scan tickets too. See the Team section for how to do that.</p>
        `,
      },
      {
        id: "tracking-links",
        title: "3.8 Tracking Links",
        content: `
          <p>Tracking links help you see which of your marketing efforts are actually driving ticket sales.</p>
          <p><strong>How to create a tracking link:</strong></p>
          <ol>
            <li>Go to your event &rarr; <strong>Manage</strong> &rarr; <strong>Tracking Links</strong></li>
            <li>Click <strong>&ldquo;Create Link&rdquo;</strong></li>
            <li>Give it a descriptive name (e.g., &ldquo;Instagram Story&rdquo;, &ldquo;Flyer QR Code&rdquo;, &ldquo;Email Blast&rdquo;)</li>
            <li>Copy the generated link and share it wherever you promote the event</li>
          </ol>
          <p>Come back to the tracking links page to see how many clicks and ticket purchases each link generated. This tells you exactly which marketing channels are working best.</p>
        `,
      },
    ],
  },

  /* ---- 4. Tap-to-Pay / Door Sales ---- */
  {
    id: "tap-to-pay",
    title: "Tap-to-Pay / Door Sales",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    intro: "Sell tickets at the door using a card reader. Perfect for walk-up customers.",
    subsections: [
      {
        id: "what-is-tap-to-pay",
        title: "4.1 What is Tap-to-Pay?",
        content: `
          <p>Tap-to-Pay lets you sell tickets right at the door using a card reader connected to your phone. Customers simply tap their credit card, debit card, or phone (like Apple Pay) on the reader, and they&rsquo;re in.</p>
          <p>This is perfect for <strong>walk-up customers</strong> &mdash; people who show up on event night without having bought a ticket online in advance.</p>
        `,
      },
      {
        id: "setting-up-tap-to-pay",
        title: "4.2 Setting Up Tap-to-Pay",
        content: `
          <p>Before you can use Tap-to-Pay, your <strong>Stripe account must be connected</strong> (see &ldquo;Getting Started &rarr; Connecting Stripe&rdquo; above). No extra hardware needed &mdash; you do it all from your phone.</p>
          <p><strong>To start selling at the door:</strong></p>
          <ol>
            <li>Open the <strong>Bizzy app</strong> on your phone</li>
            <li>Go to &ldquo;Accept Payments&rdquo; (or navigate to the event and tap &ldquo;Sell at Door&rdquo;)</li>
            <li>Customers tap their card or phone directly on your phone to pay</li>
          </ol>
        `,
      },
      {
        id: "two-ways-to-sell",
        title: "4.3 Two Ways to Sell at the Door",
        content: `
          <p>When selling at the door, you have two options:</p>
          <ul>
            <li><strong>Select a ticket type:</strong> Choose from your pre-set ticket tiers (e.g., GA $10, VIP $25). This is best when you have standard pricing that doesn&rsquo;t change.</li>
            <li><strong>Enter a custom amount (numpad):</strong> Type in any dollar amount you want. This is best for flexible pricing, cover charges that vary, or special situations.</li>
          </ul>
          <p>Both methods process the payment instantly and record the sale in your analytics automatically. The customer gets a receipt on their card statement.</p>
        `,
      },
    ],
  },

  /* ---- 5. Line Skips ---- */
  {
    id: "line-skips",
    title: "Line Skips",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    intro: "Line skips let customers pay to skip the line and get guaranteed entry.",
    subsections: [
      {
        id: "what-are-line-skips",
        title: "5.1 What are Line Skips?",
        content: `
          <p>Line skips let customers <strong>pay to skip the line</strong> at your venue. Here&rsquo;s how they work:</p>
          <ul>
            <li>Customers buy a line skip in advance through the Bizzy app</li>
            <li>When they arrive, they show a QR code (a square barcode that appears on their phone screen) at the door</li>
            <li>You scan it using your <strong>phone&rsquo;s camera app</strong>, and they go straight to the front of the line (see section 5.4 for details)</li>
          </ul>
          <p><strong>Important:</strong> A line skip means <strong>guaranteed entry</strong>. &ldquo;Includes Cover&rdquo; means the line skip price <em>includes</em> the cover charge &mdash; the customer doesn&rsquo;t pay again at the door. All line skips on Bizzy include cover.</p>
        `,
      },
      {
        id: "creating-line-skip",
        title: "5.2 Creating a Line Skip Schedule",
        content: `
          <ol>
            <li>Go to <strong>Line Skips</strong> in the sidebar</li>
            <li>Click the green <strong>&ldquo;Create Line Skip&rdquo;</strong> button</li>
            <li>Fill in the details:
              <ul>
                <li><strong>Name</strong> &mdash; e.g., &ldquo;Skip the Line at [Your Venue]&rdquo;</li>
                <li><strong>Description</strong> &mdash; what the customer gets (front of line, includes cover, etc.)</li>
                <li><strong>Days of the week</strong> &mdash; select which nights (e.g., Friday and Saturday)</li>
                <li><strong>Start date</strong> &mdash; when the schedule begins</li>
                <li><strong>Doors open and close times</strong></li>
                <li><strong>Price</strong> &mdash; how much the line skip costs</li>
                <li><strong>Quantity</strong> &mdash; how many line skips are available per night</li>
              </ul>
            </li>
          </ol>
          <p><strong>How it works behind the scenes:</strong> Line skips run on a <strong>rolling schedule</strong>. The system automatically creates upcoming nights 2 weeks in advance. As nights pass, new ones are added. You don&rsquo;t need to manually create each night &mdash; it&rsquo;s all automatic!</p>
        `,
      },
      {
        id: "managing-line-skip-nights",
        title: "5.3 Managing Line Skip Nights",
        content: `
          <p>Click on a line skip schedule to see all upcoming and past nights. For each night, you can:</p>
          <ul>
            <li><strong>Edit the price</strong> &mdash; maybe you want to charge more on a holiday weekend</li>
            <li><strong>Edit the quantity</strong> &mdash; add more line skips if demand is high</li>
            <li><strong>Edit the details</strong> &mdash; change the times for a special night</li>
            <li><strong>Cancel the night</strong> &mdash; if you&rsquo;re closed or something changes (see the Cancellations section below)</li>
          </ul>
        `,
      },
      {
        id: "scanning-line-skips",
        title: "5.4 Scanning Line Skips",
        content: `
          <p><strong>Line skips do NOT use the in-app scanner.</strong> Instead, use your phone&rsquo;s regular <strong>camera app</strong> to scan line skip QR codes. This is called the <strong>universal scanner</strong>.</p>
          <p><strong>How to do it:</strong></p>
          <ol>
            <li>Open your phone&rsquo;s <strong>camera app</strong> (the one that came with your phone &mdash; not the Bizzy app)</li>
            <li>Point it at the customer&rsquo;s QR code on their phone</li>
            <li>A link will pop up on your screen &mdash; tap it</li>
            <li>The link will show you whether the line skip is valid or not</li>
          </ol>
          <p><strong>Do not</strong> use the Bizzy in-app scanner or any scanning links for line skips. The camera app is the only way.</p>
        `,
      },
    ],
  },

  /* ---- 6. Deals ---- */
  {
    id: "deals",
    title: "Deals",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
    intro: "Deals are free-to-create special offers that drive foot traffic to your venue.",
    subsections: [
      {
        id: "what-are-deals",
        title: "6.1 What are Deals?",
        content: `
          <p>Deals are special offers you create for Bizzy users &mdash; discounts, freebies, buy-one-get-one offers, or anything else you want to promote.</p>
          <ul>
            <li>Customers see your deals in the Bizzy app and &ldquo;claim&rdquo; them to use at your venue</li>
            <li>Deals are <strong>completely free to create</strong> &mdash; there&rsquo;s no fee for posting deals</li>
            <li>They&rsquo;re designed to drive foot traffic to your venue &mdash; think of them as free advertising</li>
          </ul>
        `,
      },
      {
        id: "creating-deal",
        title: "6.2 Creating a Deal",
        content: `
          <ol>
            <li>Go to <strong>Deals</strong> in the sidebar</li>
            <li>Click the green <strong>&ldquo;Create Deal&rdquo;</strong> button</li>
            <li>Fill in the details:
              <ul>
                <li><strong>Title</strong> &mdash; keep it short and specific (e.g., &ldquo;Free Wings Wednesday&rdquo; or &ldquo;BOGO Martinis&rdquo;)</li>
                <li><strong>Description</strong> &mdash; the details about what they get and any conditions</li>
                <li><strong>Category</strong> &mdash; food, drinks, entertainment, etc.</li>
                <li><strong>Frequency</strong> &mdash; how often each customer can claim this deal:
                  <ul>
                    <li><strong>Daily</strong> &mdash; once per day</li>
                    <li><strong>Weekly</strong> &mdash; once per week</li>
                    <li><strong>Monthly</strong> &mdash; once per month</li>
                    <li><strong>Anytime</strong> &mdash; unlimited claims, no restrictions</li>
                  </ul>
                </li>
                <li><strong>Estimated savings</strong> &mdash; how much the customer saves (this shows on the deal card in the app)</li>
                <li><strong>Start date</strong> &mdash; when the deal goes live</li>
                <li><strong>Deal image</strong> &mdash; upload an appetizing or eye-catching image</li>
                <li><strong>Venue</strong> &mdash; which of your locations this deal is at</li>
              </ul>
            </li>
          </ol>
        `,
      },
      {
        id: "managing-deals",
        title: "6.3 Managing Deals",
        content: `
          <p>From the Deals page, you can:</p>
          <ul>
            <li><strong>View</strong> &mdash; see how many claims your deal has gotten</li>
            <li><strong>Edit</strong> &mdash; change any detail about the deal</li>
            <li><strong>Deactivate</strong> &mdash; temporarily hide the deal from the app (you can reactivate it later when you&rsquo;re ready)</li>
            <li><strong>Delete</strong> &mdash; permanently remove the deal</li>
          </ul>
        `,
      },
      {
        id: "deal-tips",
        title: "6.4 Deal Tips",
        content: `
          <ul>
            <li>Deals with <strong>photos</strong> get significantly more claims than deals without photos</li>
            <li>Keep titles <strong>short and specific</strong> (&ldquo;$5 Margs&rdquo; beats &ldquo;Special Drink Promotion&rdquo;)</li>
            <li><strong>Update deals regularly</strong> to keep your page fresh and encourage repeat visits</li>
            <li>Seasonal deals and limited-time offers create urgency and drive more foot traffic</li>
          </ul>
        `,
      },
    ],
  },

  /* ---- 7. Analytics ---- */
  {
    id: "analytics",
    title: "Analytics",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    intro: "Track your performance across events, deals, and line skips.",
    subsections: [
      {
        id: "understanding-analytics",
        title: "7.1 Understanding Your Analytics",
        content: `
          <p>The <strong>Analytics</strong> page (in the sidebar) shows you how your business is performing on Bizzy. You&rsquo;ll see three tabs: <strong>Events</strong>, <strong>Deals</strong>, and <strong>Line Skips</strong>.</p>
        `,
      },
      {
        id: "event-analytics",
        title: "7.2 Event Analytics",
        content: `
          <p>At a glance, you&rsquo;ll see:</p>
          <ul>
            <li><strong>Total events</strong> you&rsquo;ve hosted</li>
            <li><strong>Total tickets sold</strong> (online + door sales combined)</li>
            <li><strong>Total revenue</strong></li>
            <li><strong>Check-in rate</strong> &mdash; what percentage of ticket buyers actually showed up</li>
          </ul>
          <p>Click on any event to see detailed numbers:</p>
          <ul>
            <li>Revenue breakdown by ticket type (e.g., how much from GA vs. VIP)</li>
            <li>Pre-sale vs. door sale split</li>
            <li>Check-in list (who came, who didn&rsquo;t)</li>
          </ul>
        `,
      },
      {
        id: "deal-analytics",
        title: "7.3 Deal Analytics",
        content: `
          <ul>
            <li><strong>Active deals count</strong> &mdash; how many deals are currently live</li>
            <li><strong>Total claims</strong> across all your deals</li>
            <li><strong>Claims this week</strong></li>
            <li><strong>Per-deal breakdown</strong> &mdash; see which deals are performing best</li>
          </ul>
        `,
      },
      {
        id: "line-skip-analytics",
        title: "7.4 Line Skip Analytics",
        content: `
          <ul>
            <li><strong>Active schedules</strong></li>
            <li><strong>Tickets sold per week</strong></li>
            <li><strong>Revenue per week</strong></li>
            <li><strong>Per-night breakdown</strong></li>
          </ul>
        `,
      },
      {
        id: "what-numbers-mean",
        title: "7.5 What the Numbers Mean",
        content: `
          <p>A few important things about how numbers are displayed:</p>
          <ul>
            <li><strong>Revenue</strong> shown is <strong>your revenue</strong> &mdash; the amount you receive</li>
            <li><strong>&ldquo;Pre-sale&rdquo;</strong> means tickets bought online before the event</li>
            <li><strong>&ldquo;Door sale&rdquo;</strong> means tickets sold at the door via Tap-to-Pay</li>
            <li><strong>&ldquo;Check-in rate&rdquo;</strong> is the percentage of ticket holders who actually showed up and got their ticket scanned at the door</li>
          </ul>
        `,
      },
    ],
  },

  /* ---- 8. Team Management ---- */
  {
    id: "team",
    title: "Team Management",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    intro: "Invite managers, staff, and promoters to help run your Bizzy dashboard.",
    subsections: [
      {
        id: "what-is-team",
        title: "8.1 What is the Team Feature?",
        content: `
          <p>You can invite other people to help manage your Bizzy business dashboard. This is perfect for managers, bartenders, promoters, or business partners who need access.</p>
          <p>There are <strong>two different kinds of teams</strong> on Bizzy, and it&rsquo;s important to understand the difference:</p>
          <ul>
            <li><strong>Business Team</strong> &mdash; People who work for your business on an ongoing basis (your managers, regular staff, promoters). They have access to your dashboard and can help with day-to-day operations. This is set up from the <strong>Team</strong> page in the sidebar.</li>
            <li><strong>Event Team (Co-hosts)</strong> &mdash; People who are helping with <strong>one specific event only</strong>. Think of a guest DJ, a friend helping at the door for one night, or a promoter for a single event. They do NOT get access to your full dashboard. This is set up from inside the specific event.</li>
          </ul>
          <p>The sections below explain both in detail.</p>
        `,
      },
      {
        id: "roles-explained",
        title: "8.2 Business Team Roles",
        content: `
          <p>When you add someone to your <strong>business team</strong>, you assign them a role. Each role has different levels of access:</p>
          <ul>
            <li><strong>Owner</strong> &mdash; Full access to everything. Can manage the team, change settings, view all analytics. This is you (the person who created the business account).</li>
            <li><strong>Manager</strong> &mdash; Can create and manage events, deals, and line skips. Can view analytics. Cannot change business settings or manage the owner&rsquo;s account.</li>
            <li><strong>Staff</strong> &mdash; Can scan tickets at the door, sell tickets via Tap-to-Pay, and view basic event info. Cannot create events or change settings.</li>
            <li><strong>Promoter</strong> &mdash; Can view their own tracking links and see how their promotions are performing. Cannot manage events or view full analytics.</li>
          </ul>
        `,
      },
      {
        id: "global-vs-venue",
        title: "8.3 Global Team vs. Venue-Specific Team",
        content: `
          <p>If your business has <strong>multiple venues</strong> (e.g., two bar locations), you can control which venue each team member has access to:</p>
          <ul>
            <li><strong>Global</strong> &mdash; The team member can see and work across <strong>all</strong> of your venues. Choose this for people who help manage your entire business (like a general manager or business partner).</li>
            <li><strong>Venue-specific</strong> &mdash; The team member can only see and work with <strong>one specific venue</strong>. Choose this for people who only work at one location (like a bartender or door person at one bar).</li>
          </ul>
          <p>If you only have one venue, this distinction doesn&rsquo;t matter &mdash; everyone sees the same thing.</p>
        `,
      },
      {
        id: "inviting-team",
        title: "8.4 Inviting Business Team Members",
        content: `
          <ol>
            <li>Go to <strong>Team</strong> in the sidebar</li>
            <li>Click <strong>&ldquo;Invite Member&rdquo;</strong></li>
            <li>Enter their <strong>email address</strong> (they need a Bizzy account &mdash; if they don&rsquo;t have one yet, they&rsquo;ll get an invitation to create one)</li>
            <li>Select their <strong>role</strong> (Owner, Manager, Staff, or Promoter)</li>
            <li>Select which <strong>venue</strong> they belong to (or choose &ldquo;Global&rdquo; if they work across all your venues)</li>
          </ol>
          <p>They&rsquo;ll receive an email invitation to join your team. Once they accept, they&rsquo;ll have ongoing access to your dashboard based on their role.</p>
        `,
      },
      {
        id: "event-team",
        title: "8.5 Event Team (Co-hosts) \u2014 For One-Off Helpers",
        content: `
          <p>Sometimes you need someone to help with <strong>just one event</strong> &mdash; not your whole business. Maybe it&rsquo;s a guest DJ, a friend covering the door for one night, or a promoter you&rsquo;re trying out for a single event. That&rsquo;s what the <strong>Event Team</strong> is for.</p>
          <p><strong>Key differences from Business Team:</strong></p>
          <ul>
            <li>Event team members (co-hosts) are only attached to <strong>one specific event</strong></li>
            <li>They do <strong>NOT</strong> get access to your business dashboard, settings, analytics, or other events</li>
            <li>They can only scan tickets and help manage that one event</li>
            <li>Their access goes away after the event is over</li>
          </ul>
          <p><strong>How to add a co-host to an event:</strong></p>
          <ol>
            <li>Go to <strong>Events</strong> in the sidebar</li>
            <li>Click on the event you want to add someone to</li>
            <li>Click <strong>&ldquo;Manage&rdquo;</strong></li>
            <li>Go to <strong>&ldquo;Event Team&rdquo;</strong></li>
            <li>Add the person by entering their email address</li>
          </ol>
          <p><strong>When to use which:</strong></p>
          <ul>
            <li>Someone works for you regularly (every weekend, every event)? &rarr; Add them to your <strong>Business Team</strong></li>
            <li>Someone is helping with just one event and that&rsquo;s it? &rarr; Add them as an <strong>Event Team co-host</strong></li>
          </ul>
        `,
      },
      {
        id: "managing-team",
        title: "8.6 Managing Team Members",
        content: `
          <p><strong>Business Team:</strong></p>
          <ul>
            <li><strong>Change someone&rsquo;s role:</strong> Click the role badge next to their name and select a new role</li>
            <li><strong>Change their venue assignment:</strong> Click the venue next to their name</li>
            <li><strong>Remove someone:</strong> Click the remove button (X) next to their name</li>
          </ul>
          <p><strong>Event Team (Co-hosts):</strong></p>
          <ul>
            <li>Go to the specific event &rarr; <strong>Manage</strong> &rarr; <strong>Event Team</strong></li>
            <li>Remove a co-host by clicking the remove button next to their name</li>
          </ul>
          <p>Only <strong>Owners</strong> can manage business team members. Owners and Managers can manage event team co-hosts.</p>
        `,
      },
    ],
  },

  /* ---- 9. Settings ---- */
  {
    id: "settings",
    title: "Settings",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    intro: "Manage your venues, Stripe connection, and business profile.",
    subsections: [
      {
        id: "venue-settings",
        title: "9.1 Venue Settings",
        content: `
          <p>From Settings, you can add, edit, or remove venues. You must always have at least one venue. See the <strong>Venues</strong> section above for full details on managing venues.</p>
        `,
      },
      {
        id: "business-profile",
        title: "9.2 Business Profile",
        content: `
          <ul>
            <li>Update your <strong>business name</strong>, <strong>phone number</strong>, and <strong>address</strong></li>
            <li>Upload your <strong>business logo</strong> (this shows in the app next to your venue)</li>
            <li>Your <strong>email cannot be changed</strong> from the dashboard &mdash; if you need to change it, contact <strong>support@bizzyu.com</strong></li>
          </ul>
        `,
      },
      {
        id: "stripe-settings",
        title: "9.3 Stripe Connect",
        content: `
          <ul>
            <li>View your <strong>Stripe connection status</strong> (connected or not connected)</li>
            <li><strong>Reconnect</strong> if Stripe asks for additional information or if your connection was interrupted</li>
            <li>You must <strong>stay connected to Stripe</strong> while you have active paid events or line skips &mdash; otherwise you won&rsquo;t be able to receive payments</li>
          </ul>
        `,
      },
      {
        id: "security-settings",
        title: "9.4 Security",
        content: `
          <p>You can reset your password from <strong>Settings &rarr; Security</strong>. We recommend using a strong, unique password that you don&rsquo;t use on other websites.</p>
        `,
      },
    ],
  },

  /* ---- 10. Cancellations & Refunds ---- */
  {
    id: "cancellations",
    title: "Cancellations & Refunds",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
      </svg>
    ),
    intro: "What happens when you cancel an event or line skip night, and how refunds work.",
    subsections: [
      {
        id: "refund-policy",
        title: "10.1 Our Refund Policy",
        content: `
          <p>Here&rsquo;s the simple version:</p>
          <ul>
            <li><strong>All sales are final</strong> &mdash; customers cannot request individual refunds for tickets or line skips</li>
            <li>The <strong>only time refunds happen</strong> is if <strong>you</strong> (the business) cancel an event or line skip night</li>
            <li>If you cancel, every customer who purchased a ticket gets a <strong>full refund automatically</strong></li>
          </ul>
        `,
      },
      {
        id: "cancelling-event",
        title: "10.2 Cancelling an Event",
        content: `
          <ol>
            <li>Go to the event &rarr; <strong>Manage</strong> &rarr; <strong>&ldquo;Cancel Event&rdquo;</strong></li>
            <li>You&rsquo;ll need to provide a <strong>reason</strong> for the cancellation</li>
            <li>If the event has sold <strong>paid tickets</strong>, your cancellation request goes to the Bizzy admin team for approval (this is to protect your customers)</li>
            <li>If there are <strong>no paid tickets</strong> (free event or no sales yet), it cancels immediately</li>
          </ol>
          <p>You <strong>cannot cancel</strong> an event that has already ended.</p>
        `,
      },
      {
        id: "what-happens-cancel",
        title: "10.3 What Happens When You Cancel",
        content: `
          <p>When an event is cancelled, <strong>you (the business) are responsible for reimbursing every customer for the full amount they paid</strong> &mdash; that includes the ticket price and any fees. This happens automatically through Stripe.</p>
          <ul>
            <li>Every ticket holder receives a <strong>full refund</strong> of everything they paid</li>
            <li>The money is pulled back from your Stripe account automatically</li>
            <li>There may be additional processing fees from Stripe charged to your account as a result of the reversal</li>
          </ul>
          <p><strong>Bottom line:</strong> Cancelling an event costs you money. Make sure you&rsquo;re certain before you cancel.</p>
        `,
      },
      {
        id: "cancelling-line-skip",
        title: "10.4 Cancelling a Line Skip Night",
        content: `
          <p>Same process as events:</p>
          <ol>
            <li>Go to the line skip &rarr; find the night &rarr; <strong>&ldquo;Cancel&rdquo;</strong></li>
          </ol>
          <p><strong>Important:</strong> Customers who <strong>already used</strong> their line skip (already got in the venue) are <strong>not refunded</strong> &mdash; they received the service. Only customers who haven&rsquo;t used their line skip yet get a refund.</p>
        `,
      },
      {
        id: "repeated-cancellations",
        title: "10.5 Repeated Cancellations",
        content: `
          <p>Cancelling occasionally is completely fine &mdash; things happen. But if you cancel frequently, Bizzy may review your account:</p>
          <ul>
            <li><strong>2nd cancellation in 90 days:</strong> You&rsquo;ll receive a warning</li>
            <li><strong>3rd cancellation in 90 days:</strong> Your account is flagged for review</li>
            <li><strong>4th+:</strong> Your account may be suspended</li>
          </ul>
          <p>This policy exists to protect customers from businesses that repeatedly cancel events after tickets have been sold.</p>
        `,
      },
    ],
  },

  /* ---- 11. The Bizzy App (Customer Side) ---- */
  {
    id: "customer-app",
    title: "The Bizzy App (Customer Side)",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    intro: "Understanding what your customers see in the Bizzy app.",
    subsections: [
      {
        id: "how-customers-find-you",
        title: "11.1 How Customers Find You",
        content: `
          <p>Customers use the Bizzy app (on their iPhone or Android phone) to discover things to do on campus. Here&rsquo;s where your stuff shows up:</p>
          <ul>
            <li>Your <strong>events</strong> appear in the Events tab, sorted by date</li>
            <li>Your <strong>deals</strong> appear in the Deals tab</li>
            <li>Your <strong>venue</strong> appears in the Venues section if you have upcoming events or active line skips</li>
          </ul>
          <p>Customers browse by campus, so your content is shown to students at the university closest to your venue.</p>
        `,
      },
      {
        id: "how-customers-buy",
        title: "11.2 How Customers Buy Tickets",
        content: `
          <ol>
            <li>They find your event in the Bizzy app</li>
            <li>They tap on it &rarr; select a ticket type and quantity &rarr; pay with their credit or debit card</li>
            <li>They receive a <strong>QR code ticket</strong> (a square barcode that appears on their phone) in their Bizzy app wallet</li>
            <li>They show the QR code at the door for you to scan</li>
          </ol>
        `,
      },
      {
        id: "how-customers-claim-deals",
        title: "11.3 How Customers Claim Deals",
        content: `
          <ol>
            <li>They find your deal in the Bizzy app</li>
            <li>They tap <strong>&ldquo;Claim&rdquo;</strong></li>
            <li>They show it to your staff at the venue</li>
          </ol>
          <p>The app tracks how many times each person has claimed the deal and enforces the frequency you set (daily, weekly, monthly, or anytime).</p>
        `,
      },
      {
        id: "how-customers-buy-line-skips",
        title: "11.4 How Customers Buy Line Skips",
        content: `
          <ol>
            <li>They find your venue in the Bizzy app</li>
            <li>They find the line skip &rarr; select a night &rarr; pay</li>
            <li>They receive a QR code in the app</li>
            <li>They show it at the door, you scan it, and they skip the line</li>
          </ol>
        `,
      },
    ],
  },

  /* ---- 12. FAQ ---- */
  {
    id: "faq",
    title: "Frequently Asked Questions",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
    ),
    intro: "Quick answers to the most common questions.",
    subsections: [],
    faqs: [
      // Payments & Money
      { q: "When do I get paid?", a: "Money from ticket sales and line skips is transferred to your bank account through Stripe, typically within 2\u20133 business days after the transaction." },
      { q: "What fees does Bizzy charge?", a: "A small service fee is added on top of your price and paid by the customer. You receive the full amount you set \u2014 the fee comes out of the customer\u2019s total, not out of your pocket." },
      { q: "How do I see how much money I\u2019ve made?", a: "Go to Analytics in the sidebar. Your revenue is shown for events, line skips, and overall." },
      // Events
      { q: "Can I change the ticket price after people have bought tickets?", a: "Yes, you can change the price for future purchases. Existing ticket holders keep their original price \u2014 they won\u2019t be affected." },
      { q: "What if my event sells out?", a: "Once all tickets are sold, a \u201cSold Out\u201d badge appears and no more tickets can be purchased. If you want to sell more, just increase the ticket quantity." },
      // Deals
      { q: "Do deals cost me anything?", a: "No. Creating and running deals on Bizzy is completely free. There are no fees. Deals are designed to drive foot traffic to your venue at no cost to you." },
      { q: "Can I limit how many people claim my deal?", a: "The frequency setting (daily, weekly, monthly, anytime) controls how often each individual person can claim. There\u2019s no total cap on the number of unique people who can claim." },
      // Line Skips
      { q: "What does \u201cIncludes Cover\u201d mean?", a: "It means the line skip price includes the cover charge. The customer pays once for the line skip and doesn\u2019t pay again at the door. All line skips on Bizzy include cover." },
      { q: "Can I change the price for a specific night?", a: "Yes! Click on the line skip schedule, find the specific night, and click \u201cEdit Price.\u201d This is great for charging more on holidays or special event nights." },
      { q: "What happens if no one buys a line skip for a night?", a: "Nothing at all. The night just passes. No charges, no action needed on your part." },
      // Technical
      { q: "I can\u2019t log in. What do I do?", a: "Click \u201cForgot Password\u201d on the login page to reset your password. If that doesn\u2019t work, email support@bizzyu.com and we\u2019ll help you get back into your account." },
      { q: "The dashboard looks broken or won\u2019t load.", a: "Try refreshing the page first. If that doesn\u2019t fix it, clear your browser cache (go to your browser\u2019s Settings \u2192 Clear Browsing Data). If it\u2019s still broken, try a different browser (like Chrome, Safari, or Firefox). Still having issues? Email support@bizzyu.com." },
      { q: "I need help with something not covered here.", a: "Email support@bizzyu.com or reach out to your Bizzy campus representative. We\u2019re here to help!" },
    ],
  },

  /* ---- 13. Contact & Support ---- */
  {
    id: "contact",
    title: "Contact & Support",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    intro: "How to reach us when you need help.",
    subsections: [
      {
        id: "contact-info",
        title: "13.1 How to Contact Us",
        content: `
          <ul>
            <li><strong>Email:</strong> <a href="mailto:support@bizzyu.com" class="text-primary hover:underline">support@bizzyu.com</a></li>
            <li><strong>For urgent issues on event night:</strong> Contact your Bizzy campus representative directly</li>
            <li><strong>Response time:</strong> We respond within 24 hours on business days</li>
          </ul>
          <p>When emailing us, please include:</p>
          <ul>
            <li>Your business name</li>
            <li>A description of the issue</li>
            <li>Any screenshots that help explain the problem (you can take a screenshot on most computers by pressing the Print Screen button, or on a Mac by pressing Command + Shift + 3)</li>
          </ul>
        `,
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Search helper                                                      */
/* ------------------------------------------------------------------ */

function matchesSearch(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase())
}

function sectionMatchesSearch(section: Section, query: string): boolean {
  if (!query) return true
  if (matchesSearch(section.title, query)) return true
  if (matchesSearch(section.intro, query)) return true
  for (const sub of section.subsections) {
    if (matchesSearch(sub.title, query) || matchesSearch(sub.content, query)) return true
  }
  if (section.faqs) {
    for (const faq of section.faqs) {
      if (matchesSearch(faq.q, query) || matchesSearch(faq.a, query)) return true
    }
  }
  return false
}

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function FAQItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-3 py-4 text-left cursor-pointer group"
      >
        <ChevronIcon open={open} />
        <span className="text-sm font-medium text-ink group-hover:text-primary transition-colors">{faq.q}</span>
      </button>
      {open && (
        <div className="pb-4 pl-8 text-sm text-gray-600 leading-relaxed">
          {faq.a}
        </div>
      )}
    </div>
  )
}

function SectionBlock({ section, search }: { section: Section; search: string }) {
  const [open, setOpen] = useState(false)
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set())

  // Auto-open sections when search matches
  const isSearching = search.length > 0
  const effectiveOpen = isSearching || open

  function toggleSub(id: string) {
    setExpandedSubs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filter subsections by search
  const visibleSubs = section.subsections.filter(
    (sub) => !search || matchesSearch(sub.title, search) || matchesSearch(sub.content, search)
  )

  const visibleFaqs = section.faqs?.filter(
    (faq) => !search || matchesSearch(faq.q, search) || matchesSearch(faq.a, search)
  )

  return (
    <div id={section.id} className="scroll-mt-24">
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Section header */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-4 p-5 text-left cursor-pointer group hover:bg-gray-50 transition-colors"
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {section.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-ink group-hover:text-primary transition-colors">{section.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{section.intro}</p>
          </div>
          <svg
            className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${effectiveOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Section body */}
        {effectiveOpen && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3">
            {visibleSubs.map((sub) => {
              const subOpen = isSearching || expandedSubs.has(sub.id)
              return (
                <div key={sub.id} id={sub.id} className="scroll-mt-24">
                  <button
                    type="button"
                    onClick={() => toggleSub(sub.id)}
                    className="flex items-start gap-2 w-full text-left cursor-pointer group py-2"
                  >
                    <ChevronIcon open={subOpen} />
                    <h3 className="text-sm font-semibold text-ink group-hover:text-primary transition-colors">{sub.title}</h3>
                  </button>
                  {subOpen && (
                    <div
                      className="pl-7 pb-3 prose prose-sm max-w-none text-gray-600 leading-relaxed
                        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
                        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1
                        [&_li]:text-sm
                        [&_p]:mb-3 [&_p]:last:mb-0
                        [&_strong]:text-ink [&_strong]:font-semibold
                        [&_a]:text-primary [&_a]:hover:underline"
                      dangerouslySetInnerHTML={{ __html: sub.content }}
                    />
                  )}
                </div>
              )
            })}

            {/* FAQ items */}
            {visibleFaqs && visibleFaqs.length > 0 && (
              <div className="pt-2">
                {visibleFaqs.map((faq, i) => (
                  <FAQItem key={i} faq={faq} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HelpPage() {
  const [search, setSearch] = useState("")
  const [tocOpen, setTocOpen] = useState(false)
  const tocRef = useRef<HTMLDivElement>(null)

  // Close TOC on outside click (mobile)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tocRef.current && !tocRef.current.contains(e.target as Node)) {
        setTocOpen(false)
      }
    }
    if (tocOpen) {
      document.addEventListener("mousedown", handleClick)
      return () => document.removeEventListener("mousedown", handleClick)
    }
  }, [tocOpen])

  const filteredSections = useMemo(
    () => SECTIONS.filter((s) => sectionMatchesSearch(s, search)),
    [search]
  )

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Help & Tutorials</h1>
        <p className="text-sm text-gray-500 mt-1">
          Everything you need to know about running your business on Bizzy. Written in plain English.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search for a topic... (e.g. &quot;promo codes&quot;, &quot;refunds&quot;, &quot;Stripe&quot;)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-ink placeholder:text-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {search && (
          <p className="text-xs text-gray-400 mt-2">
            Showing {filteredSections.length} of {SECTIONS.length} sections matching &ldquo;{search}&rdquo;
          </p>
        )}
      </div>

      <div className="flex gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {filteredSections.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <svg className="mx-auto mb-3 h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <p className="text-sm font-medium text-ink">No results found</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search term or browse the sections below.</p>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 text-sm text-primary hover:underline cursor-pointer"
              >
                Clear search
              </button>
            </div>
          )}

          {filteredSections.map((section) => (
            <SectionBlock key={section.id} section={section} search={search} />
          ))}
        </div>

        {/* Table of contents — desktop sticky sidebar */}
        <div className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">On this page</h3>
            <nav className="space-y-1">
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block text-sm text-gray-500 hover:text-primary transition-colors py-1 truncate"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile TOC floating button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-30" ref={tocRef}>
        {tocOpen && (
          <div className="absolute bottom-14 right-0 w-64 rounded-xl border border-gray-200 bg-white shadow-lg p-4 mb-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Jump to section</h3>
            <nav className="space-y-1 max-h-80 overflow-y-auto">
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={() => setTocOpen(false)}
                  className="block text-sm text-gray-500 hover:text-primary transition-colors py-1.5"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        )}
        <button
          type="button"
          onClick={() => setTocOpen(!tocOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] text-white shadow-lg shadow-primary/25 cursor-pointer hover:brightness-110 transition"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </div>
    </div>
  )
}
