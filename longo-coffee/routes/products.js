const express = require('express');
const path    = require('path');
const multer  = require('multer');
const db      = require('../database/db');
const adminGuard = require('../middleware/adminGuard');

const router = express.Router();

// ── Migration: add cost_egp if not present ────────────────────────────────────
try { db.exec('ALTER TABLE products ADD COLUMN cost_egp REAL DEFAULT 0'); } catch (_) {}

// ── Multer ────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'assets', 'images')),
  filename:    (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '-').replace(/-+/g, '-').toLowerCase();
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
  allowed.includes(path.extname(file.originalname).toLowerCase()) ? cb(null, true) : cb(new Error('Only image files are allowed'), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ── GET /api/products ─────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const { roast, origin, category, include_inactive, search, inStock, maxPrice } = req.query;
    let query    = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    const role    = req.session && req.session.user && req.session.user.role;
    const isAdmin = role === 'admin' || role === 'super_admin';
    if (!isAdmin || include_inactive !== 'true') query += ' AND is_active = 1';

    if (search)   { query += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (roast)    { query += ' AND roast_level = ?'; params.push(roast); }
    if (origin)   { query += ' AND origin = ?';      params.push(origin); }
    if (category) { query += ' AND category = ?';    params.push(category); }
    if (inStock === '1') query += ' AND stock_qty > 0';
    if (maxPrice) { query += ' AND price_egp <= ?';  params.push(parseFloat(maxPrice)); }

    query += ' ORDER BY id DESC';
    res.json(db.prepare(query).all(...params));
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ── GET /api/products/:id ─────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ── POST /api/products ────────────────────────────────────────────────────────
router.post('/', adminGuard, upload.single('image'), (req, res) => {
  const { name, description, roast_level, origin, category,
          price_egp, cost_egp, stock_qty, sku, image_path,
          material, weight, color, size } = req.body;

  if (!name || !price_egp) return res.status(400).json({ error: 'Name and price are required' });

  const finalImagePath = req.file ? `/assets/images/${req.file.filename}` : (image_path || null);

  try {
    const info = db.prepare(`
      INSERT INTO products
        (name, description, roast_level, origin, category, price_egp, cost_egp,
         stock_qty, sku, image_path, material, weight, color, size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, description || '', roast_level || null, origin || '',
      category || 'Beans', parseFloat(price_egp), parseFloat(cost_egp) || 0,
      stock_qty || 0, sku || null, finalImagePath,
      material || null, weight || null, color || null, size || null
    );
    res.status(201).json({ success: true, id: info.lastInsertRowid });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// ── PUT /api/products/:id ─────────────────────────────────────────────────────
router.put('/:id', adminGuard, upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { name, description, roast_level, origin, category,
          price_egp, cost_egp, stock_qty, sku, image_path,
          material, weight, color, size } = req.body;

  const finalImagePath = req.file ? `/assets/images/${req.file.filename}` : (image_path || null);

  try {
    const info = db.prepare(`
      UPDATE products
      SET name = ?, description = ?, roast_level = ?, origin = ?, category = ?,
          price_egp = ?, cost_egp = ?, stock_qty = ?, sku = ?, image_path = ?,
          material = ?, weight = ?, color = ?, size = ?
      WHERE id = ?
    `).run(
      name, description || '', roast_level || null, origin || '',
      category || 'Beans', parseFloat(price_egp), parseFloat(cost_egp) || 0,
      stock_qty || 0, sku || null, finalImagePath,
      material || null, weight || null, color || null, size || null,
      id
    );
    if (info.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// ── POST /api/products/:id/image ──────────────────────────────────────────────
router.post('/:id/image', adminGuard, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });
  const imagePath = `/assets/images/${req.file.filename}`;
  try {
    const info = db.prepare('UPDATE products SET image_path = ? WHERE id = ?').run(imagePath, req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, image_path: imagePath });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// ── DELETE /api/products/:id ──────────────────────────────────────────────────
router.delete('/:id', adminGuard, (req, res) => {
  const { id } = req.params;
  try {
    const product = db.prepare('SELECT is_active FROM products WHERE id = ?').get(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.is_active) {
      db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(id);
      return res.json({ success: true, action: 'deactivated' });
    } else {
      db.prepare('DELETE FROM products WHERE id = ?').run(id);
      return res.json({ success: true, action: 'deleted' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
