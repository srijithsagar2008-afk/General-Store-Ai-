import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  getStoreSummary,
  getTopProducts,
  getMonthlySales,
  getSalesVelocity,
  getProductHistory,
  getRestockingAnalysis,
  buildAiContext,
} from './server/retailData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/summary', (req, res) => {
  try {
    const summary = getStoreSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/top-products', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const top = getTopProducts(limit);
    res.json(top);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/monthly-sales', (req, res) => {
  try {
    const monthly = getMonthlySales();
    res.json(monthly);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/velocity', (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const velocity = getSalesVelocity(days);
    res.json(velocity);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/restocking', (req, res) => {
  try {
    const restocking = getRestockingAnalysis();
    res.json(restocking);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Deterministic or AI search endpoint
async function queryAi(question: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return (
      'Gemini is not configured. Add GEMINI_API_KEY to the environment ' +
      'where this app runs. The dashboard and non-AI analytics still work.'
    );
  }

  let hindsightContext = 'No Hindsight memory available.';
  const hindsightKey = process.env.HINDSIGHT_API_KEY;
  if (hindsightKey) {
    try {
      const bankId = process.env.HINDSIGHT_BANK_ID || '1';
      const hRes = await fetch('https://api.hindsight.vectorize.io/reflect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hindsightKey}`,
        },
        body: JSON.stringify({ bank_id: bankId, query: question }),
      });
      if (hRes.ok) {
        const data = (await hRes.json()) as any;
        hindsightContext = data.text || JSON.stringify(data);
      }
    } catch (hErr: any) {
      hindsightContext = `Hindsight unavailable: ${hErr.message}`;
    }
  }

  const prompt = `You are the AI business assistant for Priya General Store.

Answer the store owner's question using ONLY the store information provided below.
Be practical and concise. Do not invent sales, inventory, prices, suppliers,
weather information, or other facts. If the data is insufficient, say so.

STORE DATA
==========
${buildAiContext()}

HINDSIGHT HISTORICAL MEMORY
===========================
${hindsightContext}

STORE OWNER QUESTION
====================
${question}
`;

  try {
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || 'No response generated from Gemini.';
  } catch (exc: any) {
    return `Gemini error: ${exc.message || exc}`;
  }
}

app.post('/api/query', async (req, res) => {
  const question = req.body?.question?.trim();
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const q = question.toLowerCase();

  // Pattern matches matching original app.py render_question logic
  if (
    ['top', 'best selling', 'highest selling', 'most sold', 'sell the most', 'sold the most', 'most popular'].some((x) =>
      q.includes(x)
    )
  ) {
    const top = getTopProducts(10);
    return res.json({
      type: 'top_products',
      title: 'Top Products',
      data: top,
    });
  }

  if (q.includes('60')) {
    const vel = getSalesVelocity(60);
    return res.json({
      type: 'velocity',
      title: '60-Day Sales Velocity',
      days: 60,
      data: vel,
    });
  }

  if (q.includes('90')) {
    const vel = getSalesVelocity(90);
    return res.json({
      type: 'velocity',
      title: '90-Day Sales Velocity',
      days: 90,
      data: vel,
    });
  }

  if (['fast', 'fastest', 'recent', 'moving', 'velocity'].some((x) => q.includes(x))) {
    const vel = getSalesVelocity(30);
    return res.json({
      type: 'velocity',
      title: '30-Day Sales Velocity',
      days: 30,
      data: vel,
    });
  }

  if (['monthly', 'month by month', 'by month'].some((x) => q.includes(x))) {
    const monthly = getMonthlySales();
    return res.json({
      type: 'monthly_sales',
      title: 'Monthly Sales',
      data: monthly,
    });
  }

  if (['summary', 'overall', 'performance'].some((x) => q.includes(x))) {
    const summary = getStoreSummary();
    return res.json({
      type: 'summary',
      title: 'Store Performance Summary',
      data: summary,
    });
  }

  if (['restock', 'reorder', 'stockout', 'stock out', 'days of stock'].some((x) => q.includes(x))) {
    try {
      const restocking = getRestockingAnalysis();
      return res.json({
        type: 'restocking',
        title: 'Restocking Analysis',
        data: restocking,
        caption: 'Suggested reorder is estimated 30-day demand minus current stock; it is not a final purchasing decision.',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  const prodResult = getProductHistory(question);
  if (prodResult) {
    return res.json({
      type: 'product_history',
      title: prodResult.productName,
      data: prodResult,
    });
  }

  // Fallback to Gemini AI
  try {
    const answer = await queryAi(question);
    return res.json({
      type: 'ai_answer',
      title: 'AI Store Assistant',
      answer,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Vite Middleware for Dev / Static Files for Prod
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
