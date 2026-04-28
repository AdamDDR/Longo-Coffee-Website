/**
 * Longo Coffee — Finance Word Report Generator
 */
'use strict';

const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
        WidthType, AlignmentType, BorderStyle, ShadingType, Header, Footer, PageNumber,
        NumberFormat, ImageRun } = require('docx');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const db = require('../database/db');

const BRAND_PRIMARY = '4B2E2B';
const BRAND_LIGHT  = 'FFF8F0';

// ---- Data collection ----
function collectFinanceData() {
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(total_egp),0) as val FROM orders WHERE status != 'Cancelled'").get().val;
  const totalOrders  = db.prepare("SELECT COUNT(*) as val FROM orders").get().val;
  const avgOrder     = db.prepare("SELECT COALESCE(AVG(total_egp),0) as val FROM orders WHERE status != 'Cancelled'").get().val;
  const cancelRate   = db.prepare("SELECT ROUND(100.0 * SUM(CASE WHEN status='Cancelled' THEN 1 ELSE 0 END) / COUNT(*), 1) as val FROM orders").get().val;

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

// ---- Local fallback summary (used when Gemini is unavailable) ----
function buildFinanceFallback(data) {
  const bestMonth    = [...data.revenueByMonth].sort((a, b) => (b.revenue || 0) - (a.revenue || 0))[0];
  const bestCategory = [...data.revenueByCategory].sort((a, b) => (b.revenue || 0) - (a.revenue || 0))[0];
  const top          = data.topProducts[0];
  const activeProjects = data.projects.filter(p => p.status === 'Active').length;

  const summary = [
    `Longo Coffee has generated EGP ${Math.round(data.totalRevenue).toLocaleString()} in total revenue across ${data.totalOrders} recorded orders, with an average order value of EGP ${Math.round(data.avgOrder)}. The current cancellation rate stands at ${data.cancelRate}%, which provides a key signal for checkout and fulfillment performance.`,
    bestMonth
      ? `The strongest recorded month is ${bestMonth.month}, contributing EGP ${Math.round(bestMonth.revenue).toLocaleString()} in revenue. ${bestCategory ? `The ${bestCategory.category} category is the top revenue segment with EGP ${Math.round(bestCategory.revenue).toLocaleString()}, indicating where customer demand is currently concentrated.` : ''}`
      : 'Monthly revenue data is currently limited — trend analysis will improve as more order history accumulates.',
    top
      ? `${top.name} is the leading product with ${top.units} units sold and EGP ${Math.round(top.revenue).toLocaleString()} in revenue. There are ${activeProjects} active financial initiatives out of ${data.projects.length} total tracked projects, providing clear visibility into live investment activity.`
      : `There are ${activeProjects} active financial initiatives out of ${data.projects.length} total tracked projects, providing clear visibility into live investment activity.`
  ].join('\n\n');

  const monthlyInsight = bestMonth
    ? `${bestMonth.month} is the peak revenue month in this report, suggesting a seasonal or promotional spike worth investigating further.`
    : 'Monthly revenue data is currently too limited to identify a clear peak month.';

  const categoryInsight = bestCategory
    ? `${bestCategory.category} is the top-performing category by revenue, making it the primary driver of the current sales mix.`
    : 'Category revenue data is not sufficient to identify a leading segment at this time.';

  const productsInsight = top
    ? `${top.name} leads by unit volume, confirming it as the highest-demand product in the current portfolio.`
    : 'Top-product sales data is not currently sufficient to identify a leading item.';

  return { summary, monthlyInsight, categoryInsight, productsInsight };
}

// ---- Gemini AI insights ----
async function getAIInsights(data) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return buildFinanceFallback(data);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const topProductNames  = data.topProducts.map(p => `${p.name}: ${p.units} units, EGP ${Math.round(p.revenue)}`).join('; ');
    const monthlyTrend     = data.revenueByMonth.map(r => `${r.month}: EGP ${Math.round(r.revenue)}`).join(', ');
    const categoryBreakdown = data.revenueByCategory.map(r => `${r.category}: EGP ${Math.round(r.revenue)}`).join(', ');

    const prompt = `You are writing a financial executive summary for Longo Coffee, a premium artisanal coffee brand in Cairo, Egypt.
Write exactly 3 concise paragraphs (170-220 words total) that are professional, data-driven, and reference the actual numbers below.
Do not use generic filler — every claim must be tied to the data.

Data:
- Total Revenue: EGP ${Math.round(data.totalRevenue).toLocaleString()}
- Total Orders: ${data.totalOrders}
- Average Order Value: EGP ${Math.round(data.avgOrder)}
- Cancellation Rate: ${data.cancelRate}%
- Monthly Revenue (last 6 months): ${monthlyTrend}
- Revenue by Category: ${categoryBreakdown}
- Top Products: ${topProductNames}
- Active Projects: ${data.projects.filter(p => p.status === 'Active').length} of ${data.projects.length}

Also provide ONE sentence insight for each:
1. Monthly Revenue Chart
2. Category Revenue Breakdown
3. Top Products Table

Return valid JSON only, no markdown:
{"summary":"...","monthlyInsight":"...","categoryInsight":"...","productsInsight":"..."}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return buildFinanceFallback(data);
  } catch (e) {
    console.error('Gemini error:', e.message);
    return buildFinanceFallback(data);
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
  const ai   = await getAIInsights(data);
  const today = new Date().toLocaleDateString('en-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  // Charts
  const monthlyChartBuf = await renderChart({
    type: 'bar',
    data: {
      labels: data.revenueByMonth.map(r => r.month),
      datasets: [{ label: 'Revenue (EGP)', data: data.revenueByMonth.map(r => Math.round(r.revenue)), backgroundColor: '#4B2E2B', borderRadius: 4 }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  }, 600, 300);

  const categoryChartBuf = await renderChart({
    type: 'doughnut',
    data: {
      labels: data.revenueByCategory.map(r => r.category),
      datasets: [{ data: data.revenueByCategory.map(r => Math.round(r.revenue)), backgroundColor: ['#4B2E2B', '#7C5C58', '#B08B87', '#D4B8B6', '#EAD7D5'] }]
    },
    options: { plugins: { legend: { position: 'right' } } }
  }, 500, 300);

  // Cell helpers
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
      headers: {
        default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: 'Longo Coffee — Confidential Financial Report', size: 16, color: '888888' })] })] })
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: `Generated: ${today}   |   Page `, size: 16, color: '888888' }), new PageNumber({ format: NumberFormat.DECIMAL })] })] })
      },
      children: [
        // Cover
        new Paragraph({ children: [new TextRun({ text: 'LONGO COFFEE', bold: true, size: 48, color: BRAND_PRIMARY })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: 'Financial Performance Report', size: 32, color: '555555' })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: today, size: 22, color: '888888' })], alignment: AlignmentType.CENTER, spacing: { after: 800 } }),

        // KPIs
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
          new Paragraph({ children: [new TextRun({ text: para, size: 20 })], spacing: { after: 150 } })
        ),

        // Monthly Revenue Chart
        new Paragraph({ children: [new TextRun({ text: 'Monthly Revenue Trend', bold: true, size: 26, color: BRAND_PRIMARY })], heading: HeadingLevel.HEADING_1, spacing: { before: 500, after: 200 } }),
        new Paragraph({
          children: [new ImageRun({ data: monthlyChartBuf, transformation: { width: 520, height: 260 } })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        ...(ai.monthlyInsight ? [new Paragraph({ children: [new TextRun({ text: `📊 ${ai.monthlyInsight}`, italics: true, size: 18, color: '555555' })], spacing: { after: 300 } })] : []),

        // Category Revenue Chart
        new Paragraph({ children: [new TextRun({ text: 'Revenue by Category', bold: true, size: 26, color: BRAND_PRIMARY })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Paragraph({
          children: [new ImageRun({ data: categoryChartBuf, transformation: { width: 460, height: 276 } })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        ...(ai.categoryInsight ? [new Paragraph({ children: [new TextRun({ text: `📊 ${ai.categoryInsight}`, italics: true, size: 18, color: '555555' })], spacing: { after: 300 } })] : []),

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

        // Financial Initiatives Table
        new Paragraph({ children: [new TextRun({ text: 'Financial Initiatives', bold: true, size: 26, color: BRAND_PRIMARY })], heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [headerCell('Project'), headerCell('CapEx (EGP)'), headerCell('Projected ROI'), headerCell('Status')] }),
            ...data.projects.map(p => new TableRow({ children: [
              dataCell(p.name),
              dataCell(`EGP ${Math.round(p.capex_egp).toLocaleString()}`),
              dataCell(`${p.projected_roi_pct}%`),
              dataCell(p.status)
            ]}))
          ]
        }),
      ]
    }]
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateFinanceReport };