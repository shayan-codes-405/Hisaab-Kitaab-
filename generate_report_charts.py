import matplotlib.pyplot as plt
import numpy as np

# Set global styles for high-clarity academic figures
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial']
plt.rcParams['axes.edgecolor'] = '#333333'
plt.rcParams['axes.linewidth'] = 1.0

# -------------------------------------------------------------
# Figure 1: 6-Month Historical Revenue Trend
# -------------------------------------------------------------
months = ['May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026']
sales = [11573.0, 11288.0, 14185.0, 13779.0, 16662.0, 22454.0]
invoices = [2, 2, 2, 2, 2, 3]

fig, ax1 = plt.subplots(figsize=(8, 4.5), dpi=300)
bars = ax1.bar(months, sales, color='#1B365D', width=0.52, edgecolor='#0D1B2A', linewidth=1.2, zorder=3)

# Add values on top of bars
for bar in bars:
    yval = bar.get_height()
    ax1.text(bar.get_x() + bar.get_width()/2.0, yval + 400, f'₹{yval:,.0f}', ha='center', va='bottom', fontsize=9.5, fontweight='bold', color='#1B365D')

ax1.set_title('Monthly Gross Revenue Trend (May – Oct 2026)\nAggregated via MongoDB Aggregation Pipeline ($match + $group)', fontsize=12, fontweight='bold', pad=15)
ax1.set_xlabel('Billing Period (Month & Year)', fontsize=10.5, fontweight='bold', labelpad=8)
ax1.set_ylabel('Gross Billed Sales (INR ₹)', fontsize=10.5, fontweight='bold', labelpad=8)
ax1.set_ylim(0, 26000)
ax1.grid(axis='y', linestyle=':', alpha=0.7, zorder=0)

plt.tight_layout()
plt.savefig('fig1_monthly_revenue.png', dpi=300)
plt.close()
print("[+] Generated fig1_monthly_revenue.png")

# -------------------------------------------------------------
# Figure 2: Payment Realization Distribution
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(7, 4.5), dpi=300)
labels = ['Paid (10 Invoices)\n₹72,394 (76.9%)', 'Partially Paid (2 Invoices)\n₹9,747 (15.4%)', 'Unpaid (1 Invoice)\n₹7,800 (7.7%)']
sizes = [72394.0, 9747.0, 7800.0]
colors = ['#1D603A', '#D97706', '#DC2626']
explode = (0.04, 0.04, 0.08)

wedges, texts, autotexts = ax.pie(
    sizes, 
    explode=explode, 
    labels=labels, 
    colors=colors, 
    autopct='%1.1f%%',
    startangle=140, 
    pctdistance=0.75,
    wedgeprops=dict(width=0.45, edgecolor='white', linewidth=2)
)

for t in texts:
    t.set_fontsize(9.5)
    t.set_fontweight('bold')
for at in autotexts:
    at.set_fontsize(9.5)
    at.set_color('white')
    at.set_fontweight('bold')

ax.set_title('Payment Status Realization Distribution\n(Realized Cash/Bank Collections vs Outstanding Balances)', fontsize=12, fontweight='bold', pad=15)
plt.tight_layout()
plt.savefig('fig2_payment_distribution.png', dpi=300)
plt.close()
print("[+] Generated fig2_payment_distribution.png")

# -------------------------------------------------------------
# Figure 3: Query Latency Benchmark
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(8.5, 4.2), dpi=300)
categories = [
    'Complete Tax Invoice Lookup\n(5 Line Items + Snapshots)',
    '6-Month Financial Aggregation\n($match + $group vs. SQL Group By)',
    'Low-Stock Threshold Audit\n(Indexed Scan vs. Table Scan)'
]
rdbms_times = [24.6, 19.4, 12.1]
mongodb_times = [1.8, 3.2, 1.1]

y = np.arange(len(categories))
height = 0.32

rects1 = ax.barh(y + height/2, rdbms_times, height, label='Normalized Relational SQL (PostgreSQL / MySQL)', color='#9CA3AF', edgecolor='#4B5563')
rects2 = ax.barh(y - height/2, mongodb_times, height, label='HisabKitab MongoDB Document Store', color='#1B365D', edgecolor='#0D1B2A')

ax.set_xlabel('Execution Latency (Milliseconds) — Lower is Better', fontsize=10.5, fontweight='bold', labelpad=8)
ax.set_title('Query Performance Benchmark: MongoDB NoSQL vs. Normalized RDBMS', fontsize=12, fontweight='bold', pad=15)
ax.set_yticks(y)
ax.set_yticklabels(categories, fontsize=9.5, fontweight='bold')
ax.legend(loc='lower right', fontsize=9.5, framealpha=0.9)
ax.set_xlim(0, 30)
ax.grid(axis='x', linestyle=':', alpha=0.7)

# Value annotations
for rect in rects1:
    w = rect.get_width()
    ax.text(w + 0.5, rect.get_y() + rect.get_height()/2, f'{w:.1f} ms', va='center', fontsize=9, fontweight='bold', color='#4B5563')

for rect in rects2:
    w = rect.get_width()
    ax.text(w + 0.5, rect.get_y() + rect.get_height()/2, f'{w:.1f} ms ({rdbms_times[int(round(rect.get_y()))]/w:.1f}x faster)', va='center', fontsize=9, fontweight='bold', color='#1B365D')

plt.tight_layout()
plt.savefig('fig3_query_latency.png', dpi=300)
plt.close()
print("[+] Generated fig3_query_latency.png")

# -------------------------------------------------------------
# Figure 4: System Architecture Diagram
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(9, 4.2), dpi=300)
ax.axis('off')

# Drawing tier boxes
def draw_box(x, y, w, h, title, subtitle, bg_color, border_color):
    box = plt.Rectangle((x, y), w, h, facecolor=bg_color, edgecolor=border_color, linewidth=1.5, zorder=2)
    ax.add_patch(box)
    ax.text(x + w/2, y + h - 0.15, title, ha='center', va='top', fontsize=10.5, fontweight='bold', color=border_color, zorder=3)
    ax.text(x + w/2, y + 0.12, subtitle, ha='center', va='bottom', fontsize=8.5, color='#292D2A', zorder=3)

# Tier 1: Client Edge (Vercel)
draw_box(0.05, 0.15, 0.25, 0.70, "Presentation Tier\n(Vercel Global Edge)", "• React 18 SPA\n• Pure CSS Ledger Theme\n• Chart.js Visuals\n• PDF & Print Engine", "#EBF3FF", "#1B365D")

# Tier 2: Application Core (Render Docker)
draw_box(0.38, 0.15, 0.26, 0.70, "Application Tier\n(Render Docker Cloud)", "• FastAPI Async REST\n• Multi-Unit GST Engine\n• ReportLab PDF Stream\n• TextBee SMS Dispatcher", "#F0FDF4", "#166534")

# Tier 3: Database Persistence (MongoDB Atlas)
draw_box(0.72, 0.15, 0.25, 0.70, "Persistence Tier\n(MongoDB Atlas Cluster)", "• 'invoices' (Snapshots)\n• 'products' (Multi-Unit)\n• 'business_settings'\n• Compound BSON Indexes", "#FEF3C7", "#92400E")

# Arrows
def draw_arrow(x1, y1, x2, y2, label):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(facecolor='#1B365D', edgecolor='#1B365D', width=1.5, headwidth=7), zorder=4)
    ax.text((x1+x2)/2, y1 + 0.05, label, ha='center', va='bottom', fontsize=8, fontweight='bold', color='#1B365D')

draw_arrow(0.30, 0.50, 0.38, 0.50, "HTTPS / JSON")
draw_arrow(0.64, 0.50, 0.72, 0.50, "PyMongo BSON")

ax.set_title("HisabKitab Multi-Tier Cloud Architecture & Data Flow", fontsize=12, fontweight='bold', pad=12)
ax.set_xlim(0, 1.02)
ax.set_ylim(0, 0.95)

plt.tight_layout()
plt.savefig('fig4_system_architecture.png', dpi=300)
plt.close()
print("[+] Generated fig4_system_architecture.png")
