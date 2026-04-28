# ☕ Longo — Premium Coffee E-Commerce Platform

> A full-stack coffee shop web application with a client storefront and a comprehensive admin management portal.  
> Built for **CN4005 (Mental Wealth Professional Life)** and **Web Technologies** — University of East London, European Universities in Egypt, Spring 2026.

---

## What is Longo?

Longo is a premium coffee brand e-commerce platform for selling coffee beans, blends, brewing equipment, mugs, and merchandise online. The platform serves three distinct user roles — **Clients** (shoppers), **Admins** (store operators), and **Super Admins** (system managers) — each with a dedicated, fully featured interface.

The admin panel uniquely combines e-commerce management with financial analytics and project management KPIs, directly satisfying the CN4005 rubric requirements for NPV, ROI, Payback Period, Cash Flow analysis, Burn Down charts, and Velocity charts.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5 (Semantic), External CSS, Vanilla JavaScript |
| Backend | Node.js (Express.js) |
| Database | SQLite3 (via `better-sqlite3` and `express-session` store) |
| Auth Security | SHA-256 password hashing with force-reset flows |
| Charts | Chart.js (CDN for frontend, `chartjs-node-canvas` for backend) |
| AI Insights | `@google/generative-ai` (Gemini 1.5 Flash) |
| Document Export | `docx` (Server-side Word Report Generation) |
| Fonts | Google Fonts — Playfair Display + Work Sans |
| Version Control | Git + GitHub |
| Deployment | Proxmox LXC — Debian Linux Container |

---

## 🚀 Local Deployment (Development)

### Prerequisites

- [Node.js v18+](https://nodejs.org/)
- [Git](https://git-scm.com/)
- SQLite is bundled via npm — no separate install needed

### 1. Clone the Repository

```bash
git clone https://github.com/AdamDDR/Longo-Coffee-Website.git
cd longo-coffee
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
DB_PATH=./database/longo.sqlite
SESSION_SECRET=your_secure_random_string_here
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
```

> ⚠️ **Never commit your `.env` file.** It is listed in `.gitignore`.

### 4. Initialize the Database

```bash
npm run db:setup
```

This creates all SQLite tables and seeds default admin credentials. **Change these immediately after first login.**

### 5. Start Development Server

```bash
npm run dev
```

- **Client storefront:** http://localhost:3000
- **Admin panel:** http://localhost:3000/admin/dashboard

---

## 📁 Project Structure

```
longo-coffee/
├── public/
│   ├── css/                 # CSS custom properties, layout, components, admin styles
│   ├── js/                  # Client-side and Admin panel logic
│   └── assets/
│       └── images/          # Uploaded images
├── views/
│   ├── client/              # Homepage, shop, profile, auth, checkout, policies
│   └── admin/               # Dashboard, orders, products, support, money, settings, users
├── routes/
│   ├── auth.js              # Login, register, session, password reset
│   ├── products.js          # Products CRUD
│   ├── orders.js            # Orders CRUD
│   ├── tickets.js           # Support tickets CRUD
│   ├── users.js             # Super Admin user management CRUD
│   ├── admin-dashboard.js   # Dashboard metrics API
│   └── admin.js             # Admin-protected routes, Finance/Analytics APIs, Exports
├── scripts/
│   ├── report-analytics.js  # docx + AI generation for analytics
│   └── report-finance.js    # docx + AI generation for finance
├── database/
│   ├── schema.sql           # Full database schema
│   ├── seed.js              # Initial data seeding
│   ├── migrate.js           # Database migrations
│   └── longo.sqlite         # SQLite DB file (gitignored)
├── middleware/
│   ├── auth.js              # Session validation
│   └── adminGuard.js        # Admin & Super Admin route protection
├── .env                     # Environment config (gitignored)
├── .gitignore
├── package.json
└── server.js                # Express entry point
```

---

## 🗃️ Database Schema

| Table | Description |
|---|---|
| `users` | Clients, admins, and super admins — SHA-256 hashed passwords, temporary passwords, activity flags |
| `products` | Coffee catalog — name, category, roast level, origin, price, stock, image |
| `orders` | Order records linked to users, shipping address snapshot, status, payment method |
| `order_items` | Line items per order — product, quantity, price at time of purchase |
| `support_tickets` | Client-submitted inquiries with urgency and status |
| `ticket_messages` | Threaded messages per ticket — client and admin replies |
| `projects` | Financial initiatives managing CapEx and projected ROI for NPV calculations |
| `policies` | Dynamic key-value store for terms, shipping, and privacy policies |
| `admin_reset_requests` | Super admin oversight table for forced password resets |

Full schema: [`database/schema.sql`](database/schema.sql)

---

## 🔐 Security

- All passwords are hashed with **SHA-256** before any database write — plaintext passwords are never stored.
- Sessions managed server-side via `express-session` with `better-sqlite3-session-store`.
- Admin routes protected by `adminGuard.js` middleware.
- Super Admin routes (user control, role reassignment, force password changes) protected by `superAdminGuard`.
- `.env` and `longo.sqlite` are both in `.gitignore` and must never be committed.
- All database queries use **parameterized statements** — no SQL injection surface.

---

## 🔁 CRUD Screens

| Entity | Create | Read | Update | Delete |
|---|---|---|---|---|
| **Products** | Admin adds product (name, price, stock, image, roast, origin) | Client shop + admin inventory | Edit price, stock, description | Soft delete — preserves order history |
| **User Accounts** | Client self-registration / Admin assignment | Profile page + Super Admin user lists | Update profile, role changes, flag accounts, issue temp passwords | Super Admin hard delete (cascades orders) |
| **Orders** | Created at checkout with line items and address snapshot | Client profile + admin track orders | Admin updates status (Pending → Processing → Shipped → Delivered) | Admin archive/cancel with reason |
| **Support Tickets** | Client submits via contact form → ticket created in admin | Admin inbox + client ticket history | Admin replies, status progresses (Open → In Progress → Resolved → Closed) | Admin archives resolved tickets |
| **Projects/Initiatives** | Admin creates financial initiative with CapEx and ROI | Money Management dashboard | Edit project status, notes, financial targets | Delete project |
| **Policies** | Admin updates policy content via key-value interface | Client views policies page | Update existing policy content | N/A |

---

## 📊 Financial Analytics & AI Reporting (CN4005)

The **Money Management** page implements the full CN4005 financial toolkit:

| Metric | Formula |
|---|---|
| Net Cash Flow | Benefits − Costs (per year) |
| Cumulative Cash Flow | Running sum of net cash flows |
| Payback Period | Year before recovery + (Remaining ÷ Net CF in recovery year) |
| NPV | Sum of [CF_t ÷ (1+r)^t] − Initial Investment |
| ROI | (Total Discounted Benefits − Total Discounted Costs) ÷ Discounted Costs |

**AI-Powered DOCX Export:** The system uses Google's Generative AI (Gemini 1.5 Flash) and `chartjs-node-canvas` to generate comprehensive `.docx` financial and analytics reports server-side, including executive summaries, data-driven insights, and embedded charts.

---

## 📈 Project Management KPIs (CN4005 Rubric)

| KPI | Implementation |
|---|---|
| Task Status | Real-time analytics and order status tracking |
| Low Stock Alerts | Auto-generated from products with stock below threshold |
| Conversion Tracking | Order volume and user registration metrics over 30 days |
| Revenue Tracking | Category and payment method breakdowns |

---

## 👥 Contributors

| Name | Role | GitHub |
|---|---|---|
| Adam Nabil | Frontend | [@AdamDDR](https://github.com/AdamDDR) |
| Feras | Frontend | @Feras1745 |
| Ali Wael | Backend | @AliAzzam123 |
| Abdelrahman Ahab | Backend | @Ahabbtw |
| Yassin | Database | |

---

## 📎 Links

| Item | Link |
|---|---|
| GitHub Repository | [github.com/AdamDDR/Longo-Coffee-Website](https://github.com/AdamDDR/Longo-Coffee-Website) |

---

## 📄 Academic Note

Submitted as the final project for:

- **CN4005** — Mental Wealth Professional Life *(financial analytics, KPIs, project management)*
- **Web Technologies** *(full-stack implementation, CRUD, responsive UI)*

**Spring 2026** — University of East London, European Universities in Egypt.
