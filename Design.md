# Longo — Design System & UX Documentation

**Project:** Longo Coffee E-Commerce Platform
**Design Origin:** Stitch by Google (Figma-style output) — refined and documented for production

---

## 1. Design Philosophy

Longo's visual identity draws from **premium artisanal coffee culture** — warm, unhurried, and precise. Every design decision answers one question: *Does this feel like a brand that takes craftsmanship seriously?*

The interface is **simplistic but modern** with a sleek approach built on three principles:

- **Restraint** — Wide breathing room, maximum two non-neutral accent colors in any view
- **Warmth** — Cream-and-brown palette evokes roasted coffee, not tech products
- **Curves** — Generous border-radius throughout; nothing harsh or sharp

The admin panel applies the same palette and typography but shifts density upward — more data per screen, tighter spacing, a persistent sidebar.

---

## 2. Color Palette

All colors are defined as CSS custom properties in `public/css/variables.css`.

### 2.1 Core Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-bg` | `#FFF8F0` | Main background — all pages |
| `--color-surface` | `#FFFFFF` | Cards, modals, form containers |
| `--color-surface-alt` | `#F5EDE0` | Secondary cards, info panels, sidebar |
| `--color-primary` | `#4B2E2B` | Primary text, active nav items, primary buttons, headings |
| `--color-primary-hover` | `#3A1F1C` | Button hover, active states |
| `--color-text` | `#4B2E2B` | All body text (same as primary) |
| `--color-text-muted` | `#8B7355` | Secondary labels, metadata, placeholder text |
| `--color-text-faint` | `#C4A882` | Tertiary info, disabled states |
| `--color-border` | `rgba(75, 46, 43, 0.12)` | All card borders, input borders |
| `--color-divider` | `rgba(75, 46, 43, 0.08)` | Table row dividers, section dividers |

### 2.2 Status / Badge Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-status-processing` | `#5B8DB8` | Order Processing badge |
| `--color-status-shipped` | `#4A7C59` | Shipped badge |
| `--color-status-delivered` | `#4B2E2B` | Delivered badge (primary) |
| `--color-status-delayed` | `#C17B6B` | Delayed / Warning badge |
| `--color-status-open` | `#5B8DB8` | Ticket Open |
| `--color-status-urgent` | `#D44F3E` | Ticket Urgent |
| `--color-stock-critical` | `#E8A87C` | Low stock Critical badge |
| `--color-stock-low` | `#D4A853` | Low stock Low badge |
| `--color-positive` | `#4A7C59` | Positive trend arrows, success states |
| `--color-negative` | `#C17B6B` | Negative trend arrows |
| `--color-neutral-trend` | `#8B7355` | Stable/flat trend indicator |

### 2.3 CSS Implementation

```css
:root {
  /* Core Palette */
  --color-bg:              #FFF8F0;
  --color-surface:         #FFFFFF;
  --color-surface-alt:     #F5EDE0;
  --color-primary:         #4B2E2B;
  --color-primary-hover:   #3A1F1C;
  --color-text:            #4B2E2B;
  --color-text-muted:      #8B7355;
  --color-text-faint:      #C4A882;
  --color-border:          rgba(75, 46, 43, 0.12);
  --color-divider:         rgba(75, 46, 43, 0.08);

  /* Spacing */
  --space-1: 4px;  --space-2: 8px;   --space-3: 12px;
  --space-4: 16px; --space-5: 20px;  --space-6: 24px;
  --space-8: 32px; --space-10: 40px; --space-12: 48px;
  --space-16: 64px;

  /* Typography */
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body:    'Work Sans', 'Helvetica Neue', sans-serif;

  /* Radius */
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   16px;
  --radius-xl:   20px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(75, 46, 43, 0.06),
               0 1px 2px rgba(75, 46, 43, 0.04);
  --shadow-md: 0 4px 12px rgba(75, 46, 43, 0.08),
               0 2px 4px rgba(75, 46, 43, 0.05);
  --shadow-lg: 0 12px 32px rgba(75, 46, 43, 0.10),
               0 4px 8px rgba(75, 46, 43, 0.06);

  /* Transitions */
  --transition-fast:   150ms cubic-bezier(0.16, 1, 0.3, 1);
  --transition-base:   200ms cubic-bezier(0.16, 1, 0.3, 1);
  --transition-slow:   350ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

## 3. Typography

### 3.1 Font Pairing

| Role | Font | Weights | Source |
|---|---|---|---|
| Display / Headings | **Playfair Display** | 400, 700 | Google Fonts |
| Body / UI / Labels | **Work Sans** | 300, 400, 500, 600 | Google Fonts |

Playfair Display handles all `<h1>` and `<h2>` headings (24px+), brand wordmarks, hero text, page titles, and section headers. Work Sans handles all body copy, button labels, table text, nav items, form labels, badges, and metadata.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Work+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
```

### 3.2 Type Scale

| Element | Font | Size | Weight | Usage |
|---|---|---|---|---|
| Hero heading | Playfair Display | 56–80px (fluid) | 400 | Homepage hero |
| Page title (client) | Playfair Display | 48px | 400 | "Our Collection", "Get in Touch" |
| Page title (admin) | Playfair Display | 32px | 400 | "Track Orders", "Money Management" |
| Section heading | Playfair Display | 28px | 400 | "Seasonal Blends", "Recent Orders" |
| Card heading | Playfair Display | 18px | 400 | Product names, ticket subjects |
| KPI value | Playfair Display | 36–48px | 400 | "$42,500", "18.5%" |
| Body text | Work Sans | 16px | 400 | All paragraphs, descriptions |
| Label / Tag | Work Sans | 12px | 500 | "SINGLE ORIGIN • LIGHT ROAST", "SHIPPING ADDRESS" |
| Button text | Work Sans | 14px | 600 | "Add to Cart", "Send Message" |
| Table cell | Work Sans | 14px | 400 | Orders table, analytics rows |
| Badge text | Work Sans | 12px | 600 | Status badges — uppercase |
| Metadata | Work Sans | 12px | 400 | Timestamps, IDs, pagination |

```css
:root {
  --text-xs:   12px;
  --text-sm:   14px;
  --text-base: 16px;
  --text-lg:   clamp(18px, 2vw, 22px);
  --text-xl:   clamp(24px, 3vw, 32px);
  --text-2xl:  clamp(32px, 5vw, 48px);
  --text-hero: clamp(48px, 7vw, 80px);
}
```

---

## 4. Layout

### 4.1 Client Layout

```
┌─────────────────────────────────────────┐
│  Sticky Top Nav — Logo | Shop | Contact | Profile | Cart | Login │
├─────────────────────────────────────────┤
│                Main Content             │
│  max-width: 1200px, margin: 0 auto      │
│  padding: 0 24px                        │
├─────────────────────────────────────────┤
│              Footer                     │
│  Logo | Nav links | Copyright           │
└─────────────────────────────────────────┘
```

### 4.2 Admin Layout

```
┌────────────────────────────────────────────────┐
│  Top Bar — ☰ | Page Title | 🔔 | User Avatar   │
├──────────────┬─────────────────────────────────┤
│              │                                 │
│  Sidebar     │       Main Content              │
│  220px fixed │       padding: 32px             │
│              │       overflow-y: auto          │
│  Logo        │                                 │
│  - Dashboard │                                 │
│  - Orders    │                                 │
│  - Accounts  │                                 │
│  - Support   │                                 │
│  - Finance   │                                 │
│  - Analytics │                                 │
│              │                                 │
│  + New Product│                                │
│  Admin Avatar│                                 │
└──────────────┴─────────────────────────────────┘
```

### 4.3 Grid Patterns

| Section | Grid | Notes |
|---|---|---|
| Product cards (shop) | `repeat(3, 1fr)` | Collapses to 2 → 1 on mobile |
| KPI cards (admin) | `repeat(4, 1fr)` | Collapses to 2 → 1 on mobile |
| Analytics 2×2 charts | `repeat(2, 1fr)` | Charts equal width |
| Profile page | `300px 1fr` | Info card left, orders right |
| Contact page | `1fr 1fr` | Form left, map/info right |
| Seasonal blends | `2fr 1fr` | Asymmetric feature layout |
| Policies page | Single column | `max-width: 680px`, centered prose |

---

## 5. Component Library

### 5.1 Product Card

```css
.product-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-base),
              transform var(--transition-base);
}

.product-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.product-card__image {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  background: #4B2E2B22;
}

.product-card__body { padding: var(--space-4) var(--space-5) var(--space-5); }
.product-card__tag  { font: 600 var(--text-xs)/1 var(--font-body); letter-spacing: 0.08em; color: var(--color-text-muted); }
.product-card__name { font: 400 var(--text-lg)/1.3 var(--font-display); color: var(--color-primary); margin: 6px 0 12px; }
.product-card__price { font: 400 16px var(--font-body); color: var(--color-primary); }
```

### 5.2 Primary Button

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  background: var(--color-primary);
  color: #FFFFFF;
  font: 600 var(--text-sm)/1 var(--font-body);
  border-radius: var(--radius-full);
  border: none;
  cursor: pointer;
  transition: background var(--transition-fast),
              transform var(--transition-fast),
              box-shadow var(--transition-fast);
}

.btn-primary:hover {
  background: var(--color-primary-hover);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.btn-primary:active { transform: translateY(0); }
```

### 5.3 Secondary (Ghost) Button

```css
.btn-ghost {
  padding: 10px 22px;
  background: transparent;
  color: var(--color-primary);
  border: 1.5px solid var(--color-primary);
  border-radius: var(--radius-full);
  font: 600 var(--text-sm)/1 var(--font-body);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.btn-ghost:hover { background: var(--color-primary); color: #FFFFFF; }
```

### 5.4 Input Fields

```css
.form-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font: 400 var(--text-base)/1 var(--font-body);
  color: var(--color-text);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  outline: none;
}

.form-input::placeholder { color: var(--color-text-faint); }

.form-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(75, 46, 43, 0.12);
}
```

### 5.5 Status Badge

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font: 600 var(--text-xs)/1 var(--font-body);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.badge--processing  { background: #EAF1F8; color: var(--color-status-processing); }
.badge--shipped     { background: #EAF3EC; color: var(--color-status-shipped); }
.badge--delivered   { background: #F0EAE9; color: var(--color-primary); }
.badge--delayed     { background: #F9EDE8; color: var(--color-status-delayed); }
.badge--urgent      { background: #FDE8E6; color: var(--color-status-urgent); }
.badge--critical    { background: #F9EDE0; color: #C17B3A; }
.badge--low         { background: #FDF5E0; color: #B8902A; }
```

### 5.6 KPI Card

```css
.kpi-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5) var(--space-6);
  box-shadow: var(--shadow-sm);
}

.kpi-card__label {
  font: 500 var(--text-xs)/1 var(--font-body);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
}

.kpi-card__value {
  font: 400 var(--text-2xl)/1 var(--font-display);
  color: var(--color-primary);
  margin-bottom: var(--space-2);
}

.kpi-card__trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font: 400 var(--text-xs)/1 var(--font-body);
  color: var(--color-text-muted);
}
```

### 5.7 Admin Table

```css
.data-table { width: 100%; border-collapse: collapse; }

.data-table th {
  font: 600 var(--text-xs)/1 var(--font-body);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  padding: var(--space-3) var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--color-divider);
}

.data-table td {
  font: 400 var(--text-sm)/1 var(--font-body);
  color: var(--color-text);
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-divider);
  vertical-align: middle;
}

.data-table tr:hover td { background: var(--color-surface-alt); }
```

### 5.8 Toggle Switch

```css
.toggle { position: relative; width: 44px; height: 24px; }
.toggle input { display: none; }
.toggle__track {
  position: absolute; inset: 0;
  background: var(--color-border);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.toggle input:checked + .toggle__track { background: var(--color-primary); }
.toggle__track::after {
  content: '';
  position: absolute; top: 2px; left: 2px;
  width: 20px; height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform var(--transition-fast);
}
.toggle input:checked + .toggle__track::after { transform: translateX(20px); }
```

---

## 6. Animation System

### 6.1 Page Load Animations

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: translateX(0); }
}

.animate-fade-up   { animation: fadeInUp   0.4s var(--ease-out) both; }
.animate-fade-in   { animation: fadeIn     0.3s var(--ease-out) both; }
.animate-slide-in  { animation: slideInLeft 0.35s var(--ease-out) both; }
```

Stagger pattern for card grids:
```css
.product-card:nth-child(1) { animation-delay: 0ms; }
.product-card:nth-child(2) { animation-delay: 60ms; }
.product-card:nth-child(3) { animation-delay: 120ms; }
.product-card:nth-child(4) { animation-delay: 180ms; }
.product-card:nth-child(5) { animation-delay: 240ms; }
.product-card:nth-child(6) { animation-delay: 300ms; }
```

### 6.2 Skeleton Loader (Seamless Loading)

```css
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface-alt) 25%,
    #F0E4D4 50%,
    var(--color-surface-alt) 75%
  );
  background-size: 400px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: var(--radius-sm);
}
```

### 6.3 Tab Underline Slide

```css
.tab-indicator {
  position: absolute; bottom: 0;
  height: 2px;
  background: var(--color-primary);
  border-radius: 1px;
  transition: left var(--transition-base), width var(--transition-base);
}
```

### 6.4 Motion Reduction

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Chart.js Configuration

### 7.1 Global Defaults

```javascript
Chart.defaults.font.family = "'Work Sans', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#8B7355';
Chart.defaults.plugins.legend.labels.boxWidth = 10;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.tooltip.backgroundColor = '#4B2E2B';
Chart.defaults.plugins.tooltip.titleColor = '#FFF8F0';
Chart.defaults.plugins.tooltip.bodyColor = '#FFF8F0';
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.padding = 10;
```

### 7.2 Color Tokens for Charts

```javascript
const CHART_COLORS = {
  primary:   '#4B2E2B',
  secondary: '#8B7355',
  tertiary:  '#C4A882',
  surface:   '#F5EDE0',
  positive:  '#4A7C59',
  negative:  '#C17B6B',
  blue:      '#5B8DB8',
  gold:      '#D4A853',
};
```

### 7.3 Grid Style

```javascript
scales: {
  x: {
    grid: { display: false },
    border: { display: false },
    ticks: { color: '#8B7355', font: { size: 11 } }
  },
  y: {
    grid: { color: 'rgba(75,46,43,0.06)', drawBorder: false },
    border: { display: false },
    ticks: { color: '#8B7355', font: { size: 11 } }
  }
}
```

---

## 8. Client Navigation

```
[Longo wordmark — Playfair Display 20px]     [Shop] [Contact] [Profile]     [Login] [🛒]
```

- Sticky top bar, `background: rgba(255,248,240,0.92)`, `backdrop-filter: blur(8px)`
- Active tab underlined with 2px `#4B2E2B` rule, animated slide
- Cart icon shows count bubble in primary color
- On scroll > 20px: `box-shadow: var(--shadow-sm)` applied

---

## 9. Admin Sidebar

```
┌────────────────────┐
│ Longo Admin        │  ← Playfair Display, 18px, bold
│ Management Portal  │  ← Work Sans, 12px, muted
├────────────────────┤
│ □  Dashboard       │
│ 📦 Orders          │  ← Active = background #F0E8E0, left accent 3px #4B2E2B
│ ⚙  Accounts        │
│ ?  Support         │
│ 💳 Finance         │
│ 📊 Analytics       │
├────────────────────┤
│ [+ New Product]    │  ← Full-width pill button, primary color
├────────────────────┤
│ [Avatar] Alex      │  ← At bottom, admin name + email small text
│ admin@longo.com    │
└────────────────────┘
```

Width: 220px. Background: `var(--color-surface-alt)`. Border-right: `1px solid var(--color-border)`.

---

## 10. Wireframe Summaries

| Page | Layout Pattern | Key Visual |
|---|---|---|
| Homepage | Full-width hero + 2-card asymmetric feature below + footer | Hero with coffee bean background texture |
| Shop | Left filter column (220px) + right product grid (3-col) | Bestseller/New badges on card corners |
| Contact | 2-col: form left, info+map right | Pill "Send Message" button |
| Profile | Left info card (300px) + right orders list | Order status tags in Playfair accent color |
| Auth | Centered card, cream background | Tab switcher Login/Sign Up |
| Policies | Single-column long-form, icon-per-section | Section divider lines |
| Admin Dashboard | 3 KPI cards + 2 charts (60/40 split) + alerts table | Burn Down + Velocity side by side |
| Admin Orders | Full-width table, search + filter header, pagination | Avatar initials + status badge per row |
| Admin Support | Left ticket list panel + right thread view | Rich text reply composer at bottom |
| Admin Finance | 4 KPI cards + combo chart (60%) + gauge (40%) + table | Export PDF pill button header |
| Admin Analytics | 4 KPI cards + 2×2 chart grid + full-width category bar | Date range selector top right |
| Admin Settings | Avatar card left + tabbed form panels right | Toggle switches for notifications |

---

## 11. Responsive Breakpoints

| Breakpoint | Width | Changes |
|---|---|---|
| Mobile S | 375px | 1-column everything; hamburger nav; admin sidebar collapses to bottom tab bar |
| Mobile L | 428px | Product grid 1-col; KPI cards 2×2 |
| Tablet | 768px | Product grid 2-col; admin sidebar slides over as drawer |
| Desktop | 1024px | Full 3-col product grid; admin sidebar persistent |
| Wide | 1280px+ | Max content width: `var(--content-wide)` 1200px centered |

---

## 12. CSS File Architecture

```
public/css/
├── variables.css     # All --custom-properties: colors, spacing, radius, shadows, fonts
├── base.css          # Box-sizing reset, html/body defaults, typography base
├── layout.css        # Containers, nav, sidebar, grid helpers, page wrappers
├── components.css    # Cards, buttons, forms, badges, tables, modals, pagination
├── animations.css    # @keyframes, .animate-* utilities, skeleton loader, shimmer
├── admin.css         # Admin-specific overrides, sidebar, top-bar, admin table tweaks
└── style.css         # Entry file — @import all above in order
```

Import order in `style.css`:
```css
@import './variables.css';
@import './base.css';
@import './layout.css';
@import './components.css';
@import './animations.css';
@import './admin.css';
```

---

## 13. Accessibility

- All interactive elements have `:focus-visible` outline: `2px solid var(--color-primary)` with 3px offset
- Minimum touch target 44×44px on all buttons, nav links, and icons
- Semantic HTML5 — `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>` throughout
- All `<img>` tags include descriptive `alt` text; decorative images use `alt=""`
- Color contrast: body text (#4B2E2B on #FFF8F0) = 9.4:1 — exceeds WCAG AAA
- Status badges never rely on color alone — always include text label
- Tables include `<thead>` with `scope="col"` on all `<th>` elements
- Form inputs paired with `<label for>` on every field
