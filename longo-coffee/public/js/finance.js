/**
 * Longo Coffee — Financial Formulas (CN4005 Mental Wealth)
 */

window.FinanceEngine = {
  
  /**
   * Net Cash Flow = Benefits - Costs
   */
  netCashFlow: function(benefits, costs) {
    return benefits - costs;
  },

  /**
   * Cumulative Cash Flow = Running sum of net cash flows
   */
  cumulativeCashFlow: function(cashFlows) {
    let runningSum = 0;
    return cashFlows.map(cf => {
      runningSum += cf;
      return runningSum;
    });
  },

  /**
   * Payback Period = Year before recovery + (Remaining / Net CF in recovery year)
   * Expected inputs: Initial Investment (positive number), Array of subsequent cash flows
   */
  paybackPeriod: function(investment, cashFlows) {
    let cumulative = -investment;
    
    for (let year = 0; year < cashFlows.length; year++) {
      let nextCumulative = cumulative + cashFlows[year];
      
      if (nextCumulative >= 0) {
        // Recovered during this year
        let fraction = Math.abs(cumulative) / cashFlows[year];
        return year + fraction;
      }
      cumulative = nextCumulative;
    }
    return null; // Not recovered
  },

  /**
   * NPV = Sum of [ CF_t / (1+r)^t ] - Initial Investment
   */
  npv: function(rate, investment, cashFlows) {
    let npv = -investment;
    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + rate, t + 1);
    }
    return npv;
  },

  /**
   * ROI = (Total Discounted Benefits - Total Discounted Costs) / Discounted Costs
   */
  roi: function(discountRate, initialCost, benefits, costs) {
    let pvBenefits = 0;
    let pvCosts = initialCost;

    for (let t = 0; t < benefits.length; t++) {
      pvBenefits += benefits[t] / Math.pow(1 + discountRate, t + 1);
      if (costs && costs[t]) {
        pvCosts += costs[t] / Math.pow(1 + discountRate, t + 1);
      }
    }

    return (pvBenefits - pvCosts) / pvCosts;
  },

  /**
   * Weighted Score = Sum of (Weight_i * Score_i)
   * Expects array of objects: { weight: 0.X, score: Y }
   */
  weightedScore: function(criteria) {
    return criteria.reduce((sum, item) => sum + (item.weight * item.score), 0);
  },

  /**
   * Format EGP
   */
  formatEGP: function(value) {
    return `EGP ${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  }
};

/**
 * PDF Export using jsPDF and html2canvas
 */
window.exportToPDF = async function(elementId, filename = 'Longo_Financial_Report.pdf') {
  if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
    alert('PDF export libraries not loaded.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const element = document.getElementById(elementId);
  
  if (!element) return;

  // Visual feedback
  const originalBackground = element.style.background;
  element.style.background = '#FFF8F0'; // Ensure background is captured correctly
  
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
    
  } catch (error) {
    console.error('PDF generation failed:', error);
    alert('Failed to generate PDF report.');
  } finally {
    element.style.background = originalBackground;
  }
};
