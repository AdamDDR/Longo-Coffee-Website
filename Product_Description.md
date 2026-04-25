# Longo — Product Description & System Specification

**Project:** Longo Coffee E-Commerce Platform
**Courses:** CN4005 Mental Wealth Professional Life | Web Technologies
**Institution:** University of East London — European Universities in Egypt
**Semester:** Spring 2026

---

## 1. Product Overview

Longo is a full-stack e-commerce web application built for a premium coffee brand. It delivers a dual-interface experience: a **Client Storefront** for shoppers and an **Admin Control Panel** for store operators. The platform is intentionally designed to satisfy two academic rubrics simultaneously — the Web Technologies implementation requirements and the CN4005 Mental Wealth requirements covering financial analysis, project management KPIs, and business decision tools.

The application is built on Node.js (Express), stores data in SQLite, and is written in Semantic HTML5, external CSS, and Vanilla JavaScript with no frontend frameworks. All passwords are secured using SHA-256 hashing before storage.

---

## 2. Business Plan & Project Scope

### 2.1 Problem Statement

Small and independent coffee brands in Egypt lack affordable, integrated platforms that combine a professional online storefront with meaningful financial intelligence. Longo solves this by embedding financial analysis tools (NPV, ROI, Payback Period, Cash Flow, Weighted Score) and project KPI dashboards directly into the admin panel — giving operators real-time visibility into business health from a single interface.

### 2.2 Target Users

| User Type | Description |
|---|---|
| Client (Shopper) | Coffee enthusiast who browses, purchases, and tracks orders online |
| Admin (Operator) | Store manager overseeing inventory, finances, customer relations, and analytics |

### 2.3 Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | User registration and login with SHA-256 hashed passwords and session management | Critical |
| FR-02 | Coffee product catalog with image, roast level, origin, price, and stock | Critical |
| FR-03 | Add to cart, checkout, and order creation with shipping address snapshot | Critical |
| FR-04 | Admin CRUD for Products, Orders, Tickets, and User Accounts (≥4 screens) | Critical |
| FR-05 | Contact form submissions routed to admin support ticket system | High |
| FR-06 | Live support ticket threading (client → admin → client replies) | High |
| FR-07 | Money Management: NPV, ROI, Payback Period, Cash Flow, Weighted Score with charts | High |
| FR-08 | Admin Dashboard: KPI cards, Burn Down chart, Velocity chart, Low Stock alerts | High |
| FR-09 | PDF export for financial reports (single section and full combined report) | High |
| FR-10 | Profile page with order history, shipping address, and avatar | Medium |
| FR-11 | Full policies page: Shipping, Payment, Returns, Privacy | Medium |
| FR-12 | Analytics page: Sales trend, top products, orders by status, new users, revenue by category | Medium |
| FR-13 | Admin Products/Inventory management page with full CRUD and stock tracking | Critical |
| FR-14 | GitHub repository with branching strategy, conventional commits, and .gitignore | Required |
| FR-15 | Proxmox LXC deployment — 2GB RAM, 2 vCores, Debian Linux | Required |

### 2.4 Non-Functional Requirements

- Page load under 2 seconds on standard connection
- Fully responsive from 375px (mobile) to 1280px+ (desktop)
- Parameterized SQL queries only — no injection surface
- Admin routes protected by server-side session middleware
- All animations respect `prefers-reduced-motion`

---

## 3. Process Automation CRUD Screens

### 3.1 Products (Admin — Inventory Management)

| Operation | Description |
|---|---|
| **Create** | Admin adds a new product: name, description, roast level (Light/Medium/Dark), origin (Africa/Central America/South America/Blend), category (Beans/Equipment/Merchandise), price in EGP, stock quantity, image upload |
| **Read** | Products table in admin panel with search, filter by category and roast level; product cards on client shop page |
| **Update** | Edit product name, price, description, stock level, roast, origin, image |
| **Delete** | Soft delete — removes from storefront, preserves order history records |

Admin changes reflect immediately on the public shop page.

### 3.2 User Accounts

| Operation | Description |
|---|---|
| **Create** | Client registers with full name, email, password (SHA-256 hashed), optional profile avatar upload |
| **Read** | Profile page shows user details, saved shipping address, full order history, submitted tickets |
| **Update** | Client updates display name, email, delivery address, phone, profile photo |
| **Delete** | Admin deactivates account — preserves all order and ticket records |

### 3.3 Orders

| Operation | Description |
|---|---|
| **Create** | Generated at checkout — linked to user ID, product line items, quantities, prices at time of purchase, shipping address snapshot |
| **Read** | Client sees orders in profile; admin sees all 42+ orders in Track Orders page with full address, items, and status timeline |
| **Update** | Admin updates status: Pending → Processing → Shipped → Delivered. Client cancels if still Pending |
| **Delete** | Admin archives/cancels orders with reason logged |

Order statuses use FS (Finish-to-Start) dependency logic — an order cannot be marked Shipped before Processing, consistent with task dependency principles from CN4005 Lab 1.

### 3.4 Support Tickets

| Operation | Description |
|---|---|
| **Create** | Client submits via Contact page (Name, Email, Subject/Type, Message) → ticket appears instantly in admin Support inbox |
| **Read** | Admin views all tickets (All / Open / In Progress / Resolved / Closed tabs); client sees ticket history on Profile page |
| **Update** | Admin replies in threaded chat interface; ticket status progresses through lifecycle; urgency can be flagged |
| **Delete** | Admin archives resolved/closed tickets |

The ticket pipeline mirrors a Kanban workflow: Open → In Progress → Resolved → Closed, consistent with the agile task tracking methodology in CN4005 Lab 2.

---

## 4. Client-Side Pages (6 Screens)

### 4.1 Homepage (`/`)

The brand entry point for Longo Coffee. Features a full-width hero section with the headline *"Every cup, crafted for you."*, two CTA buttons (Explore Roasts / Our Story), and a coffee background image. Below the hero, a Seasonal Blends section shows featured products in an asymmetric layout — one large card (2/3 width) beside a tall card (1/3 width). A subtle footer carries policies, shipping, terms, and sustainability links.

### 4.2 Shop / Products Page (`/shop`)

Displays the full coffee catalog with a left-column filter panel (Roast Level: Light/Medium/Dark; Origin: Africa/Central America/South America/Blend) and a 3-column product card grid. Products include Ethiopia Yirgacheffe (EGP 185), Colombia Supremo (EGP 215), Longo Signature Blend (EGP 195), Guatemala Antigua (EGP 210), Costa Rica Tarrazu (EGP 230), and Sumatra Mandheling (EGP 195). Each card shows a product image, name, roast type tag, price in EGP, and an "Add to Cart" pill button. A "Load More Coffees" button handles pagination.

### 4.3 Contact Page (`/contact`)

Left column: contact form with fields — Name, Email, Message — and a "Send Message" pill button. Right column: info card with roastery address (Cairo, Egypt), email (hello@longocoffee.com), phone, and operating hours. A map placeholder sits below the info card. On successful submission, a confirmation message appears and the form data creates a support ticket in the admin system.

### 4.4 Profile Page (`/profile`) — Authenticated

Header shows user avatar, welcome message ("Welcome Back, Alex"), and email. Left column: profile card with shipping address, payment method on file, and an "Edit Profile" button. Right column: Recent Orders section showing order cards with order ID, date, product details, total, status (DELIVERED / SHIPPED / PROCESSING / PENDING), and a "Track Package" link.

### 4.5 Login / Sign Up Page (`/auth`)

Centered white card (max-width 460px, border-radius 20px) on a `#FFF8F0` cream background. "Longo" wordmark centered at top with tagline *"Welcome back to your daily ritual."* Tab switcher: **Login** (Email, Password, Sign In button, Forgot password link) and **Sign Up** (Full Name, Email, Password, Confirm Password, profile photo upload area, Create Account button).

### 4.6 Policies Page (`/policies`)

Page header "Policies" with subtitle. Content rendered as flowing long-form document sections with icons:

- **Shipping:** Standard 3–7 days within Egypt; express 1–2 days Cairo only (EGP 50 fee); free standard on orders over EGP 500; tracking sent on dispatch; orders processed within 48 hours of payment.
- **Payment:** Cash on Delivery (Cairo & Giza), Visa/Mastercard (SSL secured), Vodafone Cash, InstaPay; no card details stored on servers.
- **Returns & Exchanges:** Unopened products within 14 days; coffee beans non-returnable once opened (hygiene); equipment returnable if unused; refunds within 7 business days; contact support to initiate.
- **Privacy Policy:** Data collected: name, email, shipping address, order history; never sold to third parties; passwords stored as SHA-256 hashes — unreadable even by the team; data deletion available on request to hello@longocoffee.com.

---

## 5. Admin-Side Pages (6 Screens)

### 5.1 Dashboard (`/admin/dashboard`)

The operational command center. Contains:

**KPI Cards (top row):**
- Total Sales: EGP 42,500 ↑ +12.5% vs last month
- Active Orders: 1,204 → Stable
- New Customers: 342 ↑ +8.2% vs last month

**Project Management Charts:**
- *Inventory Burn Down Chart* — tracks remaining story points across a 14-day sprint; Ideal (dashed) vs Actual (solid) lines
- *Order Velocity Chart* — story points completed per sprint (Sprint 1–5: 32, 38, 41, 35, 44)

**Low Stock Alerts Panel:**
- Espresso Blend No.4 — SKU: ESP-004 — 12 lbs remaining (Critical badge)
- Colombian Single Origin — SKU: SGL-COL — 45 lbs remaining (Low badge)
- Each alert links directly to the product edit screen

### 5.2 Track Orders (`/admin/orders`)

Full orders table with columns: Order ID, Date, Customer (avatar initial + name), Total (EGP), Status, Actions. Status badges: Processing (blue), Shipped (green), Delayed (pink), Delivered (brown). Search bar and Filter button in header. Pagination: Showing 1 to 4 of 42 orders. Order detail modal shows customer info, full shipping address, itemized products, totals breakdown, and a visual order timeline stepper.

### 5.3 Account Settings (`/admin/settings`)

Left sidebar navigation within the page: Profile Information | Password & Security | Notifications. Profile form: First Name, Last Name, Email Address, Admin Role (dropdown, locked for Super Admin). Password section: Current Password, New Password, Confirm New Password — with note: *"Ensure your account is using a long, random password to stay secure."* Notification Preferences: toggle switches for New Order Alerts, Low Inventory Warnings, and Weekly Analytics Digest.

### 5.4 Contact Support (`/admin/support`)

Split-panel layout. Left panel: ticket list with search bar, status filter tabs (All / Open / Resolved), and ticket cards showing ticket ID, timestamp, subject, preview text, customer avatar, and urgency badge. Right panel: full ticket thread view — customer message displayed in a content block, internal system note in a warning-yellow card, and admin reply area with rich text toolbar (Bold, Italic, Link, Attachment, Image) plus Save Draft and Send Reply buttons.

Shown ticket: *#1042 — Sarah Jenkins — "Missing item in recent order"* (URGENT) with message about Guatemala Antigua beans missing from Order #ORD-8821. Internal note confirms inventory issue.

### 5.5 Money Management (`/admin/money`) — CN4005 Core

The financial analytics hub. All values displayed in EGP.

**KPI Cards:**
- Total Revenue (YTD): EGP 1,240,000 ↑ +12.4%
- Net Profit Margin: 24.8% ↑ +2.1%
- Operating Cash Flow: EGP 450,000 → Stable
- Avg. Order Value: EGP 84.50 ↓ -1.2%

**Cash Flow Analysis (Monthly/Quarterly toggle):**
Combo chart — grouped bars (Inflow vs Outflow per month) overlaid with a Net Cash Margin line. Data: Jan–Jun showing growth from EGP 25k to EGP 75k net margin.

**Est. ROI (Annual):** Gauge/donut display — 18.5% — ✅ On Target

**Net Present Value:** EGP 850,200 result card

**Active Initiatives Portfolio Table:**
| Project | CapEx | Projected ROI | NPV | Weighted Score | Status |
|---|---|---|---|---|---|
| Roastery Expansion Phase II | EGP 250,000 | 22.4% | EGP 120,000 | 8.5/10 | Active |
| Direct Trade Partnership Program | EGP 85,000 | 15.2% | EGP 45,000 | 7.2/10 | Review |
| Retail Packaging Redesign | EGP 45,000 | 9.8% | EGP 12,000 | 5.5/10 | Planned |

Financial formulas implemented:
- Net Cash Flow = Benefits − Costs
- Cumulative Cash Flow = running sum
- Payback Period = Year before recovery + (Remaining ÷ Net CF in recovery year)
- NPV = Σ [CF_t ÷ (1+r)^t] − Initial Investment
- ROI = (Total Discounted Benefits − Total Discounted Costs) ÷ Discounted Costs
- Weighted Score = Σ (Weight_i × Score_i)

Export: "Export PDF" pill button + "Export" button in header — generates full financial report via jsPDF.

### 5.6 Analytics (`/admin/analytics`)

**KPI Cards:**
- Total Revenue: EGP 124,500 ↑ +12.5%
- Total Orders: 3,240 ↑ +8.2%
- Avg. Order Value: EGP 38.42 ↓ -2.1%
- Active Customers: 1,890 ↑ +15.3%

**2×2 Chart Grid:**
- Sales Trend (line + area) — 7-day peak pattern
- New Users (area chart) — 30-day registration trend
- Top Products (horizontal bar): Espresso Blend 85k | Single Origin 65k | Decaf Roast 45k | Cold Brew 30k
- Orders by Status (donut): Completed / Processing / Pending — 3.2k total

**Revenue by Category (full-width bar):**
Beans | Equipment | Merchandise | Subscriptions | Gifts | Syrups | Wholesale

Date range selector: Last 7 Days / 30 Days / 90 Days / Custom. Export button top right.

---

## 6. Requirements Mapping — Rubric Coverage

| CN4005 Rubric Item | Implementation |
|---|---|
| Process automation CRUD (≥4 screens) | Products, Orders, User Accounts, Support Tickets |
| Configuration management & version control | Git branching (main/develop/feature), conventional commits, .gitignore, GitHub repo |
| Requirements mapping & monitoring procedures | FR-01 to FR-15 in this document; GitHub Issues as traceability matrix |
| KPIs, Burn Down chart, Velocity chart automation | Live charts in admin dashboard fed from sprint_tasks SQLite table |
| Business plan including project overview and scope | Section 2 of this document |
| Financial analysis & decision analysis | NPV, ROI, Payback Period, Cash Flow, Weighted Score in Money Management page |
| Tasks planning & risk analysis | Sprint backlog table, critical path FS/SS logic, Gantt timeline |
| Deliverables covering critical path, resources, backlog, sprints | Dashboard charts + GitHub milestones + Jira board |

---

## 7. Sprint Plan

| Sprint | Duration | Key Deliverables |
|---|---|---|
| Sprint 1 — Foundation | Weeks 1–2 | DB schema, SHA-256 auth, homepage, shop page (static) |
| Sprint 2 — Core Features | Weeks 3–4 | Products CRUD, orders system, support tickets, profile page |
| Sprint 3 — Analytics & Polish | Weeks 5–6 | Money Management (all financials), analytics charts, dashboard KPIs, PDF export, mobile pass, deployment |

---

## 8. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SQLite concurrent write limits | Low | Medium | Acceptable for project scale; upgrade path to PostgreSQL noted |
| SHA-256 without salt (theoretical rainbow table) | Low | Medium | Acceptable for academic scope; production would use bcrypt + salt |
| Proxmox container downtime | Low | High | Local development always available as fallback |
| Chart.js rendering on mobile | Medium | Low | Tested at 375px; canvas elements scale with container width |
| PDF export layout shift | Medium | Low | html2canvas captures rendered DOM; tested before submission |
