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
  const { apiFetch, dataVersion } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Dynamic Date Range Filter State
  const [selectedRange, setSelectedRange] = useState('6months'); // 'today', 'this_week', 'this_month', '6months', 'all', 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const loadMetrics = async (rangeKey = selectedRange, forceLoader = false) => {
    if (!data || forceLoader) {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams({ range: rangeKey });
      if (rangeKey === 'custom' && customStart && customEnd) {
        params.append('start_date', customStart);
        params.append('end_date', customEnd);
      }
      const res = await apiFetch(`/api/dashboard/metrics?${params.toString()}`);
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
    loadMetrics(selectedRange);
  }, [selectedRange, dataVersion]);

  const handleRangeChange = (rangeKey) => {
    setSelectedRange(rangeKey);
    if (rangeKey !== 'custom') {
      setShowCustomPicker(false);
    } else {
      setShowCustomPicker(true);
    }
  };

  const handleApplyCustomRange = (e) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    loadMetrics('custom', true);
  };

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-muted)' }}>
        <div style={{ fontSize: '15px', fontWeight: 600 }}>Loading ledger metrics from MongoDB...</div>
      </div>
    );
  }

  if (!data) return null;

  const { kpi, charts, low_stock_alerts, recent_invoices, staff_performance, date_bounds } = data;

  // Range Label Formatter for Chart & Header
  const getRangeTitle = () => {
    switch (selectedRange) {
      case 'today':
        return 'Today’s Performance';
      case 'this_week':
        return 'This Week (Mon - Sun)';
      case 'this_month':
        return 'This Month (Current Cycle)';
      case '6months':
        return 'Last 6 Months';
      case 'all':
        return 'All Time History';
      case 'custom':
        return `Custom (${customStart || 'Start'} to ${customEnd || 'End'})`;
      default:
        return 'Overview';
    }
  };

  // Sales Trend Bar Chart Config
  const barChartData = {
    labels: charts?.monthly_sales?.labels || [],
    datasets: [
      {
        label: 'Gross Sales (₹)',
        data: charts?.monthly_sales?.sales || [],
        backgroundColor: '#243C32',
        borderRadius: 4,
        maxBarThickness: 38,
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
      {/* ========================================================================= */}
      {/* DYNAMIC DATE FILTER TOOLBAR (TODAY, WEEK, MONTH, 6 MONTHS, ALL, CUSTOM)   */}
      {/* ========================================================================= */}
      <div
        className="ledger-card"
        style={{
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>📅</span>
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-forest)' }}>
              Active Period: {getRangeTitle()}
            </div>
            {date_bounds?.start && (
              <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                {date_bounds.start} &nbsp;➔&nbsp; {date_bounds.end || 'Today'}
              </div>
            )}
          </div>
        </div>

        {/* Date Filter Preset Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'today', label: 'Today' },
            { key: 'this_week', label: 'This Week' },
            { key: 'this_month', label: 'This Month' },
            { key: '6months', label: 'Last 6 Months' },
            { key: 'all', label: 'All Time' },
            { key: 'custom', label: 'Custom' }
          ].map((preset) => {
            const isSelected = selectedRange === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => handleRangeChange(preset.key)}
                style={{
                  border: isSelected ? '1px solid var(--color-copper)' : '1px solid var(--color-stone)',
                  backgroundColor: isSelected ? 'var(--color-copper)' : '#ffffff',
                  color: isSelected ? '#ffffff' : 'var(--color-charcoal)',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: 'var(--font-heading)'
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Date Range Picker Form (when 'Custom' is active) */}
      {showCustomPicker && (
        <form
          onSubmit={handleApplyCustomRange}
          style={{
            backgroundColor: '#F8F6F0',
            border: '1px solid var(--color-stone)',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-charcoal)' }}>From:</label>
            <input
              type="date"
              required
              className="form-input"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-charcoal)' }}>To:</label>
            <input
              type="date"
              required
              className="form-input"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-sm">
            Apply Date Range Filter →
          </button>
        </form>
      )}

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

      {/* KPI Cards Grid (Dynamic to Selected Date Filter) */}
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
            Across {kpi.total_invoices} invoice{kpi.total_invoices === 1 ? '' : 's'} ({getRangeTitle()})
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
            Settled collections ({getRangeTitle()})
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
            Pending collections ({getRangeTitle()})
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
            Taxable sales minus recorded purchase costs
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
        {/* Dynamic Revenue Trend Chart */}
        <div className="ledger-card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Revenue Trend: {getRangeTitle()}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Aggregated gross sales across selected time range</div>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-forest)', backgroundColor: '#E0E7FF', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              Live Dynamic Chart
            </span>
          </div>
          <div style={{ height: '230px' }}>
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>

        {/* Payment Split */}
        <div className="ledger-card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">Payment Realization</div>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{kpi.total_invoices} Invoices</span>
          </div>
          <div style={{ height: '230px', position: 'relative' }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STAFF SALES & PRODUCT PERFORMANCE BREAKDOWN                                */}
      {/* ========================================================================= */}
      <div className="ledger-card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div>
            <div className="card-title">👥 Staff Sales & Product Performance</div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              Detailed sales volume, bills created, and top products sold by each staff member for {getRangeTitle()}.
            </div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-forest)', fontWeight: 600 }}>
            {staff_performance?.length || 0} Active Seller{staff_performance?.length === 1 ? '' : 's'}
          </span>
        </div>

        {!staff_performance || staff_performance.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--color-muted)', fontSize: '13px', backgroundColor: '#F8F6F0', borderRadius: '8px' }}>
            No employee sales recorded for {getRangeTitle()}. Select a wider date range to see staff sales records.
          </div>
        ) : (
          <div className="ledger-table-container" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th style={{ textAlign: 'center' }}>Invoices Created</th>
                  <th style={{ textAlign: 'center' }}>Units Sold</th>
                  <th style={{ textAlign: 'right' }}>Total Revenue Generated</th>
                  <th>Top Products Sold by this Staff</th>
                </tr>
              </thead>
              <tbody>
                {staff_performance.map((st) => (
                  <tr key={st.username}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--color-forest)' }}>{st.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                        @{st.username}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: st.role === 'admin' ? '#FEF3C7' : st.role === 'inventory_manager' ? '#FEE2E2' : '#E0E7FF',
                          color: st.role === 'admin' ? '#92400E' : st.role === 'inventory_manager' ? '#991B1B' : '#3730A3'
                        }}
                      >
                        {st.role === 'admin' ? '👑 Owner' : st.role === 'inventory_manager' ? 'Storekeeper' : 'Billing Cashier'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>
                      {st.invoice_count} bill{st.invoice_count === 1 ? '' : 's'}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--color-charcoal)' }}>
                      {st.total_items_sold} item{st.total_items_sold === 1 ? '' : 's'}
                    </td>
                    <td className="tabular-nums" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-forest)' }}>
                      ₹{st.total_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      {st.top_products && st.top_products.length > 0 ? (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {st.top_products.map((tp, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '11px',
                                backgroundColor: '#F1EFE9',
                                border: '1px solid var(--color-stone)',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                color: 'var(--color-charcoal)'
                              }}
                            >
                              <b>{tp.product_name}</b> ({tp.quantity} sold • ₹{tp.revenue})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>None recorded</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
            <div className="card-title">Recent Invoices ({getRangeTitle()})</div>
            <button onClick={onNewInvoice} className="btn btn-ghost btn-sm">
              + Create New Invoice
            </button>
          </div>

          {recent_invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--color-muted)', fontSize: '13px' }}>
              No invoices found for {getRangeTitle()}.
            </div>
          ) : (
            <div className="ledger-table-container" style={{ border: 'none', boxShadow: 'none' }}>
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Customer</th>
                    <th>Billed By</th>
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
                      <td>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-charcoal)' }}>
                          {inv.staff_name || (inv.created_by === 'admin' ? 'Owner' : inv.created_by)}
                        </span>
                      </td>
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

export default DashboardView;
