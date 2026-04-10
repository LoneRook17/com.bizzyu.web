# Bizzy Platform Update PRD — April 2026

**Author:** Luke Caprio
**Date:** April 9, 2026
**Status:** Draft
**Repos:** com.bizzyu.services (Node.js API), com.bizzyu.core (Laravel Admin), com.bizzyu.mobile.flutter (Flutter App), com.bizzyu.web (Next.js Portal/Marketing)

---

## Table of Contents

1. Executive Summary
2. Multi-Venue Architecture
3. Venue Web Page & Line Skip Checkout
4. Line Skip Quantity Editing (In-App)
5. Business Dashboard Photo Management
6. Stripe Dashboard Embedded In-App
7. Cooper UI Changes Audit & Integration
8. Bug Fixes
9. Database Changes
10. Implementation Phases

---

## 1. Executive Summary

This update has one major architectural feature (multi-venue businesses), one new web feature (venue pages with line skip web checkout), and a set of bug fixes and quality-of-life improvements across all four repos.

**Priority order:**
1. Bug fixes (deals freeze, push notifications, ticket descriptions, school color, profile refresh)
2. Multi-venue architecture (DB + API + business portal + Flutter app + Laravel admin)
3. Venue web page & line skip web checkout
4. Business dashboard photos
5. Line skip quantity editing in-app
6. Stripe embedded in-app
7. Cooper UI cherry-picks (after all above are stable)

---

## 2. Multi-Venue Architecture

### 2.1 Overview

A business is a parent entity. A venue is a child entity. Every business has at least one venue. Large businesses (e.g., a holding company owning bars A, B, and C at UF) can have multiple venues. Events, deals, and line skips belong to a venue, not directly to a business. Team members can be scoped to a specific venue or be global (agency over all venues).

### 2.2 Database Schema

**New table: `venues`**

| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT PK | |
| business_id | INT FK → businesses.id | Parent business |
| name | VARCHAR(255) NOT NULL | Venue display name |
| address | VARCHAR(500) | Venue-specific address |
| description | TEXT | Venue-specific description |
| photo_url | VARCHAR(500) | Venue photo (shows in Popular Venues) |
| campus_id | INT FK → universities.id | Campus this venue belongs to |
| is_active | BOOLEAN DEFAULT 1 | |
| stripe_connect_id | VARCHAR(255) | Venue-level Stripe account (nullable, falls back to business-level) |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Modify `events` table:** Add `venue_id INT FK → venues.id`. Backfill from `business_id` during migration (each existing business gets one auto-created venue, all their events point to it).

**Modify `deals` table:** Add `venue_id INT FK → venues.id`. Same backfill.

**Modify `recurring_events` table:** Add `venue_id INT FK → venues.id`. Same backfill.

**Modify `line_skips` table (if exists):** Add `venue_id INT FK → venues.id`. Same backfill.

**Modify `business_team_members` table:** Add `venue_id INT NULL FK → venues.id`. NULL means global (access to all venues). A non-null value scopes the member to that specific venue.

**Modify `businesses` table:** Add `photo_url VARCHAR(500)` for overall business photo.

**Migration script must:**
1. Create `venues` table.
2. For every existing business, create one venue row with the business's name, address, campus, and existing photo/flyer data.
3. Add `venue_id` columns to events, deals, recurring_events, line_skips.
4. Backfill `venue_id` from the auto-created venue for each business.
5. Make `venue_id` NOT NULL after backfill (with FK constraint).

### 2.3 API Changes (Node.js)

**New endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /business/venues | Business JWT | List all venues for the authenticated business |
| POST | /business/venues | Owner/Manager | Create a new venue |
| GET | /business/venues/:venueId | Business JWT | Get venue details |
| PATCH | /business/venues/:venueId | Owner/Manager | Update venue info |
| DELETE | /business/venues/:venueId | Owner only | Deactivate a venue (soft delete) |
| POST | /business/venues/:venueId/photo | Owner/Manager | Upload venue photo |

**Modified endpoints:**

All event, deal, and line skip creation endpoints must now accept `venue_id` and validate that:
- The venue belongs to the authenticated business.
- The authenticated team member has access to that venue (is global or assigned to it).

**New middleware: `requireVenueAccess`**
- Reads `venue_id` from request body or params.
- If the team member's `venue_id` is NULL (global), allow access to any venue in their business.
- If the team member's `venue_id` is set, only allow access to that specific venue.
- Returns 403 if venue access denied.

**Modify `GET /ui/venues/popular`:**
- This currently queries businesses. It should query venues instead.
- Return `venue_id` alongside `business_id` in the response.
- The venue photo should be the primary image shown.

### 2.4 Business Portal (Next.js)

**Venue Switcher:**
- Add a dropdown/selector in the sidebar or top nav that lists all venues for the business.
- Selecting a venue filters all dashboard content (events, deals, line skips, analytics, team) to that venue.
- Add an "All Venues" option that shows aggregate data (analytics only; event/deal creation still requires selecting a specific venue).
- The currently selected venue persists in state (localStorage or context).

**First-Time Setup Tutorial:**
- For NEW businesses post-update: after approval, on first login, show a modal/wizard: "Welcome! Let's set up your first venue." with fields: Venue Name, Address, Photo, Description.
- The wizard pre-fills from the business registration data (name, address).
- After completing the wizard, the dashboard unlocks.
- An "Add Another Venue" button in Settings or the venue switcher lets them create additional venues.
- Existing businesses (migrated with auto-created venue) skip the wizard.

**Team Tab Changes:**
- Show team members grouped by venue assignment.
- Categories: "Global Team" (venue_id = NULL) and one section per venue.
- When inviting a team member, add a "Venue Assignment" dropdown: "All Venues (Global)" or a specific venue.
- Owner/Manager can reassign a member's venue scope.

**Analytics Tab Changes:**
- When "All Venues" is selected in the venue switcher, show aggregate analytics across all venues.
- When a specific venue is selected, show analytics for that venue only.

### 2.5 Flutter App Changes

**Popular Venues / Business Pages:**
- The existing Popular Venues section already queries `/ui/venues/popular`.
- Update the data model to use `venue_id` as the primary key for navigation.
- Each venue gets its own page showing: venue photo, line skips, events, and deals for that venue ONLY.
- If a business has 3 venues, all 3 appear as separate cards in Popular Venues. They are independent.

**Event Creation (Business Members In-App):**
- Business team members who create events from the app need a venue selector.
- If the team member is global (venue_id = NULL): show a dropdown of all venues before the event form.
- If the team member is venue-scoped: auto-assign to their venue, no dropdown needed.
- The selected venue_id is sent with the event creation API call.

### 2.6 Laravel Admin

- Add a "Venues" sub-tab under each business detail page.
- Show list of venues for the business with name, address, photo, status.
- Allow admin to create/edit/deactivate venues for a business.
- Event and deal list views should show the venue name alongside business name.

---

## 3. Venue Web Page & Line Skip Checkout

### 3.1 Overview

A new public web page at `bizzyu.com/venue/[venueId]` (or `/venue/[slug]`) that serves as the venue's public presence. This is where line skip share links redirect to.

### 3.2 Page Content

The venue page displays:
1. **Venue header**: Photo, name, address, business name.
2. **Available line skips**: List of active line skips for tonight/upcoming with price and "Buy" button. The "Buy" button links to a web checkout flow (similar to existing event web checkout but for line skips).
3. **Upcoming events**: List of upcoming events at this venue with date, name, price, and a link to the existing event web checkout page (`/checkout/[eventId]`).
4. **Deals**: Active deals at this venue (view-only, claim in app).

### 3.3 Line Skip Web Checkout

Currently, line skips have no web checkout. Build one at `bizzyu.com/lineskip/checkout/[instanceId]` (or integrate into the venue page):
- Show line skip details: venue, date, time, price.
- Quantity selector (1-4 per purchase, configurable).
- Stripe Checkout integration (same pattern as event web checkout).
- On success: show QR code / confirmation with UUID for scanning.

### 3.4 Share Flow

- When a user shares a line skip from the app, the share link goes to `bizzyu.com/venue/[venueId]` (the venue page), not a bare line skip URL.
- The venue page shows the line skip in context alongside events and deals.
- The "Popular Venues" / business page in the Flutter app should have a "Share" button that generates this venue URL.
- Old bare-UUID line skip links should redirect to the venue page with the relevant line skip highlighted.

---

## 4. Line Skip Quantity Editing (In-App)

### 4.1 Who Can Edit

- Business owner (global access to all venues).
- Manager assigned to the venue (or global manager).
- Staff assigned to the venue (or global staff).

### 4.2 What They Edit

- The `default_capacity` on a line skip template (affects future generated instances).
- The `capacity` on a specific line skip instance (tonight's line skip).
- UI: on the venue detail page or a dedicated line skip management section, show each active line skip with current capacity, sold count, and an edit button that opens a number input.

### 4.3 API

- `PATCH /business/line-skips/:lineSkipId` — update default_capacity (owner/manager only).
- `PATCH /business/line-skips/instances/:instanceId` — update capacity for a specific night (owner/manager/staff).
- Both must validate venue access via `requireVenueAccess` middleware.

---

## 5. Business Dashboard Photo Management

### 5.1 Business Photo

- In the business portal Settings page, add a "Business Photo" upload section.
- Stores to `businesses.photo_url`.
- This photo appears as a fallback when no venue-specific photo exists.

### 5.2 Venue Photos

- On the venue edit/create form in the business portal, add a "Venue Photo" upload.
- Stores to `venues.photo_url`.
- This photo shows in the Popular Venues cards in the Flutter app, and on the venue web page.
- Accepted formats: JPEG, PNG. Max 5MB. Resized server-side to a standard dimension.
- Run through AWS Rekognition moderation (existing pipeline from Phase 4).

---

## 6. Stripe Dashboard Embedded In-App

### 6.1 Implementation

Use Stripe's Account Session API to create an embedded component session:
1. API endpoint: `POST /business/stripe/account-session` — calls Stripe's `accountSessions.create()` with the business's `stripe_connect_id` and component type `account_management` or `account_onboarding`.
2. Returns a `client_secret`.
3. Flutter uses a WebView to load the Stripe Connect embedded component using the client secret.
4. Place this in the Flutter app under the business profile/settings section as a "Stripe Account" tab or page.

### 6.2 Fallback

If the WebView approach is too complex or Stripe's embedded components don't render well in Flutter WebView, fall back to opening the Stripe Express Dashboard link in an in-app browser (`url_launcher` with `LaunchMode.inAppWebView`). The Express Dashboard URL is obtained via `accounts.createLoginLink()`.

---

## 7. Cooper UI Changes Audit & Integration

### 7.1 Web Branch Audit (dev-cooper)

**Verdict: No UI improvements to cherry-pick from the web branch.** All changes are either architectural deviations or regressions.

**Architecture change (DO NOT MERGE):**
- Cooper added Next.js API routes (`src/app/api/business/auth/*`) that connect directly to MySQL, bypassing the Node.js API entirely.
- Added `src/lib/db.ts` — a MySQL connection pool inside the Next.js app.
- Changed `api-client.ts` to prefix all paths with `/api` (routing to Next.js API routes instead of the Node.js server).
- This bypasses all Node.js middleware (rate limiting, moderation, role checks) and duplicates business logic.

**Feature removals (Cooper branched before these were built on dev):**
- Removed all line skip pages, components, types, nav links, and analytics tabs.
- Removed checkout pages, line skip scan pages.
- Removed ticket price inline editing from event detail page.
- Removed camera fallback/error handling in scanner.

### 7.2 Flutter Branch Audit (dev-cooper)

Requires local audit by Luke:
```bash
cd /path/to/com.bizzyu.mobile.flutter
git fetch origin dev-cooper
git diff dev...origin/dev-cooper --stat
git diff dev...origin/dev-cooper -- lib/
```
Cherry-pick individual UI-only commits after verifying each doesn't bring in old API logic.

---

## 8. Bug Fixes

### 8.1 Profile Auto-Refresh (Flutter)

**Problem:** Profile page requires manual pull-down to refresh data.

**Fix:** Add refresh on tab focus using GetX lifecycle hooks. Call `fetchProfile()` in `onInit()` AND when the profile tab becomes active. Do NOT use timer-based auto-refresh.

### 8.2 Deals Freeze Inside Venue (Flutter)

**Problem:** Claiming a deal from inside a venue page freezes the app (unresponsive).

**Fix:** Debug the deal claim flow from venue detail page. Likely causes: missing `await`, incorrect parameters passed to claim API, or GetX controller state issue where the venue page's deal list doesn't update after claim.

### 8.3 School Color in Events Top-Left (Flutter)

**Problem:** The school/university label in the top-left of event cards shows a different color than expected.

**Fix:** Check event card widget — use university brand color from database or a consistent platform color.

### 8.4 Ticket Descriptions Cut Off (Flutter)

**Problem:** Ticket tier descriptions get truncated in the app.

**Fix:** Increase `maxLines` or add "Show more" expansion toggle in ticket display widget.

### 8.5 Random Push Notifications for Bi-Weekly Deals (Firebase)

**Problem:** Users receive push notifications for "Claim Once Bi-Weekly Deals" without anyone triggering them.

**Investigation needed:**
1. Check Firebase Cloud Messaging console for scheduled messages or campaigns.
2. Check Laravel `app/Console/Kernel.php` for scheduled commands that send push notifications.
3. Check EC2 cron jobs.
4. Check for Firebase Cloud Functions or triggers.

**Fix:** Once source is found, disable or make configurable.

### 8.6 Universal Scanner for Line Skips

**Verification needed:** The universal scanner at `bizzyu.com/checkin/[uuid]` and batch scanner at `bizzyu.com/scanner` were built in Phase 8 for event tickets. Verify they also work for line skip QR codes:
- Line skip ticket instances should have a UUID.
- Scanner should detect whether a scanned UUID is an event ticket or a line skip.
- GREEN scanner = regular ticket check-in. ORANGE scanner = line skip check-in.
- If scanner doesn't handle line skips, extend API to check both `ticket_instances` and `line_skip_purchases` tables.

---

## 9. Database Changes Summary

### 9.1 New Tables

```sql
CREATE TABLE venues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  description TEXT,
  photo_url VARCHAR(500),
  campus_id INT,
  is_active BOOLEAN DEFAULT 1,
  stripe_connect_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (campus_id) REFERENCES universities(id)
);
```

### 9.2 Altered Tables

```sql
ALTER TABLE events ADD COLUMN venue_id INT AFTER business_id;
ALTER TABLE deals ADD COLUMN venue_id INT AFTER business_id;
ALTER TABLE recurring_events ADD COLUMN venue_id INT AFTER business_id;
ALTER TABLE business_team_members ADD COLUMN venue_id INT NULL;
ALTER TABLE businesses ADD COLUMN photo_url VARCHAR(500);
```

### 9.3 Migration Steps

1. Create venues table.
2. For each business: INSERT INTO venues (business_id, name, address, campus_id) SELECT id, name, address, campus_id FROM businesses.
3. UPDATE events/deals/recurring_events SET venue_id from auto-created venue.
4. ALTER TABLE to make venue_id NOT NULL.
5. Add foreign key constraints.

---

## 10. Implementation Phases

### Phase A: Bug Fixes

| Session | Description | Repo |
|---------|-------------|------|
| 1 | Flutter bug fixes (profile, deals, color, tickets) | Flutter |
| 2 | Push notification investigation | Laravel + Firebase |
| 3 | Line skip scanner verification | Node.js + Next.js |

### Phase B: Multi-Venue DB + API

| Session | Description | Repo |
|---------|-------------|------|
| 4 | Database migration | Node.js |
| 5 | Venue CRUD API + middleware | Node.js |
| 6 | Update Popular Venues API | Node.js |

### Phase C: Multi-Venue Business Portal

| Session | Description | Repo |
|---------|-------------|------|
| 7 | Venue switcher + first-time setup | Next.js |
| 8 | Team tab venue scoping | Next.js |
| 9 | Analytics venue toggle | Next.js |

### Phase D: Multi-Venue Flutter App

| Session | Description | Repo |
|---------|-------------|------|
| 10 | Popular Venues / business pages update | Flutter |
| 11 | Event creation venue selector | Flutter |
| 12 | Line skip quantity editing | Flutter |

### Phase E: New Web Features

| Session | Description | Repo |
|---------|-------------|------|
| 13 | Venue web page | Next.js |
| 14 | Line skip web checkout | Next.js |

### Phase F: Photos + Stripe Embed

| Session | Description | Repo |
|---------|-------------|------|
| 15 | Photo management | Node.js + Next.js |
| 16 | Stripe embedded dashboard | Flutter |

### Phase G: Laravel Admin Updates

| Session | Description | Repo |
|---------|-------------|------|
| 17 | Admin venue management | Laravel |

### Phase H: Cooper Flutter Cherry-Pick

| Session | Description | Repo |
|---------|-------------|------|
| 18 | Audit + cherry-pick UI changes | Flutter |
