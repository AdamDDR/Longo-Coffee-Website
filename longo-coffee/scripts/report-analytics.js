/**
 * Longo Coffee — Analytics Word Report Generator
 */
'use strict';

const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
        WidthType, AlignmentType, ShadingType, Header, Footer, PageNumber,
        NumberFormat, ImageRun } = require('docx');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const db = require('../database/db');

const BRAND_PRIMARY = '4B2E2B';

// ---- Data collection ----
function collectAnalyticsData() {
  const ordersByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM orders GROUP BY status
  `).all();

  const topProducts = db.prepare(`
    SELECT p.name, p.category, SUM(oi.quantity) as total_sold,
           ROUND(SUM(oi.quantity * oi.price_at_purchase_egp), 0) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status != 'Cancelled'
    GROUP BY p.id ORDER BY total_sold DESC LIMIT 8
  `).all();

  const revenueByCategory = db.prepare(`
    SELECT p.category, SUM(oi.quantity * oi.price_at_purchase_egp) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status != 'Cancelled'
    GROUP BY p.category
  `).all();

  const conversionData = db.prepare(`
    SELECT DATE(created_at) as day, COUNT(*) as orders, SUM(total_egp) as revenue
    FROM orders WHERE created_at >= DATE('now', '-30 days')
    GROUP BY day ORDER BY day ASC
  `).all();

  const inventoryLevels = db.prepare(`
    SELECT name, category, stock_qty FROM products WHERE is_active = 1 ORDER BY stock_qty ASC LIMIT 10
  `).all();

  const totalCustomers = db.prepare("SELECT COUNT(*) as val FROM users WHERE role = 'client'").get().val;
  const newCustomers30d = db.prepare("SELECT COUNT(*) as val FROM users WHERE role = 'client' AND created_at >= DATE('now', '-30 days')").get().val;
  const activeProducts = db.prepare("SELECT COUNT(*) as val FROM products WHERE is_active = 1").get().val;
  const lowStock = db.prepare("SELECT COUNT(*) as val FROM products WHERE is_active = 1 AND stock_qty < 20").get().val;

  return { ordersByStatus, topProducts, revenueByCategory, conversionData, inventoryLevels, totalCustomers, newCustomers30d, activeProducts, lowStock };
}

// ---- Local fallback summary (used when Gemini is unavailable) ----
function buildAnalyticsFallback(data) {
  const totalOrders30d = data.conversionData.reduce((sum, d) => sum + (d.orders || 0), 0);
  const top = data.topProducts[0];
  const critical = data.inventoryLevels.filter(i => i.stock_qty === 0).length;
  const low = data.inventoryLevels.filter(i => i.stock_qty > 0 && i.stock_qty < 20).length;

  const summary = [
    `Longo Coffee currently serves ${data.totalCustomers} registered customers, with ${data.newCustomers30d} new accounts created in the last 30 days. Over the same period, the platform recorded ${totalOrders30d} orders, reflecting active storefront engagement and consistent customer activity.`,
    top
      ? `Product performance is led by ${top.name} (${top.category}), which sold ${top.total_sold} units and generated EGP ${Math.round(top.revenue).toLocaleString()} in revenue. The catalog currently contains ${data.activeProducts} active products, providing a strong range of options across the storefront.`
      : `The catalog currently contains ${data.activeProducts} active products across the store, maintaining solid variety for customers.`,
    `Inventory health shows ${data.lowStock} products below the low-stock threshold, including ${critical} out-of-stock items and ${low} needing immediate restocking. Prompt replenishment action is recommended to avoid stockouts and maintain fulfillment quality.`
  ].join('\n\n');

  const largestStatus = [...data.ordersByStatus].sort((a, b) => b.count - a.count)[0];
  const ordersInsight = largestStatus
    ? `${largestStatus.status} is the dominant order status with ${largestStatus.count} orders, representing the primary state in the current fulfillment pipeline.`
    : 'Order status data is currently too limited to identify a dominant trend.';

  const productsInsight = top
    ? `${top.name} leads product activity by unit volume, making it the strongest short-term contributor to inventory movement.`
    : 'Top-product sales data is not currently available.';

  const inventoryInsight = data.lowStock > 0
    ? `${data.lowStock} products are below the restock threshold — replenishment should be prioritized to reduce stockout risk.`
    : 'All active products are currently above the low-stock threshold, indicating stable inventory coverage.';

  return { summary, ordersInsight, productsInsight, inventoryInsight };
}

// ---- Gemini AI insights ----
async function getAIInsights(data) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return buildAnalyticsFallback(data);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const statusSummary = data.ordersByStatus.map(s => `${s.status}: ${s.count}`).join(', ');
    const topProds = data.topProducts
      .map(p => `${p.name} (${p.category}): ${p.total_sold} units, EGP ${Math.round(p.revenue)}`)
      .join('; ');
    const lowStockItems = data.inventoryLevels
      .filter(i => i.stock_qty < 20)
      .map(i => `${i.name}: ${i.stock_qty} units`)
      .join(', ');

    const prompt = `You are writing an analytics executive summary for Longo Coffee, a premium artisanal coffee brand in Cairo, Egypt.
Write exactly 3 concise paragraphs (170-220 words total) covering customer behavior, product performance, and inventory health.
Be specific — reference the actual numbers provided below.

Data:
- Total Customers: ${data.totalCustomers} (${data.newCustomers30d} new in last 30 days)
- Order Status Breakdown: ${statusSummary}
- Top Products by Volume: ${topProds}
- Active Products: ${data.activeProducts} (${data.lowStock} with low stock)
- Low Stock Items: ${lowStockItems || 'None'}
- 30-day Order Volume: ${data.conversionData.reduce((a, d) => a + d.orders, 0)} orders

Also provide ONE sentence insight for each:
1. Orders by Status (pie chart)
2. Top Products by Units Sold (bar chart)
3. Inventory Levels (table)

Return valid JSON only, no markdown:
{"summary":"...","ordersInsight":"...","productsInsight":"...","inventoryInsight":"..."}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return buildAnalyticsFallback(data);
  } catch (e) {
    console.error('Gemini error:', e.message);
    return buildAnalyticsFallback(data);
  }
}

// ---- Chart rendering ----
async function renderChart(config, width = 600, height = 300) {
  const canvas = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });
  return canvas.renderToBuffer(config);
}

// ---- Build Word document ----
async function generateAnalyticsReport() {
  const data = collectAnalyticsData();
  const ai = await getAIInsights(data);
  const today = new Date().toLocaleDateString('en-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  const orderStatusChartBuf = await renderChart({
    type: 'pie',
    data: {
      labels: data.ordersByStatus.map(s => s.status),
      datasets: [{ data: data.ordersByStatus.map(s => s.count), backgroundColor: ['#4B2E2B', '#7C5C58', '#B08B87', '#D4B8B6', '#EAD7D5', '#F5EDEA'] }]
    },
    options: { plugins: { legend: { position: 'right' } } }
  }, 500, 300);

  const topProductsChartBuf = await renderChart({
    type: 'bar',
    data: {
      labels: data.topProducts.slice(0, 5).map(p => p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name),
      datasets: [{ label: 'Units Sold', data: data.topProducts.slice(0, 5).map(p => p.total_sold), backgroundColor: '#4B2E2B', borderRadius: 4 }]
    },
    options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
  }, 600, 300);

  const headerCell = (text) => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.CENTER })],
    shading: { type: ShadingType.SOLID, color: BRAND_PRIMARY },
    margins: { top: 80, bottom: 80, left: 100, right: 100 }
  });

  const dataCell = (text, bold = false) => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: String(text), bold, size: 18 })] })],
    margins: { top: 60, bottom: 60, left: 100, right: 100 }
  });

  const doc = new Document({
    sections: [{
      headers: {
        default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: 'Longo Coffee — Analytics Report — Confidential', size: 16, color: '888888' })] })] })
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: `Generated: ${today}   |   Page `, size: 16, color: '888888' }), new PageNumber({ format: NumberFormat.DECIMAL })] })] })
      },
      children: [
        // Cover
        new Paragraph({ children: [new TextRun({ text: 'LONGO COFFEE', bold: true, size: 48, color: BRAND_PRIMARY })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: 'Analytics & Operations Report', size: 32, color: '555555' })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: today, size: 22, color: '888888' })], alignment: AlignmentType.CENTER, spacing: { after: 800 } }),

        // KPI table
        new Paragraph({ children: [new TextRun({ text: 'Key Metrics Overview', bold: true, size: 26, color: BRAND_PRIMARY })], heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [headerCell('Total Customers'), headerCell('New (30d)'), headerCell('Active Products'), headerCell('Low Stock')] }),
            new TableRow({ children: [dataCell(data.totalCustomers.toString(), true), dataCell(data.newCustomers30d.toString(), true), dataCell(data.activeProducts.toString(), true), dataCell(data.lowStock.toString(), true)] })
          ]
        }),

        // Executive Summary
        new Paragraph({ children: [new TextRun({ text: 'Executive Summary', bold: true, size: 26, color: BRAND_PRIMARY })], heading: HeadingLevel.HEADING_1, spacing: { before: 500, after: 200 } }),
        ...ai.summary.split('\n').filter(Boolean).map(para =>
          new Paragraph({ children: [new TextRun({ text: para, size: 20 })], spacing: { after: 150 } })
        ),

        // Orders by Status — chart + table
        new Paragraph({ children: [new TextRun({ text: 'Orders by Status', bold: true, size: 26, color: BRAND_PRIMARY })], heading: HeadingLevel.HEADING_1, spacing: { before: 500, after: 200 } }),
        new Paragraph({
          children: [new ImageRun({ data: orderStatusChartBuf, transformation: { width: 420, height: 252 } })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 150 }
        }),
        new Table({
          width: { size: 50, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [headerCell('Status'), headerCell('Count')] }),
            ...data.ordersByStatus.map(s => new TableRow({ children: [dataCell(s.status), dataCell(s.count.toString())] }))
          ]
        }),
        ...(ai.ordersInsight ? [new Paragraph({ children: [new TextRun({ text: `📊 ${ai.ordersInsight}`, italics: true, size: 18, color: '555555' })], spacing: { before: 100, after: 300 } })] : []),

        // Top Products — chart + table
        new Paragraph({ children: [new TextRun({ text: 'Top Products by Volume', bold: true, size: 26, color: BRAND_PRIMARY })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Paragraph({
          children: [new ImageRun({ data: topProductsChartBuf, transformation: { width: 520, height: 260 } })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 150 }
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [headerCell('Product'), headerCell('Category'), headerCell('Units Sold'), headerCell('Revenue (EGP)')] }),
            ...data.topProducts.map(p => new TableRow({ children: [dataCell(p.name), dataCell(p.category), dataCell(p.total_sold.toString()), dataCell(`EGP ${Math.round(p.revenue).toLocaleString()}`)] }))
          ]
        }),
        ...(ai.productsInsight ? [new Paragraph({ children: [new TextRun({ text: `📊 ${ai.productsInsight}`, italics: true, size: 18, color: '555555' })], spacing: { before: 100, after: 300 } })] : []),

        // Inventory
        new Paragraph({ children: [new TextRun({ text: 'Inventory Levels', bold: true, size: 26, color: BRAND_PRIMARY })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [headerCell('Product'), headerCell('Category'), headerCell('Stock Qty'), headerCell('Status')] }),
            ...data.inventoryLevels.map(p => {
              const status = p.stock_qty === 0 ? 'Out of Stock' : p.stock_qty < 10 ? 'Critical' : p.stock_qty < 20 ? 'Low' : 'OK';
              return new TableRow({ children: [dataCell(p.name), dataCell(p.category), dataCell(p.stock_qty.toString()), dataCell(status)] });
            })
          ]
        }),
        ...(ai.inventoryInsight ? [new Paragraph({ children: [new TextRun({ text: `📊 ${ai.inventoryInsight}`, italics: true, size: 18, color: '555555' })], spacing: { before: 100, after: 300 } })] : []),
      ]
    }]
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateAnalyticsReport };