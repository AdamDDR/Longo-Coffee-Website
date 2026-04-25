-- Longo Coffee — Database Schema
-- All tables with proper constraints and foreign keys

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    profile_image_path TEXT DEFAULT NULL,
    shipping_address TEXT DEFAULT NULL,
    phone TEXT DEFAULT NULL,
    role TEXT NOT NULL DEFAULT 'client' CHECK(role IN ('client', 'admin', 'super_admin')),
    is_active INTEGER NOT NULL DEFAULT 1,
    is_flagged INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    roast_level TEXT CHECK(roast_level IN ('Light', 'Medium', 'Dark', NULL)),
    origin TEXT DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Beans' CHECK(category IN ('Beans', 'Equipment', 'Merchandise')),
    price_egp REAL NOT NULL,
    stock_qty INTEGER NOT NULL DEFAULT 0,
    image_path TEXT DEFAULT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    sku TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
    payment_method TEXT NOT NULL DEFAULT 'cod' CHECK(payment_method IN ('cod', 'online')),
    shipping_address_snapshot TEXT DEFAULT '{}',
    total_egp REAL NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_purchase_egp REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    urgency TEXT NOT NULL DEFAULT 'Normal' CHECK(urgency IN ('Normal', 'Urgent')),
    status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    customer_name TEXT DEFAULT NULL,
    customer_email TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Financial Initiatives / Projects table (admin-editable)
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    capex_egp REAL NOT NULL DEFAULT 0,
    projected_roi_pct REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Planned' CHECK(status IN ('Planned', 'Review', 'Active', 'Completed', 'Cancelled')),
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ticket messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    sender_role TEXT NOT NULL CHECK(sender_role IN ('client', 'admin', 'super_admin')),
    message_text TEXT NOT NULL,
    is_internal_note INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id)
);

-- Policies table
CREATE TABLE IF NOT EXISTS policies (
    key TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
