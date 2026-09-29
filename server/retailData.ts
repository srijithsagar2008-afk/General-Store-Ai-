import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export interface SalesRecord {
  date: string; // YYYY-MM-DD
  store: string;
  sku: string;
  product_name: string;
  units_sold: number;
}

export interface InventoryItem {
  sku: string;
  product_name: string;
  current_stock: number;
}

export interface RestockingItem {
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

export interface TopProductItem {
  sku: string;
  product_name: string;
  units_sold: number;
}

export interface VelocityItem {
  sku: string;
  product_name: string;
  units_sold: number;
  units_per_day: number;
}

export interface MonthlySalesItem {
  month: string;
  units_sold: number;
}

let cachedSales: SalesRecord[] | null = null;
let cachedInventory: InventoryItem[] | null = null;

const BASE_DIR = process.cwd();

export function loadSales(): SalesRecord[] {
  if (cachedSales) return cachedSales;

  const candidates = [
    path.join(BASE_DIR, 'restocking_sales_history.csv'),
    path.join(BASE_DIR, 'restocking_sales_history.xlsx'),
  ];

  const filePath = candidates.find((p) => fs.existsSync(p));
  if (!filePath) {
    throw new Error(
      'Sales file not found. Put restocking_sales_history.csv beside app.'
    );
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  cachedSales = records.map((r: any) => ({
    date: r.date?.split('T')[0] || r.date,
    store: r.store || '',
    sku: r.sku || '',
    product_name: r.product_name || '',
    units_sold: Number(r.units_sold) || 0,
  }));

  return cachedSales;
}

export function loadInventory(): InventoryItem[] | null {
  if (cachedInventory) return cachedInventory;

  const invPath = path.join(BASE_DIR, 'inventory.csv');
  if (!fs.existsSync(invPath)) {
    return null;
  }

  const fileContent = fs.readFileSync(invPath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  cachedInventory = records.map((r: any) => ({
    sku: r.sku || '',
    product_name: r.product_name || '',
    current_stock: Number(r.current_stock) || 0,
  }));

  return cachedInventory;
}

export function getStoreSummary() {
  const sales = loadSales();
  const inventory = loadInventory();

  if (sales.length === 0) {
    return {
      totalUnitsSold: 0,
      totalRecords: 0,
      firstDate: null,
      lastDate: null,
      hasInventory: inventory !== null,
    };
  }

  let totalUnits = 0;
  let minDate = sales[0].date;
  let maxDate = sales[0].date;

  for (const s of sales) {
    totalUnits += s.units_sold;
    if (s.date < minDate) minDate = s.date;
    if (s.date > maxDate) maxDate = s.date;
  }

  return {
    totalUnitsSold: totalUnits,
    totalRecords: sales.length,
    firstDate: minDate,
    lastDate: maxDate,
    hasInventory: inventory !== null,
  };
}

export function getTopProducts(limit = 10): TopProductItem[] {
  const sales = loadSales();
  const map = new Map<string, { sku: string; product_name: string; units_sold: number }>();

  for (const s of sales) {
    const key = `${s.sku}:::${s.product_name}`;
    const curr = map.get(key);
    if (curr) {
      curr.units_sold += s.units_sold;
    } else {
      map.set(key, { sku: s.sku, product_name: s.product_name, units_sold: s.units_sold });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.units_sold - a.units_sold)
    .slice(0, limit);
}

export function getMonthlySales(): MonthlySalesItem[] {
  const sales = loadSales();
  const map = new Map<string, number>();

  for (const s of sales) {
    const month = s.date.substring(0, 7); // YYYY-MM
    map.set(month, (map.get(month) || 0) + s.units_sold);
  }

  return Array.from(map.entries())
    .map(([month, units_sold]) => ({ month, units_sold }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function getSalesVelocity(days: number): VelocityItem[] {
  const sales = loadSales();
  if (sales.length === 0) return [];

  let maxDate = sales[0].date;
  for (const s of sales) {
    if (s.date > maxDate) maxDate = s.date;
  }

  const latest = new Date(maxDate + 'T00:00:00Z');
  const start = new Date(latest.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const startDateStr = start.toISOString().split('T')[0];

  const map = new Map<string, { sku: string; product_name: string; units_sold: number }>();

  for (const s of sales) {
    if (s.date >= startDateStr && s.date <= maxDate) {
      const key = `${s.sku}:::${s.product_name}`;
      const curr = map.get(key);
      if (curr) {
        curr.units_sold += s.units_sold;
      } else {
        map.set(key, { sku: s.sku, product_name: s.product_name, units_sold: s.units_sold });
      }
    }
  }

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      units_per_day: Number((item.units_sold / days).toFixed(2)),
    }))
    .sort((a, b) => b.units_per_day - a.units_per_day);
}

export function getProductHistory(question: string) {
  const sales = loadSales();
  const products = Array.from(new Set(sales.map((s) => s.product_name)));
  const q = question.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 3);

  const matched = products.find((prod) =>
    words.some((w) => prod.toLowerCase().includes(w))
  );

  if (!matched) return null;

  const productSales = sales.filter((s) => s.product_name === matched);
  let totalUnits = 0;
  const monthMap = new Map<string, number>();

  for (const s of productSales) {
    totalUnits += s.units_sold;
    const month = s.date.substring(0, 7);
    monthMap.set(month, (monthMap.get(month) || 0) + s.units_sold);
  }

  const monthly = Array.from(monthMap.entries())
    .map(([month, units_sold]) => ({ month, units_sold }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    productName: matched,
    totalUnitsSold: totalUnits,
    monthly,
  };
}

export function getRestockingAnalysis(): RestockingItem[] {
  const sales = loadSales();
  const inventory = loadInventory();

  if (!inventory) {
    throw new Error(
      'inventory.csv is missing. Put it beside app to enable restocking analysis.'
    );
  }

  let maxDate = sales[0].date;
  for (const s of sales) {
    if (s.date > maxDate) maxDate = s.date;
  }

  const latest = new Date(maxDate + 'T00:00:00Z');
  const start = new Date(latest.getTime() - 29 * 24 * 60 * 60 * 1000);
  const startDateStr = start.toISOString().split('T')[0];

  const velocityMap = new Map<string, number>();
  for (const s of sales) {
    if (s.date >= startDateStr && s.date <= maxDate) {
      velocityMap.set(s.sku, (velocityMap.get(s.sku) || 0) + s.units_sold);
    }
  }

  return inventory.map((item) => {
    const units30 = velocityMap.get(item.sku) || 0;
    const unitsPerDay = Number((units30 / 30).toFixed(2));
    const daysOfStock = unitsPerDay > 0 ? Number((item.current_stock / unitsPerDay).toFixed(1)) : null;
    const demand7 = Number((unitsPerDay * 7).toFixed(1));
    const demand14 = Number((unitsPerDay * 14).toFixed(1));
    const demand30 = Number((unitsPerDay * 30).toFixed(1));
    const suggestedReorder = Math.max(0, Math.round(demand30 - item.current_stock));

    return {
      sku: item.sku,
      product_name: item.product_name,
      current_stock: item.current_stock,
      units_sold_30_days: units30,
      units_per_day: unitsPerDay,
      days_of_stock: daysOfStock,
      demand_7_days: demand7,
      demand_14_days: demand14,
      demand_30_days: demand30,
      suggested_reorder: suggestedReorder,
    };
  });
}

export function buildAiContext(): string {
  const summary = getStoreSummary();
  const top = getTopProducts(10);
  const velocity = getSalesVelocity(30);
  const inventory = loadInventory();

  const topString = top
    .map((p, i) => `${i + 1}. [${p.sku}] ${p.product_name}: ${p.units_sold} units`)
    .join('\n');

  const velocityString = velocity
    .map((v) => `[${v.sku}] ${v.product_name}: ${v.units_sold} in 30 days (${v.units_per_day}/day)`)
    .join('\n');

  const invString = inventory
    ? inventory.map((inv) => `[${inv.sku}] ${inv.product_name}: ${inv.current_stock} in stock`).join('\n')
    : 'No inventory data available.';

  return [
    'PRIYA GENERAL STORE SALES DATA',
    `Data through: ${summary.lastDate}`,
    `Total records: ${summary.totalRecords}, Total units sold: ${summary.totalUnitsSold}`,
    '',
    'TOP PRODUCTS:',
    topString,
    '',
    'RECENT SALES VELOCITY (LAST 30 DAYS):',
    velocityString,
    '',
    'CURRENT INVENTORY:',
    invString,
  ].join('\n');
}
