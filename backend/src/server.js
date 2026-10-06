const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const PipelineRunner = require('./services/PipelineRunner');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ─── Database ──────────────────────────────────────────────────────────────────
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('[Server] MongoDB connected'))
    .catch(err => console.warn('[Server] MongoDB optional — running without persistence:', err.message));
}

// ─── Routes ────────────────────────────────────────────────────────────────────
const runner = new PipelineRunner();

// POST /api/generate
app.post('/api/generate', async (req, res) => {
  try {
    const { jd, company_url, days_available } = req.body;
    
    if (!jd || typeof jd !== 'string') {
      return res.status(400).json({ message: 'jd (job description) is required' });
    }
    
    const kit = await runner.run(jd, company_url || '', parseInt(days_available) || 5);
    return res.json({ kit });
  } catch (e) {
    console.error('[/api/generate] Error:', e.message);
    return res.status(500).json({ message: e.message });
  }
});

// POST /api/regenerate-category
app.post('/api/regenerate-category', async (req, res) => {
  const LLMService = require('./services/LLMService');
  const llm = new LLMService();
  
  try {
    const { requirements, category } = req.body;
    const filteredReqs = (requirements || []).filter(r => {
      if (category === 'technical') return r.kind === 'technical';
      if (category === 'behavioural') return r.kind === 'behavioural';
      return true;
    });
    
    const result = await llm.generateQuestions(filteredReqs);
    const filtered = (result.questions || []).filter(q => q.category === category);
    return res.json({ questions: filtered });
  } catch (e) {
    console.error('[/api/regenerate-category] Error:', e.message);
    return res.status(500).json({ message: e.message });
  }
});

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[Server] Running on http://localhost:${PORT}`));
