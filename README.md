# Longo — Premium Coffee E-Commerce Platform

> A full-stack coffee shop web application with a client storefront and a comprehensive admin management portal.
> Built for CN4005 (Mental Wealth Professional Life) and Web Technologies — University of East London, European Universities in Egypt, Spring 2026.

---

## ☕ What is Longo?

**Longo** is a premium coffee brand e-commerce platform that sells coffee beans, blends, brewing equipment, mugs, and merchandise online. The platform serves two distinct user roles: **Clients** (shoppers) and **Admins** (store operators), each with a dedicated, fully featured interface.

The admin panel uniquely combines e-commerce management with financial analytics and project management KPIs — directly satisfying the CN4005 Mental Wealth rubric requirements for NPV, ROI, Payback Period, Cash Flow analysis, Burn Down charts, and Velocity charts.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5 (Semantic), External CSS, Vanilla JavaScript |
| Backend | Node.js (Express.js) |
| Database | SQLite3 (via `better-sqlite3`) |
| Auth Security | SHA-256 password hashing |
| Charts | Chart.js (CDN) |
| Icons | Lucide Icons (CDN) |
| Fonts | Google Fonts — Playfair Display + Work Sans |
| PDF Export | jsPDF + html2canvas |
| Version Control | Git + GitHub |
| Deployment | Proxmox LXC — Debian Linux Container |

---

## 🚀 Local Deployment (Development)

### Prerequisites

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org/)
- **Git** — [git-scm.com](https://git-scm.com/)
- SQLite is bundled via npm — no separate install needed

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/longo-coffee.git
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
```

> ⚠️ Never commit your `.env` file. It is listed in `.gitignore`.

### 4. Initialize the Database

```bash
npm run db:setup
```

This creates all SQLite tables and seeds default admin credentials:

```
Email:    admin@longo.com
Password: Admin@1234

Email: superadmin@longo.com
Password: Super@1234
```

> Change these immediately after first login.

### 5. Start Development Server

```bash
npm run dev
```

- Client storefront: **http://localhost:3000**
- Admin panel: **http://localhost:3000/admin**

---

## 📁 Project Structure

```
longo-coffee/
├── public/
│   ├── css/
│   │   ├── variables.css        # All CSS custom properties
│   │   ├── base.css             # Reset + typography base
│   │   ├── layout.css           # Grid, containers, nav, sidebar
│   │   ├── components.css       # Cards, buttons, forms, badges
│   │   ├── animations.css       # Keyframes and transitions
│   │   ├── admin.css            # Admin panel styles
│   │   └── style.css            # Entry point — @imports all above
│   ├── js/
│   │   ├── main.js              # Client-side logic
│   │   ├── admin.js             # Admin panel logic
│   │   ├── charts.js            # Chart.js configuration + rendering
│   │   ├── finance.js           # NPV, ROI, Payback, Weighted Score
│   │   └── auth.js              # Login/register frontend logic
│   └── assets/
│       └── images/
├── views/
│   ├── client/
│   │   ├── homepage.html        # Homepage
│   │   ├── shop.html            # Shop / Products page
│   │   ├── contact.html         # Contact page
│   │   ├── profile.html         # User profile
│   │   ├── auth.html            # Login / Sign up
│   │   └── policies.html        # Policies page
│   └── admin/
│       ├── dashboard.html       # Admin dashboard
│       ├── orders.html          # Track orders
│       ├── products.html        # Product & inventory management
│       ├── support.html         # Contact support / tickets
│       ├── money.html           # Money management
│       ├── analytics.html       # Explore analytics
│       └── settings.html        # Account settings
├── routes/
│   ├── auth.js                  # Login, register, session
│   ├── products.js              # Products CRUD
│   ├── orders.js                # Orders CRUD
│   ├── tickets.js               # Support tickets CRUD
│   └── admin.js                 # Admin-protected routes
├── database/
│   ├── schema.sql               # Full database schema
│   ├── seed.js                  # Initial data seeding
│   └── longo.sqlite             # SQLite DB file (gitignored)
├── middleware/
│   ├── auth.js                  # Session validation
│   └── adminGuard.js            # Admin route protection
├── .env                         # Environment config (gitignored)
├── .gitignore
├── package.json
└── server.js                    # Express entry point
```

---

## 🗃️ Database Schema

| Table | Description |
|---|---|
| `users` | Clients and admins — SHA-256 hashed passwords, profile image path, role |
| `products` | Coffee catalog — name, category, roast level, origin, price, stock, image |
| `orders` | Order records linked to users, shipping address snapshot, status |
| `order_items` | Line items per order — product, quantity, price at time of purchase |
| `support_tickets` | Client-submitted inquiries with urgency and status |
| `ticket_messages` | Threaded messages per ticket — client and admin replies |
| `sprint_tasks` | Project management tasks for Burn Down and Velocity chart data |

Full schema: `database/schema.sql`

---

## 🔐 Security

- All passwords are hashed with **SHA-256** before any database write. Plaintext passwords are never stored.
- Sessions managed server-side via `express-session`.
- Admin routes protected by `adminGuard.js` — unauthenticated requests redirect to login.
- `.env` and `longo.sqlite` are both in `.gitignore` and must never be committed.
- All database queries use parameterized statements — no SQL injection surface.

---

## 🔁 CRUD Screens (4 Required by Rubric)

| Entity | Create | Read | Update | Delete |
|---|---|---|---|---|
| **Products** | Admin adds product (name, price, stock, image, roast, origin) | Client shop + admin inventory | Edit price, stock, description | Soft delete — preserves order history |
| **User Accounts** | Client self-registration with SHA-256 hashed password | Profile page with order history | Update name, address, avatar | Account deactivation |
| **Orders** | Created at checkout with line items and address snapshot | Client profile + admin track orders | Admin updates status (Pending → Processing → Shipped → Delivered) | Admin archive/cancel with reason |
| **Support Tickets** | Client submits via contact form → ticket created in admin | Admin inbox + client ticket history | Admin replies, status progresses (Open → In Progress → Resolved → Closed) | Admin archives resolved tickets |

---

## 📊 Financial Analytics (CN4005 Mental Wealth)

The Money Management page implements the full CN4005 financial toolkit:

| Metric | Formula |
|---|---|
| Net Cash Flow | Benefits − Costs (per year) |
| Cumulative Cash Flow | Running sum of net cash flows |
| Payback Period | Year before recovery + (Remaining ÷ Net CF in recovery year) |
| NPV | Sum of [CF_t ÷ (1+r)^t] − Initial Investment |
| ROI | (Total Discounted Benefits − Total Discounted Costs) ÷ Discounted Costs |
| Weighted Score | Sum of (Weight_i × Score_i) per project |

All results are interactive (Chart.js) and exportable as PDF reports via jsPDF.

---

## 📈 Project Management KPIs (CN4005 Rubric)

| KPI | Implementation |
|---|---|
| Burn Down Chart | Sprint story points remaining (Actual vs Ideal line) — live in admin dashboard |
| Velocity Chart | Story points completed per sprint (Sprint 1–5) — bar chart in dashboard |
| Task Status | To Do / In Progress / Completed / Blocked counts — KPI cards |
| Critical Path | FS/SS dependency logic documented in sprint backlog table |
| Low Stock Alerts | Auto-generated from products with stock below threshold |

---

## ⚙️ Configuration Management & Version Control

Branching strategy (Lab 7 — GitHub):

```
main          ← production-ready, protected
develop       ← integration branch
feature/xxx   ← feature development
hotfix/xxx    ← urgent production fixes
```

Commit convention:
```
feat: add SHA-256 password hashing to registration
fix: resolve order status not updating in admin view
docs: update README with Proxmox deployment steps
chore: add .gitignore for sqlite and env files
```

---

## 🖥️ Production Deployment — Proxmox LXC

| Spec | Value |
|---|---|
| Container Type | LXC (Unprivileged) |
| OS | Debian 12 (Bookworm) |
| RAM | 2 GB |
| CPU | 2 vCores |
| Storage | 20 GB |
| Node.js | v18 LTS |

```bash
# On the Proxmox LXC container:
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs git

git clone https://github.com/yourusername/longo-coffee.git /var/www/longo
cd /var/www/longo
npm install --production
cp .env.example .env
nano .env   # fill in production values
npm run db:setup

# Run with PM2
npm install -g pm2
pm2 start server.js --name longo
pm2 save && pm2 startup
```

---

## 👥 Contributors

| Name | Role | GitHub |
|---|---|---|
| [Your Name] | Full-Stack Lead | @yourusername |
| [Team Member 2] | Frontend / UI | @teammate2 |
| [Team Member 3] | Backend / DB | @teammate3 |

---

## 📎 Academic Links

| Item | Link |
|---|---|
| GitHub Repository | https://github.com/yourusername/longo-coffee |
| Live Website | http://your-proxmox-ip:3000 |
| Jira Board | https://yourteam.atlassian.net/jira/software/projects/LONGO |

---

## 📄 Academic Note

Submitted as the final project for:
- **CN4005 — Mental Wealth Professional Life** (financial analytics, KPIs, project management)
- **Web Technologies** (full-stack implementation, CRUD, responsive UI)

Spring 2026 — University of East London, European Universities in Egypt.
