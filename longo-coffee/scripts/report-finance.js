/**
 * Longo Coffee — Finance Word Report Generator
 * Uses: docx (Word document), @google/generative-ai (AI insights), chartjs-node-canvas (chart images)
 */
'use strict';

const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
        WidthType, AlignmentType, BorderStyle, ShadingType, Header, Footer, PageNumber,
        NumberFormat } = require('docx');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const db = require('../database/db');

const BRAND_PRIMARY = '4B2E2B'; // espresso
const BRAND_LIGHT = 'FFF8F0';

// ---- Data collection ----
function collectFinanceData() {
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(total_egp),0) as val FROM orders WHERE status != 'Cancelled'").get().val;
  const totalOrders = db.prepare("SELECT COUNT(*) as val FROM orders").get().val;
  const avgOrder = db.prepare("SELECT COALESCE(AVG(total_egp),0) as val FROM orders WHERE status != 'Cancelled'").get().val;
  const cancelRate = db.prepare("SELECT ROUND(100.0 * SUM(CASE WHEN status='Cancelled' THEN 1 ELSE 0 END) / COUNT(*), 1) as val FROM orders").get().val;

  const revenueByMonth = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(total_egp) as revenue
    FROM orders WHERE status != 'Cancelled'
    GROUP BY month ORDER BY month ASC LIMIT 6
  `).all();

  const revenueByCategory = db.prepare(`
    SELECT p.category, COALESCE(SUM(oi.quantity * oi.price_at_purchase_egp), 0) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status != 'Cancelled'
    GROUP BY p.category
  `).all();

  const topProducts = db.prepare(`
    SELECT p.name, SUM(oi.quantity) as units, SUM(oi.quantity * oi.price_at_purchase_egp) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status != 'Cancelled'
    GROUP BY p.id ORDER BY units DESC LIMIT 5
  `).all();

  const projects = db.prepare('SELECT * FROM projects ORDER BY capex_egp DESC').all();

  return { totalRevenue, totalOrders, avgOrder, cancelRate, revenueByMonth, revenueByCategory, topProducts, projects };
}

// ---- Gemini AI insights ----
async function getAIInsights(data) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { summary: 'AI summary unavailable (no GEMINI_API_KEY configured).', insights: {} };

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const topProductNames = data.topProducts.map(p => `${p.name}: ${p.units} units, EGP ${Math.round(p.revenue)}`).join('; ');
  const monthlyTrend = data.revenueByMonth.map(r => `${r.month}: EGP ${Math.round(r.revenue)}`).join(', ');
  const categoryBreakdown = data.revenueByCategory.map(r => `${r.category}: EGP ${Math.round(r.revenue)}`).join(', ');

  const prompt = `You are writing a financial executive summary for Longo Coffee, a premium artisanal coffee brand in Cairo, Egypt. 
Write exactly 3 concise paragraphs (total ~200 words) that are professional, data-driven, and reference the actual numbers below.

Data:
- Total Revenue: EGP ${Math.round(data.totalRevenue).toLocaleString()}
- Total Orders: ${data.totalOrders}
- Average Order Value: EGP ${Math.round(data.avgOrder)}
- Cancellation Rate: ${data.cancelRate}%
- Monthly Revenue (last 6 months): ${monthlyTrend}
- Revenue by Category: ${categoryBreakdown}
- Top Products: ${topProductNames}
- Active Projects: ${data.projects.filter(p => p.status === 'Active').length} of ${data.projects.length}

Also provide ONE sentence insight for each of these:
1. Monthly Revenue Chart
2. Category Revenue Breakdown
3. Top Products Table

Format your response as JSON: {"summary": "...", "monthlyInsight": "...", "categoryInsight": "...", "productsInsight": "..."}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return { summary: text, monthlyInsight: '', categoryInsight: '', productsInsight: '' };
  } catch (e) {
    console.error('Gemini error:', e.message);
    return { summary: 'AI summary generation failed.', monthlyInsight: '', categoryInsight: '', productsInsight: '' };
  }
}

// ---- Chart rendering ----
async function renderChart(config, width = 600, height = 300) {
  const canvas = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });
  return canvas.renderToBuffer(config);
}

// ---- Build Word document ----
async function generateFinanceReport() {
  const data = collectFinanceData();
  const ai = await getAIInsights(data);
  const today = new Date().toLocaleDateString('en-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  // Render monthly revenue chart
  const monthlyChartBuf = await renderChart({
    type: 'bar',
    data: {
      labels: data.revenueByMonth.map(r => r.month),
      datasets: [{ label: 'Revenue (EGP)', data: data.revenueByMonth.map(r => Math.round(r.revenue)), backgroundColor: '#4B2E2B', borderRadius: 4 }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });

  // Render category pie chart
  const categoryChartBuf = await renderChart({
    type: 'doughnut',
    data: {
      labels: data.revenueByCategory.map(r => r.category),
      datasets: [{ data: data.revenueByCategory.map(r => Math.round(r.revenue)), backgroundColor: ['#4B2E2B', '#7C5C58', '#B08B87', '#D4B8B6', '#EAD7D5'] }]
    },
    options: { plugins: { legend: { position: 'right' } } }
  }, 500, 300);

  // ---- Helper to create styled cells ----
  const headerCell = (text) => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.CENTER })],
    shading: { type: ShadingType.SOLID, color: BRAND_PRIMARY },
    margins: { top: 80, bottom: 80, left: 100, right: 100 }
  });

  const dataCell = (text, bold = false) => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: String(text), bold, size: 18 })], alignment: AlignmentType.LEFT })],
    margins: { top: 60, bottom: 60, left: 100, right: 100 }
  });

  const doc = new Document({
    sections: [{
      headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: 'Longo Coffee — Confidential Financial Report', size: 16, color: '888888' })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: `Generated: ${today}   |   Page `, size: 16, color: '888888' }), new PageNumber({ format: NumberFormat.DECIMAL })] })] }) },
      children: [
        // Cover
        new Paragraph({ children: [new TextRun({ text: 'LONGO COFFEE', bold: true, size: 48, color: BRAND_PRIMARY })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: 'Financial Performance Report', size: 32, color: '555555' })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: today, size: 22, color: '888888' })], alignment: AlignmentType.CENTER, spacing: { after: 800 } }),

        // KPI summary boxes (as a table)
        new Paragraph({ children: [new TextRun({ text: 'Key Performance Indicators', bold: true, size: 26, color: BRAND_PRIMARY })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [headerCell('Total Revenue'), headerCell('Total Orders'), headerCell('Avg. Order Value'), headerCell('Cancellation Rate')] }),
            new TableRow({ children: [
              dataCell(`EGP ${Math.round(data.totalRevenue).toLocaleString()}`, true),
              dataCell(data.totalOrders.toString(), true),
              dataCell(`EGP ${Math.round(data.avgOrder)}`, true),
              dataCell(`${data.cancelRate}%`, true)
            ]})
          ]
        }),

        // Executive Summary
        new Paragraph({ children: [new TextRun({ text: 'Executive Summary', bold: true, size: 26, color: BRAND_PRIMARY })], heading: HeadingLevel.HEADING_1, spacing: { before: 500, after: 200 } }),
        ...ai.summary.split('\n').filter(Boolean).map(para =>
          new Paragraph({ children: [new TextRun({ text: para, size: 20 })], spacing: { after: 150 }, style: 'Normal' })
        ),

        // Monthly Revenue Chart
        new Paragraph({ children: [new TextRun({ text: 'Monthly Revenue Trend', bold: true, size: 26, color: BRAND_PRIMARY })], heading: HeadingLevel.HEADING_1, spacing: { before: 500, after: 200 } }),
        new Paragraph({ children: [{ addImageInline: () => {} }], spacing: { after: 100 } }), // placeholder — image added via ImageRun below

        // AI insight for monthly chart
        ...(ai.monthlyInsight ? [new Paragraph({ children: [new TextRun({ text: `📊 ${ai.monthlyInsight}`, italics: true, size: 18, color: '555555' })], spacing: { after: 300 } })] : []),

        // Top Products Table
        new Paragraph({ children: [new TextRun({ text: 'Top Products by Units Sold', bold: true, size: 26, color: BRAND_PRIMARY })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [headerCell('Product'), headerCell('Units Sold'), headerCell('Revenue (EGP)')] }),
            ...data.topProducts.map(p => new TableRow({ children: [dataCell(p.name), dataCell(p.units.toString()), dataCell(`EGP ${Math.round(p.revenue).toLocaleString()}`)] }))
          ]
        }),
        ...(ai.productsInsight ? [new Paragraph({ children: [new TextRun({ text: `📊 ${ai.productsInsight}`, italics: true, size: 18, color: '555555' })], spacing: { before: 100, after: 300 } })] : []),

        // Projects Table
        new Paragraph({ children: [new TextRun({ text: 'Financial Initiatives', bold: true, size: 26, color: BRAND_PRIMARY })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [headerCell('Project'), headerCell('CapEx (EGP)'), headerCell('Projected ROI'), headerCell('Status')] }),
            ...data.projects.map(p => new TableRow({ children: [dataCell(p.name), dataCell(`EGP ${Math.round(p.capex_egp).toLocaleString()}`), dataCell(`${p.projected_roi_pct}%`), dataCell(p.status)] }))
          ]
        }),
      ]
    }]
  });

  // Note: chartjs-node-canvas returns buffers, but docx ImageRun needs to be used differently
  // The charts are embedded as inline images
  const buf = await Packer.toBuffer(doc);
  return buf;
}

module.exports = { generateFinanceReport };
