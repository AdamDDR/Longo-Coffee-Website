/**
 * Longo Coffee — Database Seed Script
 * Creates tables and inserts default data.
 * Run: npm run db:setup
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Ensure .env is loaded
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('./db');

// ---------------------------------------------------------------------------
// 1. Run schema
// ---------------------------------------------------------------------------
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);
console.log('✅ Schema created');

// ---------------------------------------------------------------------------
// Helper: SHA-256 hash
// ---------------------------------------------------------------------------
function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// ---------------------------------------------------------------------------
// 2. Seed Users
// ---------------------------------------------------------------------------
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (full_name, email, password_hash, role, shipping_address, phone)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Super Admin
insertUser.run(
  'Adam Nabil',
  'superadmin@longo.com',
  sha256('Super@1234'),
  'super_admin',
  '10 Nile Tower, Zamalek, Cairo, Egypt',
  '+20 100 000 0001'
);

// Regular Admin
insertUser.run(
  'Alex Carter',
  'admin@longo.com',
  sha256('Admin@1234'),
  'admin',
  '15 El-Tahrir St, Downtown Cairo, Egypt',
  '+20 100 123 4567'
);

// Clients
insertUser.run(
  'Sarah Jenkins',
  'sarah@example.com',
  sha256('Client@1234'),
  'client',
  '22 Corniche El Nil, Garden City, Cairo, Egypt',
  '+20 101 987 6543'
);

insertUser.run(
  'Omar Hassan',
  'omar@example.com',
  sha256('Client@1234'),
  'client',
  '8 Road 9, Maadi, Cairo, Egypt',
  '+20 102 555 8888'
);

insertUser.run(
  'Nour El-Din',
  'nour@example.com',
  sha256('Client@1234'),
  'client',
  '5 El Merghany St, Heliopolis, Cairo, Egypt',
  '+20 103 111 2222'
);

console.log('✅ Users seeded');

// ---------------------------------------------------------------------------
// 3. Seed Products
// ---------------------------------------------------------------------------
const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products (name, description, roast_level, origin, category, price_egp, stock_qty, sku, image_path)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const products = [
  // ---- Coffee Beans ----
  {
    name: 'Ethiopia Yirgacheffe',
    description: 'Bright and complex with floral notes of jasmine, citrus zest, and a clean tea-like body. A quintessential light roast showcasing the birthplace of coffee.',
    roast: 'Light', origin: 'Africa', category: 'Beans',
    price: 185, stock: 150, sku: 'ETH-YRG-001', image: '/assets/images/ethiopia-yirgacheffe.png'
  },
  {
    name: 'Colombia Supremo',
    description: 'Rich and balanced with caramel sweetness, mild nuttiness, and a smooth chocolate finish. The gold standard of South American coffee.',
    roast: 'Medium', origin: 'South America', category: 'Beans',
    price: 215, stock: 45, sku: 'COL-SUP-002', image: '/assets/images/colombia-supremo.png'
  },
  {
    name: 'Longo Signature Blend',
    description: 'Our house blend — bold, smoky, and unapologetically rich. Dark cocoa and roasted walnut undertones with a lingering caramel finish.',
    roast: 'Dark', origin: 'Blend', category: 'Beans',
    price: 195, stock: 12, sku: 'LNG-SIG-003', image: '/assets/images/signature-blend.png'
  },
  {
    name: 'Guatemala Antigua',
    description: 'Full-bodied and spicy with notes of dark chocolate, subtle smokiness, and a velvety mouthfeel from volcanic soil cultivation.',
    roast: 'Medium', origin: 'Central America', category: 'Beans',
    price: 210, stock: 89, sku: 'GUA-ANT-004', image: '/assets/images/guatemala-antigua.png'
  },
  {
    name: 'Costa Rica Tarrazu',
    description: 'Crisp and bright with honey-like sweetness, green apple acidity, and a remarkably clean aftertaste. Grown at 1,500m elevation.',
    roast: 'Light', origin: 'Central America', category: 'Beans',
    price: 230, stock: 200, sku: 'CRI-TAR-005', image: '/assets/images/costa-rica-tarrazu.png'
  },
  {
    name: 'Sumatra Mandheling',
    description: 'Earthy, full-bodied, and low-acid with herbal undertones, brown sugar sweetness, and a thick syrupy mouthfeel. Wet-hulled processed.',
    roast: 'Dark', origin: 'Africa', category: 'Beans',
    price: 195, stock: 7, sku: 'SUM-MAN-006', image: '/assets/images/sumatra-mandheling.png'
  },

  // ---- Equipment ----
  {
    name: 'Longo Pour-Over Kit',
    description: 'Professional-grade ceramic dripper with borosilicate glass carafe. Includes 50 unbleached paper filters. Perfect for single-cup brewing.',
    roast: null, origin: '', category: 'Equipment',
    price: 450, stock: 35, sku: 'EQP-POR-007', image: '/assets/images/longo-pour-over-kit.png'
  },
  {
    name: 'Precision Coffee Grinder',
    description: 'Stainless steel burr grinder with 15 grind settings from espresso to French press. Compact design with anti-static container.',
    roast: null, origin: '', category: 'Equipment',
    price: 850, stock: 20, sku: 'EQP-GRN-008', image: '/assets/images/precision-coffee-grinder.png'
  },
  {
    name: 'Gooseneck Kettle',
    description: 'Temperature-controlled electric gooseneck kettle with precision pour spout. 600ml capacity with a real-time temperature display.',
    roast: null, origin: '', category: 'Equipment',
    price: 620, stock: 15, sku: 'EQP-KET-009', image: '/assets/images/gooseneck-kettle.png'
  },

  // ---- Merchandise ----
  {
    name: 'Longo Ceramic Mug',
    description: 'Handcrafted 350ml ceramic mug in matte espresso brown with embossed Longo logo. Microwave and dishwasher safe.',
    roast: null, origin: '', category: 'Merchandise',
    price: 120, stock: 100, sku: 'MER-MUG-010', image: '/assets/images/longo-ceramic-mug.png'
  },
  {
    name: 'Canvas Tote Bag',
    description: 'Organic cotton canvas tote with "Longo Coffee" screen print. Reinforced straps and inner pocket. Perfect for market runs.',
    roast: null, origin: '', category: 'Merchandise',
    price: 85, stock: 75, sku: 'MER-TOT-011', image: '/assets/images/canvas-tote-bag.png'
  },
  {
    name: 'Coffee Lover Gift Box',
    description: 'Curated gift set featuring 2x 100g single-origin samplers, a Longo mug, and artisanal chocolate-covered espresso beans.',
    roast: null, origin: '', category: 'Merchandise',
    price: 350, stock: 30, sku: 'MER-GFT-012', image: '/assets/images/coffee-lover-gift-box.png'
  }
];

products.forEach(p => {
  insertProduct.run(p.name, p.description, p.roast, p.origin, p.category, p.price, p.stock, p.sku, p.image);
});

console.log('✅ Products seeded');

// ---------------------------------------------------------------------------
// 4. Seed Orders (more realistic data)
// ---------------------------------------------------------------------------
const insertOrder = db.prepare(`
  INSERT INTO orders (user_id, status, payment_method, shipping_address_snapshot, total_egp, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertOrderItem = db.prepare(`
  INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase_egp)
  VALUES (?, ?, ?, ?)
`);

// Order 1 — Sarah, Delivered, COD
const order1 = insertOrder.run(3, 'Delivered', 'cod', JSON.stringify({
  name: 'Sarah Jenkins', address: '22 Corniche El Nil, Garden City, Cairo', phone: '+20 101 987 6543'
}), 400, '2026-04-10 09:30:00');
insertOrderItem.run(order1.lastInsertRowid, 1, 1, 185);
insertOrderItem.run(order1.lastInsertRowid, 2, 1, 215);

// Order 2 — Omar, Processing, Online
const order2 = insertOrder.run(4, 'Processing', 'online', JSON.stringify({
  name: 'Omar Hassan', address: '8 Road 9, Maadi, Cairo', phone: '+20 102 555 8888'
}), 420, '2026-04-18 14:15:00');
insertOrderItem.run(order2.lastInsertRowid, 4, 2, 210);

// Order 3 — Sarah, Shipped, Online
const order3 = insertOrder.run(3, 'Shipped', 'online', JSON.stringify({
  name: 'Sarah Jenkins', address: '22 Corniche El Nil, Garden City, Cairo', phone: '+20 101 987 6543'
}), 645, '2026-04-15 11:00:00');
insertOrderItem.run(order3.lastInsertRowid, 3, 1, 195);
insertOrderItem.run(order3.lastInsertRowid, 7, 1, 450);

// Order 4 — Omar, Pending, COD
const order4 = insertOrder.run(4, 'Pending', 'cod', JSON.stringify({
  name: 'Omar Hassan', address: '8 Road 9, Maadi, Cairo', phone: '+20 102 555 8888'
}), 460, '2026-04-21 08:45:00');
insertOrderItem.run(order4.lastInsertRowid, 5, 2, 230);

// Order 5 — Nour, Delivered, Online
const order5 = insertOrder.run(5, 'Delivered', 'online', JSON.stringify({
  name: 'Nour El-Din', address: '5 El Merghany St, Heliopolis, Cairo', phone: '+20 103 111 2222'
}), 1155, '2026-04-05 16:20:00');
insertOrderItem.run(order5.lastInsertRowid, 8, 1, 850);
insertOrderItem.run(order5.lastInsertRowid, 1, 1, 185);
insertOrderItem.run(order5.lastInsertRowid, 10, 1, 120);

// Order 6 — Sarah, Delivered, COD
const order6 = insertOrder.run(3, 'Delivered', 'cod', JSON.stringify({
  name: 'Sarah Jenkins', address: '22 Corniche El Nil, Garden City, Cairo', phone: '+20 101 987 6543'
}), 350, '2026-03-28 10:00:00');
insertOrderItem.run(order6.lastInsertRowid, 12, 1, 350);

// Order 7 — Nour, Processing, Online
const order7 = insertOrder.run(5, 'Processing', 'online', JSON.stringify({
  name: 'Nour El-Din', address: '5 El Merghany St, Heliopolis, Cairo', phone: '+20 103 111 2222'
}), 535, '2026-04-20 09:30:00');
insertOrderItem.run(order7.lastInsertRowid, 11, 1, 85);
insertOrderItem.run(order7.lastInsertRowid, 7, 1, 450);

// Order 8 — Omar, Delivered, COD
const order8 = insertOrder.run(4, 'Delivered', 'cod', JSON.stringify({
  name: 'Omar Hassan', address: '8 Road 9, Maadi, Cairo', phone: '+20 102 555 8888'
}), 390, '2026-03-15 14:00:00');
insertOrderItem.run(order8.lastInsertRowid, 6, 2, 195);

console.log('✅ Orders seeded');

// ---------------------------------------------------------------------------
// 5. Seed Support Tickets
// ---------------------------------------------------------------------------
const insertTicket = db.prepare(`
  INSERT INTO support_tickets (user_id, subject, message, urgency, status, customer_name, customer_email, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertTicketMessage = db.prepare(`
  INSERT INTO ticket_messages (ticket_id, sender_role, message_text, is_internal_note, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

// Ticket 1 — Urgent, missing item
const ticket1 = insertTicket.run(
  3,
  'Missing item in recent order',
  'Hi, I received my order #ORD-0001 today but the Guatemala Antigua beans were missing from the package. The receipt shows them listed. Could you help?',
  'Urgent', 'Open',
  'Sarah Jenkins', 'sarah@example.com',
  '2026-04-19 16:30:00'
);
insertTicketMessage.run(ticket1.lastInsertRowid, 'client',
  'Hi, I received my order #ORD-0001 today but the Guatemala Antigua beans were missing from the package. The receipt shows them listed. Could you help?',
  0, '2026-04-19 16:30:00');
insertTicketMessage.run(ticket1.lastInsertRowid, 'admin',
  'Internal note: Checked warehouse — inventory count mismatch on GUA-ANT-004. Need to verify stock levels.',
  1, '2026-04-19 17:00:00');

// Ticket 2 — Normal, shipping question
const ticket2 = insertTicket.run(
  4,
  'Shipping time to Alexandria',
  'Hello! I want to place a large order but I am based in Alexandria. How long does delivery take outside Cairo? Is there express available?',
  'Normal', 'In Progress',
  'Omar Hassan', 'omar@example.com',
  '2026-04-20 10:15:00'
);
insertTicketMessage.run(ticket2.lastInsertRowid, 'client',
  'Hello! I want to place a large order but I am based in Alexandria. How long does delivery take outside Cairo? Is there express available?',
  0, '2026-04-20 10:15:00');
insertTicketMessage.run(ticket2.lastInsertRowid, 'admin',
  'Hi Omar! Standard shipping to Alexandria takes 5-7 business days. Express is currently available within Cairo and Giza only. We are working on expanding express coverage. Standard delivery for orders over EGP 500 is free!',
  0, '2026-04-20 11:45:00');

// Ticket 3 — Normal, equipment return
const ticket3 = insertTicket.run(
  5,
  'Grinder adjustment issue',
  'The precision grinder I ordered makes a clicking noise on setting 3. Is this normal or should I return it?',
  'Normal', 'Open',
  'Nour El-Din', 'nour@example.com',
  '2026-04-21 09:00:00'
);
insertTicketMessage.run(ticket3.lastInsertRowid, 'client',
  'The precision grinder I ordered makes a clicking noise on setting 3. Is this normal or should I return it?',
  0, '2026-04-21 09:00:00');

console.log('✅ Support tickets seeded');

// ---------------------------------------------------------------------------
// 7. Seed Projects (Financial Initiatives)
// ---------------------------------------------------------------------------
const insertProject = db.prepare(`
  INSERT OR IGNORE INTO projects (name, capex_egp, projected_roi_pct, status, notes)
  VALUES (?, ?, ?, ?, ?)
`);

insertProject.run('Roastery Expansion Phase II', 250000, 22.4, 'Active', 'Expanding roastery capacity to meet growing demand');
insertProject.run('Direct Trade Partnership Program', 85000, 15.2, 'Review', 'Direct relationships with Ethiopian and Colombian farmers');
insertProject.run('Retail Packaging Redesign', 45000, 9.8, 'Planned', 'Eco-friendly packaging that reinforces brand identity');

console.log('✅ Projects seeded');

// ---------------------------------------------------------------------------
console.log('\n🎉 Database setup complete!\n');
console.log('  Super Admin login: superadmin@longo.com / Super@1234');
console.log('  Admin login: admin@longo.com / Admin@1234');
console.log('  Client login: sarah@example.com / Client@1234');
console.log('  Client login: omar@example.com / Client@1234');
console.log('  Client login: nour@example.com / Client@1234\n');
