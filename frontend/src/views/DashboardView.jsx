import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const DashboardView = ({ onNewInvoice, onNewProduct, onViewInvoice }) => {
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/dashboard/metrics');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  if (loading || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-muted)' }}>
        <div style={{ fontSize: '15px', fontWeight: 600 }}>Loading ledger metrics from MongoDB...</div>
      </div>
    );
  }

  const { kpi, charts, low_stock_alerts, recent_invoices } = data;

  // Monthly Sales Bar Chart Config
  const barChartData = {
    labels: charts?.monthly_sales?.labels || [],
    datasets: [
      {
        label: 'Gross Sales (₹)',
        data: charts?.monthly_sales?.sales || [],
        backgroundColor: '#243C32',
        borderRadius: 4,
        maxBarThickness: 36,
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Sales: ₹${context.raw?.toLocaleString('en-IN') || 0}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Inter', size: 11 }, color: '#68706B' }
      },
      y: {
        grid: { color: '#EDE8DF' },
        ticks: {
          font: { family: 'Inter', size: 11 },
          color: '#68706B',
          callback: (value) => '₹' + Number(value).toLocaleString('en-IN')
        }
      }
    }
  };

  // Payment Status Doughnut Config
  const doughnutData = {
    labels: charts?.payment_distribution?.labels || ['Paid', 'Unpaid', 'Partially Paid'],
    datasets: [
      {
        data: charts?.payment_distribution?.counts || [0, 0, 0],
        backgroundColor: ['#1D603A', '#A12620', '#B87352'],
        borderWidth: 2,
        borderColor: '#FFFFFF',
        hoverOffset: 4
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { family: 'Inter', size: 11 }, color: '#292D2A', boxWidth: 12 }
      }
    },
    cutout: '70%'
  };

  return (
    <div>
      {/* Quick Action & Low Stock Banner */}
      {kpi.low_stock_count > 0 && (
        <div
          style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #FDE68A',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <div style={{ fontSize: '13px', color: '#92400E', fontWeight: 600 }}>
              {kpi.low_stock_count} item{kpi.low_stock_count > 1 ? 's are' : ' is'} below minimum threshold or out of stock!
            </div>
          </div>
          <button onClick={onNewProduct} className="btn btn-secondary btn-sm" style={{ borderColor: '#D97706', color: '#92400E' }}>
            Restock Inventory →
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {/* Total Sales */}
        <div className="ledger-card" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-muted)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
            Total Gross Sales
          </div>
          <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-forest)', marginTop: '4px', fontFamily: 'var(--font-heading)' }}>
            ₹{kpi.total_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Across {kpi.total_invoices} issued invoice{kpi.total_invoices === 1 ? '' : 's'}
          </div>
        </div>

        {/* Paid Ledger */}
        <div className="ledger-card" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-paid-text)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
            Received Payments
          </div>
          <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--status-paid-text)', marginTop: '4px', fontFamily: 'var(--font-heading)' }}>
            ₹{kpi.total_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Settled cash & bank receipts
          </div>
        </div>

        {/* Unpaid Balance */}
        <div className="ledger-card" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-unpaid-text)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
            Outstanding Balance
          </div>
          <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--status-unpaid-text)', marginTop: '4px', fontFamily: 'var(--font-heading)' }}>
            ₹{kpi.total_unpaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Pending customer collections
          </div>
        </div>

        {/* Gross Profit */}
        <div className="ledger-card" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-copper)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
            Estimated Gross Profit
          </div>
          <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-copper)', marginTop: '4px', fontFamily: 'var(--font-heading)' }}>
            ₹{kpi.estimated_profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Based on recorded purchase costs
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '20px',
          marginBottom: '24px'
        }}
      >
        {/* Monthly Revenue Trend */}
        <div className="ledger-card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Monthly Revenue Trend (Last 6 Months)</div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Aggregated sales billed through HisabKitab</div>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-forest)', fontWeight: 600 }}>Chart.js</span>
          </div>
          <div style={{ height: '230px' }}>
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>

        {/* Payment Split */}
        <div className="ledger-card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">Payment Realization</div>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Invoices</span>
          </div>
          <div style={{ height: '230px', position: 'relative' }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Invoices Ledger & Low Stock Warning */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '20px'
        }}
      >
        {/* Recent Invoices Table */}
        <div className="ledger-card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">Recent Invoices</div>
            <button onClick={onNewInvoice} className="btn btn-ghost btn-sm">
              + Create New Invoice
            </button>
          </div>

          {recent_invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--color-muted)', fontSize: '13px' }}>
              No invoices created yet. Issue your first GST bill today!
            </div>
          ) : (
            <div className="ledger-table-container" style={{ border: 'none', boxShadow: 'none' }}>
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Total (₹)</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => onViewInvoice(inv.id)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view full invoice"
                    >
                      <td style={{ fontWeight: 600, color: 'var(--color-forest)', fontFamily: 'var(--font-mono)' }}>
                        {inv.invoice_number}
                      </td>
                      <td>{inv.customer?.name}</td>
                      <td style={{ color: 'var(--color-muted)' }}>{inv.invoice_date}</td>
                      <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 700 }}>
                        ₹{inv.final_payable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={`status-pill ${
                            inv.payment_status === 'Paid'
                              ? 'status-paid'
                              : inv.payment_status === 'Partially Paid'
                              ? 'status-partial'
                              : 'status-unpaid'
                          }`}
                        >
                          {inv.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="ledger-card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">Inventory Alerts</div>
            <button onClick={onNewProduct} className="btn btn-ghost btn-sm">
              View All
            </button>
          </div>

          {low_stock_alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#166534', fontSize: '13px', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
              ✓ All products are healthy and above minimum thresholds.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {low_stock_alerts.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: item.stock_qty <= 0 ? '#FEE2E2' : '#FEF3C7',
                    border: `1px solid ${item.stock_qty <= 0 ? '#FCA5A5' : '#FDE68A'}`
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: item.stock_qty <= 0 ? '#991B1B' : '#92400E' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                      SKU: {item.sku} • Min: {item.low_stock_threshold} {item.unit}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: item.stock_qty <= 0 ? '#991B1B' : '#92400E',
                        fontFamily: 'var(--font-heading)'
                      }}
                    >
                      {item.stock_qty} {item.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
