import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ShoppingCart,
  TrendingUp,
  Package,
  Sparkles,
  Search,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface StoreSummary {
  totalUnitsSold: number;
  totalRecords: number;
  firstDate: string | null;
  lastDate: string | null;
  hasInventory: boolean;
}

interface TopProduct {
  sku: string;
  product_name: string;
  units_sold: number;
}

interface VelocityItem {
  sku: string;
  product_name: string;
  units_sold: number;
  units_per_day: number;
}

interface MonthlyItem {
  month: string;
  units_sold: number;
}

interface RestockingItem {
  sku: string;
  product_name: string;
  current_stock: number;
  units_sold_30_days: number;
  units_per_day: number;
  days_of_stock: number | null;
  demand_7_days: number;
  demand_14_days: number;
  demand_30_days: number;
  suggested_reorder: number;
}

interface QueryResponse {
  type: string;
  title: string;
  data?: any;
  answer?: string;
  days?: number;
  caption?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'restocking'>('chat');
  const [summary, setSummary] = useState<StoreSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Dashboard Data
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlyItem[]>([]);
  const [velocity30, setVelocity30] = useState<VelocityItem[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Restocking Data
  const [restocking, setRestocking] = useState<RestockingItem[]>([]);
  const [loadingRestocking, setLoadingRestocking] = useState(false);

  // AI Chat State
  const exampleQuestions = [
    'Which products sell the most?',
    'What is selling fastest?',
    'Show me the last 60 days.',
    'Which products should I restock?',
    'What seasonal patterns do you see?',
    'What should I prepare for next month?',
  ];
  const [selectedExample, setSelectedExample] = useState('Custom');
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch initial store summary
  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await fetch('/api/summary');
      if (!res.ok) throw new Error('Failed to load store summary');
      const data = await res.json();
      setSummary(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Lazy load dashboard
  useEffect(() => {
    if (activeTab === 'dashboard' && topProducts.length === 0) {
      loadDashboard();
    } else if (activeTab === 'restocking' && restocking.length === 0) {
      loadRestocking();
    }
  }, [activeTab]);

  const loadDashboard = async () => {
    try {
      setLoadingDashboard(true);
      const [topRes, monthRes, velRes] = await Promise.all([
        fetch('/api/top-products?limit=10'),
        fetch('/api/monthly-sales'),
        fetch('/api/velocity?days=30'),
      ]);
      const top = await topRes.json();
      const month = await monthRes.json();
      const vel = await velRes.json();
      setTopProducts(top);
      setMonthlySales(month);
      setVelocity30(vel);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const loadRestocking = async () => {
    try {
      setLoadingRestocking(true);
      const res = await fetch('/api/restocking');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load restocking data');
      }
      const data = await res.json();
      setRestocking(data);
    } catch (err: any) {
      console.error('Failed to load restocking:', err);
    } finally {
      setLoadingRestocking(false);
    }
  };

  const handleAskQuestion = async (queryText?: string) => {
    const textToAsk = (queryText || question).trim();
    if (!textToAsk) return;

    setAsking(true);
    setErrorMsg(null);
    setQueryResult(null);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: textToAsk }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process query');
      }
      setQueryResult(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setAsking(false);
    }
  };

  const handleSelectExample = (ex: string) => {
    setSelectedExample(ex);
    if (ex === 'Custom') {
      setQuestion('');
    } else {
      setQuestion(ex);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-white border-r border-slate-200 p-6 flex flex-col shrink-0 shadow-xs">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-xs">
            🛒
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Priya Store AI</h1>
            <p className="text-xs text-slate-500">Retail Decision Engine</p>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Store Data Overview
          </h2>

          {loadingSummary ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              Loading metrics...
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Total Units Sold</span>
                <span className="text-2xl font-bold text-slate-900">
                  {summary.totalUnitsSold.toLocaleString()}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Sales Records</span>
                <span className="text-2xl font-bold text-slate-900">
                  {summary.totalRecords.toLocaleString()}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <span className="text-slate-500 block mb-1">Sales Period</span>
                <span className="font-semibold text-slate-800">
                  {summary.firstDate} &rarr; {summary.lastDate}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                <span className="text-slate-500">Inventory File:</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded-full ${
                    summary.hasInventory
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {summary.hasInventory ? 'Available' : 'Missing'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-rose-600">Failed to load data.</div>
          )}
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100 text-xs text-slate-400 leading-relaxed">
          <p>
            API keys are read from environment variables and are not stored in the app.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🛒</span>
                <h2 className="text-xl font-bold text-slate-900">
                  Priya General Store — AI Assistant
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Sales • Inventory • Restocking • Hindsight • Gemini
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl self-start">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'chat'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                💬 AI Chat
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => setActiveTab('restocking')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'restocking'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📦 Restocking
              </button>
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <div className="p-6 md:p-8 flex-1">
          {errorMsg && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: AI CHAT */}
          {activeTab === 'chat' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  Ask a question about your store.
                </h3>
                <p className="text-xs text-slate-500 mb-5">
                  Ask deterministic questions about sales or let Gemini analyze trends, inventory, and demand.
                </p>

                {/* Example Selector */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Example question
                  </label>
                  <select
                    value={selectedExample}
                    onChange={(e) => handleSelectExample(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Custom">Custom</option>
                    {exampleQuestions.map((eq) => (
                      <option key={eq} value={eq}>
                        {eq}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Input */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Your question
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Which products sell the most?, What should I restock?, How are umbrella sales?"
                      value={question}
                      onChange={(e) => {
                        setQuestion(e.target.value);
                        if (selectedExample !== 'Custom' && e.target.value !== selectedExample) {
                          setSelectedExample('Custom');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAskQuestion();
                      }}
                      className="flex-1 px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      onClick={() => handleAskQuestion()}
                      disabled={asking || !question.trim()}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shrink-0 shadow-xs"
                    >
                      {asking ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Thinking...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Ask AI</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat Query Result */}
              {queryResult && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      {queryResult.type === 'ai_answer' ? (
                        <>
                          <Sparkles className="w-5 h-5 text-amber-500" />
                          {queryResult.title}
                        </>
                      ) : (
                        queryResult.title
                      )}
                    </h3>
                    <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-medium uppercase">
                      {queryResult.type.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Render based on result type */}
                  {queryResult.type === 'top_products' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-semibold">
                          <tr>
                            <th className="py-2.5 px-4">#</th>
                            <th className="py-2.5 px-4">SKU</th>
                            <th className="py-2.5 px-4">Product Name</th>
                            <th className="py-2.5 px-4 text-right">Units Sold</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {queryResult.data.map((item: TopProduct, idx: number) => (
                            <tr key={item.sku} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                              <td className="py-2.5 px-4 font-mono text-xs font-medium text-amber-700">
                                {item.sku}
                              </td>
                              <td className="py-2.5 px-4 font-medium text-slate-800">
                                {item.product_name}
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                                {item.units_sold.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {queryResult.type === 'velocity' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-semibold">
                          <tr>
                            <th className="py-2.5 px-4">SKU</th>
                            <th className="py-2.5 px-4">Product Name</th>
                            <th className="py-2.5 px-4 text-right">Units Sold ({queryResult.days}d)</th>
                            <th className="py-2.5 px-4 text-right">Units Per Day</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {queryResult.data.map((item: VelocityItem) => (
                            <tr key={item.sku} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-4 font-mono text-xs font-medium text-amber-700">
                                {item.sku}
                              </td>
                              <td className="py-2.5 px-4 font-medium text-slate-800">
                                {item.product_name}
                              </td>
                              <td className="py-2.5 px-4 text-right font-medium text-slate-700">
                                {item.units_sold.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-emerald-600">
                                {item.units_per_day}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {queryResult.type === 'monthly_sales' && (
                    <div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={queryResult.data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="units_sold"
                              stroke="#f59e0b"
                              strokeWidth={3}
                              dot={{ r: 4, fill: '#f59e0b' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {queryResult.type === 'summary' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <span className="text-xs text-slate-500">Units sold</span>
                          <span className="text-2xl font-bold text-slate-900 block mt-1">
                            {queryResult.data.totalUnitsSold.toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <span className="text-xs text-slate-500">Sales records</span>
                          <span className="text-2xl font-bold text-slate-900 block mt-1">
                            {queryResult.data.totalRecords.toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <span className="text-xs text-slate-500">Data through</span>
                          <span className="text-xl font-bold text-slate-900 block mt-1">
                            {queryResult.data.lastDate}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">
                        Data starts {queryResult.data.firstDate}
                      </p>
                    </div>
                  )}

                  {queryResult.type === 'product_history' && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 inline-block">
                        <span className="text-xs text-slate-500">Total units sold</span>
                        <span className="text-2xl font-bold text-slate-900 block mt-1">
                          {queryResult.data.totalUnitsSold.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={queryResult.data.monthly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="units_sold"
                              stroke="#0284c7"
                              strokeWidth={3}
                              dot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {queryResult.type === 'restocking' && (
                    <div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                            <tr>
                              <th className="py-2.5 px-3">SKU</th>
                              <th className="py-2.5 px-3">Product Name</th>
                              <th className="py-2.5 px-3 text-right">Current Stock</th>
                              <th className="py-2.5 px-3 text-right">Units/Day</th>
                              <th className="py-2.5 px-3 text-right">Days of Stock</th>
                              <th className="py-2.5 px-3 text-right">7d Demand</th>
                              <th className="py-2.5 px-3 text-right">14d Demand</th>
                              <th className="py-2.5 px-3 text-right">30d Demand</th>
                              <th className="py-2.5 px-3 text-right">Suggested Reorder</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {queryResult.data.map((item: RestockingItem) => (
                              <tr key={item.sku} className="hover:bg-slate-50/80">
                                <td className="py-2.5 px-3 font-mono font-medium text-amber-700">{item.sku}</td>
                                <td className="py-2.5 px-3 font-medium text-slate-800">{item.product_name}</td>
                                <td className="py-2.5 px-3 text-right font-bold">{item.current_stock}</td>
                                <td className="py-2.5 px-3 text-right">{item.units_per_day}</td>
                                <td className="py-2.5 px-3 text-right">
                                  {item.days_of_stock !== null ? (
                                    <span
                                      className={`px-1.5 py-0.5 rounded-sm font-semibold ${
                                        item.days_of_stock < 10
                                          ? 'bg-rose-100 text-rose-700'
                                          : 'text-slate-700'
                                      }`}
                                    >
                                      {item.days_of_stock}
                                    </span>
                                  ) : (
                                    '∞'
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-600">{item.demand_7_days}</td>
                                <td className="py-2.5 px-3 text-right text-slate-600">{item.demand_14_days}</td>
                                <td className="py-2.5 px-3 text-right text-slate-600">{item.demand_30_days}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-amber-600">
                                  {item.suggested_reorder}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {queryResult.caption && (
                        <p className="text-xs text-slate-500 mt-3 italic">{queryResult.caption}</p>
                      )}
                    </div>
                  )}

                  {queryResult.type === 'ai_answer' && (
                    <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap text-slate-800 bg-amber-50/40 p-4 rounded-xl border border-amber-100/60">
                      {queryResult.answer}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {loadingDashboard ? (
                <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                  Loading dashboard charts and tables...
                </div>
              ) : (
                <>
                  {/* Top 10 Products */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-slate-900">Top 10 Products</h3>
                      <span className="text-xs text-slate-400">All-time sales volume</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-semibold">
                          <tr>
                            <th className="py-2.5 px-4">#</th>
                            <th className="py-2.5 px-4">SKU</th>
                            <th className="py-2.5 px-4">Product Name</th>
                            <th className="py-2.5 px-4 text-right">Units Sold</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {topProducts.map((p, idx) => (
                            <tr key={p.sku} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                              <td className="py-2.5 px-4 font-mono text-xs font-medium text-amber-700">
                                {p.sku}
                              </td>
                              <td className="py-2.5 px-4 font-medium text-slate-800">{p.product_name}</td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                                {p.units_sold.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Monthly Sales */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-slate-900">Monthly Sales</h3>
                      <span className="text-xs text-slate-400">Units sold per month</span>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlySales} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="units_sold"
                            stroke="#f59e0b"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#f59e0b' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* 30-Day Velocity */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-slate-900">30-Day Velocity</h3>
                      <span className="text-xs text-slate-400">Recent run-rate</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-semibold">
                          <tr>
                            <th className="py-2.5 px-4">SKU</th>
                            <th className="py-2.5 px-4">Product Name</th>
                            <th className="py-2.5 px-4 text-right">Units Sold (30 Days)</th>
                            <th className="py-2.5 px-4 text-right">Units / Day</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {velocity30.map((v) => (
                            <tr key={v.sku} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-4 font-mono text-xs font-medium text-amber-700">
                                {v.sku}
                              </td>
                              <td className="py-2.5 px-4 font-medium text-slate-800">{v.product_name}</td>
                              <td className="py-2.5 px-4 text-right font-medium text-slate-700">
                                {v.units_sold.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-emerald-600">
                                {v.units_per_day}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: RESTOCKING */}
          {activeTab === 'restocking' && (
            <div className="space-y-6">
              {loadingRestocking ? (
                <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                  Calculating inventory velocity and reorder recommendations...
                </div>
              ) : restocking.length === 0 ? (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm">
                  Add inventory.csv beside app to enable restocking analysis.
                </div>
              ) : (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Restocking Analysis</h3>
                      <p className="text-xs text-slate-500">
                        Based on the last 30 days of sales history and current stock.
                      </p>
                    </div>
                    <button
                      onClick={loadRestocking}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors self-start"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Refresh
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-semibold">
                        <tr>
                          <th className="py-3 px-3">SKU</th>
                          <th className="py-3 px-3">Product Name</th>
                          <th className="py-3 px-3 text-right">Current Stock</th>
                          <th className="py-3 px-3 text-right">Units / Day</th>
                          <th className="py-3 px-3 text-right">Days of Stock</th>
                          <th className="py-3 px-3 text-right">7-Day Demand</th>
                          <th className="py-3 px-3 text-right">14-Day Demand</th>
                          <th className="py-3 px-3 text-right">30-Day Demand</th>
                          <th className="py-3 px-3 text-right">Suggested Reorder</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {restocking.map((item) => {
                          const isLowStock = item.days_of_stock !== null && item.days_of_stock < 14;
                          const hasReorder = item.suggested_reorder > 0;
                          return (
                            <tr
                              key={item.sku}
                              className={`hover:bg-slate-50/80 ${
                                isLowStock ? 'bg-amber-50/30' : ''
                              }`}
                            >
                              <td className="py-3 px-3 font-mono font-medium text-amber-700">
                                {item.sku}
                              </td>
                              <td className="py-3 px-3 font-medium text-slate-900">
                                {item.product_name}
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-slate-900">
                                {item.current_stock.toLocaleString()}
                              </td>
                              <td className="py-3 px-3 text-right text-slate-700">
                                {item.units_per_day}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {item.days_of_stock !== null ? (
                                  <span
                                    className={`px-2 py-0.5 rounded-full font-semibold ${
                                      item.days_of_stock < 10
                                        ? 'bg-rose-100 text-rose-700'
                                        : item.days_of_stock < 20
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {item.days_of_stock} d
                                  </span>
                                ) : (
                                  <span className="text-slate-400">∞</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right text-slate-600">
                                {item.demand_7_days}
                              </td>
                              <td className="py-3 px-3 text-right text-slate-600">
                                {item.demand_14_days}
                              </td>
                              <td className="py-3 px-3 text-right text-slate-600">
                                {item.demand_30_days}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {hasReorder ? (
                                  <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                                    +{item.suggested_reorder}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-medium">0</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-xs text-slate-500 mt-4 italic">
                    Suggested reorder is estimated 30-day demand minus current stock; it is not a final purchasing decision.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
