/**
 * Longo Coffee — Chart.js Configurations and Rendering
 * All charts use real database data passed from the API
 */

const CHART_COLORS = {
  primary:   '#4B2E2B',
  secondary: '#8B7355',
  tertiary:  '#C4A882',
  surface:   '#F5EDE0',
  positive:  '#4A7C59',
  negative:  '#C17B6B',
  blue:      '#5B8DB8',
  gold:      '#D4A853'
};

// Global Chart Defaults
if (typeof Chart !== 'undefined') {
  Chart.defaults.font.family = "'Work Sans', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = '#8B7355';
  
  if (Chart.defaults.plugins && Chart.defaults.plugins.legend) {
    Chart.defaults.plugins.legend.labels.boxWidth = 10;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
  }
  
  if (Chart.defaults.plugins && Chart.defaults.plugins.tooltip) {
    Chart.defaults.plugins.tooltip.backgroundColor = '#4B2E2B';
    Chart.defaults.plugins.tooltip.titleColor = '#FFF8F0';
    Chart.defaults.plugins.tooltip.bodyColor = '#FFF8F0';
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.padding = 10;
  }
}

// Common options for no grid lines
const noGridOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: { display: false },
      border: { display: false }
    },
    y: {
      grid: { color: 'rgba(75,46,43,0.06)', drawBorder: false },
      border: { display: false }
    }
  }
};

const formatEGP = (value) => `EGP ${value.toLocaleString()}`;

// ---- Dashboard Charts ----

window.renderRevenueTrendChart = function(ctxId, dbData) {
  const ctx = document.getElementById(ctxId);
  if (!ctx) return;

  const labels = dbData && dbData.length > 0 
    ? dbData.map(d => new Date(d.day).toLocaleDateString('en-US', { weekday: 'short' }))
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const data = dbData && dbData.length > 0 
    ? dbData.map(d => d.revenue) 
    : [0];

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Revenue (EGP)',
        data: data,
        borderColor: CHART_COLORS.primary,
        backgroundColor: 'rgba(75, 46, 43, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: CHART_COLORS.primary,
        pointRadius: 4
      }]
    },
    options: {
      ...noGridOptions,
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatEGP(context.raw);
            }
          }
        }
      }
    }
  });
};

// ---- Finance Charts ----

window.renderCashFlowChart = function(ctxId, dbData) {
  const ctx = document.getElementById(ctxId);
  if (!ctx) return;

  const labels = dbData && dbData.length > 0
    ? dbData.map(d => {
        const [year, month] = d.month.split('-');
        return new Date(year, parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' });
      })
    : ['No Data'];
  
  const revenueData = dbData && dbData.length > 0 ? dbData.map(d => d.revenue) : [0];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Revenue (EGP)',
        data: revenueData,
        backgroundColor: CHART_COLORS.primary,
        borderRadius: 4
      }]
    },
    options: {
      ...noGridOptions,
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${formatEGP(context.raw)}`;
            }
          }
        }
      }
    }
  });
};

window.renderROIGauge = function(ctxId, value = 18.5) {
  const ctx = document.getElementById(ctxId);
  if (!ctx) return;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [value, 100 - value],
        backgroundColor: [CHART_COLORS.primary, CHART_COLORS.surface],
        borderWidth: 0,
        circumference: 180,
        rotation: 270
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: { tooltip: { enabled: false }, legend: { display: false } }
    }
  });
};

window.renderPaymentMethodChart = function(ctxId, dbData) {
  const ctx = document.getElementById(ctxId);
  if (!ctx) return;

  const labels = dbData ? dbData.map(d => d.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment') : ['No Data'];
  const data = dbData ? dbData.map(d => d.revenue) : [0];

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [CHART_COLORS.primary, CHART_COLORS.blue],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: { legend: { position: 'bottom' } }
    }
  });
};

// ---- Analytics Charts ----

window.renderSalesTrendChart = function(ctxId, dbData) {
  const ctx = document.getElementById(ctxId);
  if (!ctx) return;

  const labels = dbData && dbData.length > 0
    ? dbData.map(d => new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    : ['No Data'];
  const data = dbData && dbData.length > 0 ? dbData.map(d => d.revenue) : [0];

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Sales (EGP)',
        data: data,
        borderColor: CHART_COLORS.primary,
        backgroundColor: 'rgba(75, 46, 43, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: noGridOptions
  });
};

window.renderNewUsersChart = function(ctxId, dbData) {
  const ctx = document.getElementById(ctxId);
  if (!ctx) return;

  const labels = dbData && dbData.length > 0
    ? dbData.map(d => `Week ${d.week}`)
    : ['No Data'];
  const data = dbData && dbData.length > 0 ? dbData.map(d => d.count) : [0];

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'New Registrations',
        data: data,
        borderColor: CHART_COLORS.positive,
        backgroundColor: 'rgba(74, 124, 89, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: noGridOptions
  });
};

window.renderTopProductsChart = function(ctxId, dbData) {
  const ctx = document.getElementById(ctxId);
  if (!ctx) return;
  
  const labels = dbData && dbData.length > 0 ? dbData.map(d => d.name) : ['No Data'];
  const data = dbData && dbData.length > 0 ? dbData.map(d => d.total_sold) : [0];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Units Sold',
        data: data,
        backgroundColor: CHART_COLORS.tertiary,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(75,46,43,0.06)' } },
        y: { grid: { display: false } }
      }
    }
  });
};

window.renderOrdersByStatusChart = function(ctxId, dbData) {
  const ctx = document.getElementById(ctxId);
  if (!ctx) return;

  const labels = dbData && dbData.length > 0 ? dbData.map(d => d.status) : ['No Data'];
  const data = dbData && dbData.length > 0 ? dbData.map(d => d.count) : [0];

  const colors = [CHART_COLORS.primary, CHART_COLORS.blue, CHART_COLORS.gold, CHART_COLORS.positive, CHART_COLORS.negative];

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'right' }
      }
    }
  });
};

window.renderRevenueByCategoryChart = function(ctxId, dbData) {
  const ctx = document.getElementById(ctxId);
  if (!ctx) return;

  const labels = dbData && dbData.length > 0 ? dbData.map(d => d.category) : ['No Data'];
  const data = dbData && dbData.length > 0 ? dbData.map(d => d.revenue) : [0];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Revenue (EGP)',
        data: data,
        backgroundColor: CHART_COLORS.primary,
        borderRadius: 4
      }]
    },
    options: {
      ...noGridOptions,
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatEGP(context.raw);
            }
          }
        }
      }
    }
  });
};
