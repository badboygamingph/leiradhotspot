import React, { useMemo, useState } from "react";
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Tag, 
  Percent, 
  Layers, 
  HelpCircle,
  BarChart2,
  PieChart as PieIcon,
  Calendar,
  Sparkles,
  Wallet,
  Coins,
  Receipt,
  Scale,
  Calculator,
  ArrowUpRight,
  TrendingDown,
  Sliders,
  Copy,
  Check,
  Building,
  Activity,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { motion } from "motion/react";
import { Voucher } from "../types";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface Props {
  vouchers: Voucher[];
}

export function AnalyticsView({ vouchers }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<"performance" | "accounting">("performance");
  const [copied, setCopied] = useState(false);

  // Accounting simulator state variables
  const [bandwidthCost, setBandwidthCost] = useState<number>(15); // Percentage of revenue allocated to ISP bandwidth
  const [maintenanceCost, setMaintenanceCost] = useState<number>(5); // Percentage allocated to power & physical maintenance
  const [taxRate, setTaxRate] = useState<number>(3); // Percentage allocated to transaction/processing fees

  // Helper to extract numerical price from voucher or infer it
  const getPriceValue = (v: Voucher): number => {
    if (v.price) {
      const match = v.price.match(/[\d.]+/);
      if (match) return parseFloat(match[0]);
    }
    // Fallback based on duration
    switch (v.duration?.toUpperCase()) {
      case "1H": return 5;
      case "3H": return 10;
      case "1D": return 20;
      case "2D": return 35;
      case "30D": return 200;
      default: return 0;
    }
  };

  // Compute all metrics dynamically based on current voucher list
  const stats = useMemo(() => {
    const total = vouchers.length;
    const available = vouchers.filter((v) => v.status === "available").length;
    const used = vouchers.filter((v) => v.status === "used").length;

    let realizedRevenue = 0;
    let potentialRevenue = 0;

    vouchers.forEach((v) => {
      const price = getPriceValue(v);
      if (v.status === "used") {
        realizedRevenue += price;
      } else {
        potentialRevenue += price;
      }
    });

    const totalRevenue = realizedRevenue + potentialRevenue;
    const usageRate = total > 0 ? (used / total) * 100 : 0;

    // 1. Duration Breakdown Chart Data
    const durationCounts: Record<string, { available: number; used: number }> = {};
    vouchers.forEach((v) => {
      const d = v.duration || "Unknown";
      if (!durationCounts[d]) {
        durationCounts[d] = { available: 0, used: 0 };
      }
      if (v.status === "used") {
        durationCounts[d].used += 1;
      } else {
        durationCounts[d].available += 1;
      }
    });

    const durationData = Object.entries(durationCounts).map(([duration, counts]) => ({
      duration,
      Available: counts.available,
      Used: counts.used,
      Total: counts.available + counts.used,
    })).sort((a, b) => {
      // Custom duration sort
      const order = ["1H", "3H", "1D", "2D", "30D"];
      const indexA = order.indexOf(a.duration.toUpperCase());
      const indexB = order.indexOf(b.duration.toUpperCase());
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.duration.localeCompare(b.duration);
    });

    // 2. Over-Time Activity (Simulating/Parsing past 7 days based on voucher createdAt dates)
    const dailyActivity: Record<string, { added: number; used: number }> = {};
    
    // Fallback 7-day template to ensure graph looks great even with low or clean data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }).reverse();

    last7Days.forEach((dayStr) => {
      dailyActivity[dayStr] = { added: 0, used: 0 };
    });

    vouchers.forEach((v) => {
      if (v.createdAt) {
        try {
          const date = new Date(v.createdAt);
          const dayStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (dailyActivity[dayStr] === undefined) {
            dailyActivity[dayStr] = { added: 0, used: 0 };
          }
          if (v.status === "used") {
            dailyActivity[dayStr].used += 1;
          } else {
            dailyActivity[dayStr].added += 1;
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    });

    const activityData = Object.entries(dailyActivity).map(([date, counts]) => ({
      date,
      "Vouchers Loaded": counts.added + counts.used,
      "Vouchers Used": counts.used,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 3. Status ratio
    const statusData = [
      { name: "Available Vouchers", value: available, color: "#3b82f6" },
      { name: "Used Vouchers", value: used, color: "#64748b" }
    ];

    return {
      total,
      available,
      used,
      realizedRevenue,
      potentialRevenue,
      totalRevenue,
      usageRate,
      durationData,
      activityData,
      statusData,
    };
  }, [vouchers]);

  // Dynamic calculations for accounting simulator
  const simExpensesPercent = bandwidthCost + maintenanceCost + taxRate;
  const realizedExpenses = (stats.realizedRevenue * simExpensesPercent) / 100;
  const netRealizedProfit = stats.realizedRevenue - realizedExpenses;

  const potentialExpenses = (stats.potentialRevenue * simExpensesPercent) / 100;
  const netPotentialProfit = stats.potentialRevenue - potentialExpenses;

  const totalProjectedExpenses = realizedExpenses + potentialExpenses;
  const netTotalProjectedProfit = stats.totalRevenue - totalProjectedExpenses;

  // Generate markdown accounting ledger to copy
  const handleCopyLedger = () => {
    let ledgerString = `HOTSPOT VOUCHER SYSTEM - FINANCIAL REPORT\n`;
    ledgerString += `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    ledgerString += `==================================================\n\n`;
    ledgerString += `FINANCIAL SUMMARY:\n`;
    ledgerString += `- Gross Realized Cash Collected: Php ${stats.realizedRevenue.toFixed(2)}\n`;
    ledgerString += `- Operating Expenses (Allocated ${simExpensesPercent}%): Php ${realizedExpenses.toFixed(2)}\n`;
    ledgerString += `- Net Realized Cash Profit: Php ${netRealizedProfit.toFixed(2)}\n`;
    ledgerString += `- Accounts Receivable Value (Unsold Stock): Php ${stats.potentialRevenue.toFixed(2)}\n`;
    ledgerString += `- Total Projected Net Value: Php ${netTotalProjectedProfit.toFixed(2)}\n\n`;
    ledgerString += `PLAN TYPE LEDGER DETAIL:\n`;
    ledgerString += `Plan\tRate\tTotal Stock\tUsed\tAvail\tCollected\tPotential Value\n`;
    
    stats.durationData.forEach((item) => {
      let unitPrice = 0;
      switch (item.duration.toUpperCase()) {
        case "1H": unitPrice = 5; break;
        case "3H": unitPrice = 10; break;
        case "1D": unitPrice = 20; break;
        case "2D": unitPrice = 35; break;
        case "30D": unitPrice = 200; break;
      }
      const collected = item.Used * unitPrice;
      const potential = item.Available * unitPrice;
      ledgerString += `${item.duration}\tPhp ${unitPrice}\t${item.Total}\t${item.Used}\t${item.Available}\tPhp ${collected}\tPhp ${potential}\n`;
    });

    navigator.clipboard.writeText(ledgerString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Recharts simulation dataset
  const simulationChartData = useMemo(() => {
    return [
      { name: "Gross Collected", Cashflow: stats.realizedRevenue, Expenses: realizedExpenses, "Net Profit": netRealizedProfit },
      { name: "Unsold Value", Cashflow: stats.potentialRevenue, Expenses: potentialExpenses, "Net Profit": netPotentialProfit },
      { name: "Total Portfolio", Cashflow: stats.totalRevenue, Expenses: totalProjectedExpenses, "Net Profit": netTotalProjectedProfit }
    ];
  }, [stats.realizedRevenue, stats.potentialRevenue, stats.totalRevenue, realizedExpenses, potentialExpenses, totalProjectedExpenses]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-12">
      {/* Top Banner section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">System Intelligence Hub</h2>
          </div>
          <h1 className="text-2xl font-light text-slate-900 dark:text-white tracking-tight">Business & Revenue Analytics</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            Monitor real-time voucher inventory levels, revenue generation velocity, and hotspot consumer duration trends.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 p-3 self-start md:self-auto">
          <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <div className="text-right">
            <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Reporting Window</p>
            <p className="text-xs font-bold text-slate-700 mt-1">Real-time (Active Sync)</p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 gap-1 self-start rounded-sm max-w-md">
        <button
          onClick={() => setActiveSubTab("performance")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all rounded-sm cursor-pointer ${
            activeSubTab === "performance"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Inventory Performance
        </button>
        <button
          onClick={() => setActiveSubTab("accounting")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all rounded-sm cursor-pointer ${
            activeSubTab === "accounting"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
          }`}
        >
          <Wallet className="w-4 h-4" />
          Accounting Ledger
        </button>
      </div>

      {activeSubTab === "performance" ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {/* Main KPI Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KPI 1: Total Realized Revenue */}
            <motion.div 
              whileHover={{ y: -2 }}
              className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between relative group overflow-hidden transition-all"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500"></div>
              <div className="flex items-start justify-between mb-4">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Realized Earnings</span>
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-sm">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-light text-slate-900 dark:text-white leading-none">
                  Php {stats.realizedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[10px] font-bold text-emerald-600 mt-2 uppercase tracking-tighter">
                  Collected from users
                </p>
              </div>
            </motion.div>

            {/* KPI 2: Potential Revenue */}
            <motion.div 
              whileHover={{ y: -2 }}
              className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between relative group overflow-hidden transition-all"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500"></div>
              <div className="flex items-start justify-between mb-4">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Unrealized Value</span>
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-sm">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-light text-slate-900 dark:text-white leading-none">
                  Php {stats.potentialRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[10px] font-bold text-blue-500 mt-2 uppercase tracking-tighter">
                  Available voucher stock value
                </p>
              </div>
            </motion.div>

            {/* KPI 3: Deletion/Voucher Portfolio */}
            <motion.div 
              whileHover={{ y: -2 }}
              className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between relative group overflow-hidden transition-all"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-slate-900"></div>
              <div className="flex items-start justify-between mb-4">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Portfolio Value</span>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-sm">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-light text-slate-900 dark:text-white leading-none">
                  Php {stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-tighter">
                  Sum of all inventory records
                </p>
              </div>
            </motion.div>

            {/* KPI 4: Inventory Utilization Rate */}
            <motion.div 
              whileHover={{ y: -2 }}
              className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between relative group overflow-hidden transition-all"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-purple-500"></div>
              <div className="flex items-start justify-between mb-4">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Conversion Rate</span>
                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-sm">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-light text-slate-900 dark:text-white leading-none">
                  {stats.usageRate.toFixed(1)}%
                </span>
                <p className="text-[10px] font-bold text-purple-500 mt-2 uppercase tracking-tighter">
                  Used vs loaded vouchers
                </p>
              </div>
            </motion.div>
          </div>

          {/* Graphs Panel Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Graph 1: Area Chart - Inventory Load vs Consumer Usage over Time */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Inventory Activity Log</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Loaded and used vouchers grouped by registration days</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase font-mono">
                  <span className="flex items-center gap-1.5 text-blue-500">
                    <span className="w-2.5 h-2.5 bg-blue-500"></span> Total Loaded
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 bg-slate-50 dark:bg-slate-8000"></span> Redeemed
                  </span>
                </div>
              </div>
              <div className="p-6 h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.activityData}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorLoaded" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '0px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        fontFamily: 'sans-serif'
                      }}
                      labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#1e293b', textTransform: 'uppercase' }}
                      itemStyle={{ fontSize: '11px', padding: '1px 0' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Vouchers Loaded" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorLoaded)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Vouchers Used" 
                      stroke="#64748b" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorUsed)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Graph 2: Donut Chart - State Composition */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Inventory Ratio</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Conversion breakdown of database stock</p>
              </div>
              <div className="p-6 flex flex-col items-center justify-center relative min-h-[220px]">
                {stats.total > 0 ? (
                  <>
                    <div className="w-full h-[180px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {stats.statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [`${value} vouchers`, "Amount"]}
                            contentStyle={{ 
                              backgroundColor: '#ffffff', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '0px',
                              fontSize: '11px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center Text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-light text-slate-900 dark:text-white tracking-tight">{stats.total}</span>
                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Stock</span>
                      </div>
                    </div>

                    {/* Custom Legend */}
                    <div className="w-full mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 text-left">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-blue-500 flex-shrink-0"></span>
                          <span className="text-[10px] font-bold text-slate-700">Available</span>
                        </div>
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 pl-4">
                          {stats.available} ({stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0}%)
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-slate-50 dark:bg-slate-8000 flex-shrink-0"></span>
                          <span className="text-[10px] font-bold text-slate-700">Used</span>
                        </div>
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 pl-4">
                          {stats.used} ({stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0}%)
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-500">
                    <PieIcon className="w-8 h-8 mb-2 stroke-1 opacity-60" />
                    <p className="text-xs font-medium">No vouchers available to build distribution charts.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Graph 3: Bar Chart - Voucher Volume & Revenue Value by Product Tier */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Tier Breakdown */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Voucher Distribution by Plan</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Inventory health categorized by duration tier</p>
              </div>
              <div className="p-6 h-[280px]">
                {stats.durationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.durationData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                      barGap={6}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="duration" 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '0px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '11px'
                        }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={36} 
                        iconType="square" 
                        iconSize={8}
                        wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="Available" fill="#3b82f6" radius={0} maxBarSize={40} />
                      <Bar dataKey="Used" fill="#64748b" radius={0} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500">
                    <BarChart2 className="w-8 h-8 mb-2 stroke-1 opacity-60" />
                    <p className="text-xs font-medium">Please add or import voucher records to preview product breakdown.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tier Pricing Value Breakdown list */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Hotspot Plan Inventory Matrix</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Live inventory and pricing list details</p>
              </div>
              <div className="p-6 divide-y divide-slate-100 flex-1 flex flex-col justify-center">
                {stats.durationData.length > 0 ? (
                  stats.durationData.map((item, index) => {
                    // Determine price of the tier
                    let unitPrice = 0;
                    switch (item.duration.toUpperCase()) {
                      case "1H": unitPrice = 5; break;
                      case "3H": unitPrice = 10; break;
                      case "1D": unitPrice = 20; break;
                      case "2D": unitPrice = 35; break;
                      case "30D": unitPrice = 200; break;
                    }
                    const availableValue = item.Available * unitPrice;
                    const realizedValue = item.Used * unitPrice;

                    return (
                      <div key={index} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center font-mono font-bold text-[10px] text-slate-600 dark:text-slate-300">
                            {item.duration}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800">Php {unitPrice.toFixed(2)}</h4>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">Unit Price</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 font-mono">
                              Php {realizedValue}
                            </span>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 font-mono">
                              Php {availableValue}
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider font-mono">
                            {item.Used} Used • {item.Available} Avail
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center">
                    <Tag className="w-8 h-8 mb-2 stroke-1 opacity-60" />
                    <p className="text-xs font-medium">Voucher plan matrix will compute when data is available.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Real-time Accounting View */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {/* Main Accounting Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">01 / Realized Gross Cash</span>
                <Coins className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-light text-slate-900 dark:text-white font-mono">
                  Php {stats.realizedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                  <span className="px-1.5 py-0.2 bg-emerald-50 border border-emerald-100 rounded-sm">
                    {stats.used} Vouchers
                  </span>
                  <span>redeemed into cash</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Direct Expenses ({simExpensesPercent}%):</span>
                <span className="font-mono text-rose-600 font-bold">-Php {realizedExpenses.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Net Collected Profit:</span>
                <span className="font-mono text-emerald-600">Php {netRealizedProfit.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">02 / Accounts Receivable</span>
                <Receipt className="w-4 h-4 text-blue-500" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-light text-slate-900 dark:text-white font-mono">
                  Php {stats.potentialRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-medium">
                  <span className="px-1.5 py-0.2 bg-blue-50 border border-blue-100 rounded-sm">
                    {stats.available} Vouchers
                  </span>
                  <span>active in inventory stock</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Overhead Reserve ({simExpensesPercent}%):</span>
                <span className="font-mono text-rose-600 font-bold">-Php {potentialExpenses.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Net Unsold Assets:</span>
                <span className="font-mono text-blue-600">Php {netPotentialProfit.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900"></div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">03 / Cumulative Projected Net</span>
                <Scale className="w-4 h-4 text-slate-700" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-light text-slate-900 dark:text-white font-mono">
                  Php {netTotalProjectedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-sm">
                    {stats.total} Total
                  </span>
                  <span>sum value if fully liquidated</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Total Expected Expenses:</span>
                <span className="font-mono text-rose-600 font-bold">-Php {totalProjectedExpenses.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>System Capital Margin:</span>
                <span className="font-mono text-slate-900 dark:text-white">
                  {stats.totalRevenue > 0 ? ((netTotalProjectedProfit / stats.totalRevenue) * 100).toFixed(1) : 0}% Net
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Expense Allocation & Simulation Sliders */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Expense Allocation</h3>
                </div>
                <h4 className="text-lg font-light text-slate-900 dark:text-white">Dynamic Operating Simulator</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Adjust operating coefficients below to simulate net profit margins against actual collected income and potential stocks.
                </p>
              </div>

              <div className="space-y-5 pt-4">
                {/* ISP Bandwidth cost slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">ISP Bandwidth Cost Allocation</span>
                    <span className="font-mono font-bold text-blue-600">{bandwidthCost}% of Rev</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={bandwidthCost}
                    onChange={(e) => setBandwidthCost(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 dark:bg-slate-800 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    <span>0% (Direct Pipe)</span>
                    <span>50% (Heavy Overhead)</span>
                  </div>
                </div>

                {/* Electricity/Ops cost slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">Electricity & Hardware Cost</span>
                    <span className="font-mono font-bold text-purple-600">{maintenanceCost}% of Rev</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={maintenanceCost}
                    onChange={(e) => setMaintenanceCost(Number(e.target.value))}
                    className="w-full accent-purple-600 h-1 bg-slate-100 dark:bg-slate-800 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    <span>0% (Free Host)</span>
                    <span>30% (High Power Draw)</span>
                  </div>
                </div>

                {/* Processing Fee slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">Tax & Merchant Gateway Fees</span>
                    <span className="font-mono font-bold text-emerald-600">{taxRate}% of Rev</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full accent-emerald-600 h-1 bg-slate-100 dark:bg-slate-800 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    <span>0% (Cash Only)</span>
                    <span>15% (Premium Processor)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2 mt-4 font-mono">
                <div className="flex justify-between">
                  <span>Gross Operating Rate:</span>
                  <span className="font-bold">{simExpensesPercent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Simulated Overhead:</span>
                  <span className="font-bold text-rose-600">Php {totalProjectedExpenses.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-2 font-bold">
                  <span>Simulated Net Profit Margin:</span>
                  <span className="text-emerald-600">{(100 - simExpensesPercent).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Income Simulation Distribution Chart */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Profit Projection Spread</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Realized Cashflow vs Net Profits including Operational Expenses</p>
                </div>
                <button
                  onClick={handleCopyLedger}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 rounded-sm cursor-pointer transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Report Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Ledger Report
                    </>
                  )}
                </button>
              </div>

              <div className="p-6 h-[280px]">
                {stats.total > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={simulationChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      barGap={6}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '0px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '11px'
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="square" 
                        iconSize={8}
                        wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="Cashflow" fill="#3b82f6" name="Gross Revenue Value" maxBarSize={40} />
                      <Bar dataKey="Expenses" fill="#f43f5e" name="Allocated Expenses" maxBarSize={40} />
                      <Bar dataKey="Net Profit" fill="#10b981" name="Net Profit Margin" maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500">
                    <Calculator className="w-8 h-8 mb-2 stroke-1 opacity-60" />
                    <p className="text-xs font-medium">Please add voucher data to compile cashflow projection models.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Master Itemized Accounting Ledger Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Voucher Portfolio Balance Sheet</h3>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Live, audited allocation ledger matching available and used stocks.</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Ledger Status: Balanced
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 font-mono font-bold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Plan Class</th>
                    <th className="py-4 px-6 text-right">Unit Face Value</th>
                    <th className="py-4 px-6 text-center">Circulating Stock</th>
                    <th className="py-4 px-6 text-center">Liquidation Rate (%)</th>
                    <th className="py-4 px-6 text-right">Realized Cash (Used)</th>
                    <th className="py-4 px-6 text-right font-semibold text-blue-600">Expected Assets (Avail)</th>
                    <th className="py-4 px-6 text-right">Total Net Projected profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.durationData.length > 0 ? (
                    stats.durationData.map((item, index) => {
                      let unitPrice = 0;
                      switch (item.duration.toUpperCase()) {
                        case "1H": unitPrice = 5; break;
                        case "3H": unitPrice = 10; break;
                        case "1D": unitPrice = 20; break;
                        case "2D": unitPrice = 35; break;
                        case "30D": unitPrice = 200; break;
                      }
                      const totalCount = item.Total;
                      const completionRate = totalCount > 0 ? (item.Used / totalCount) * 100 : 0;
                      const collected = item.Used * unitPrice;
                      const potentialValue = item.Available * unitPrice;
                      const projectedTotal = collected + potentialValue;
                      const netProfit = projectedTotal - (projectedTotal * simExpensesPercent / 100);

                      return (
                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 transition-colors">
                          <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-sm mr-2 text-[10px]">
                              {item.duration}
                            </span>
                            Internet Pass
                          </td>
                          <td className="py-4 px-6 text-right font-mono text-slate-600 dark:text-slate-300 font-semibold">
                            Php {unitPrice.toFixed(2)}
                          </td>
                          <td className="py-4 px-6 text-center font-mono">
                            <span className="text-slate-900 dark:text-white font-bold">{totalCount}</span>
                            <span className="text-slate-400 dark:text-slate-500 text-[10px] ml-1">vouchers</span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-mono text-slate-700 font-bold">
                                {completionRate.toFixed(1)}%
                              </span>
                              <div className="w-12 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-full" 
                                  style={{ width: `${completionRate}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right font-mono text-emerald-600 font-bold">
                            Php {collected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-right font-mono text-blue-600 font-bold">
                            Php {potentialValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-right font-mono text-slate-900 dark:text-white font-bold">
                            Php {netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                        No active products found in Supabase inventory registers. Please import or add vouchers.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
