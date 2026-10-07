const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// ─── Environment Validation ──────────────────────────────────────────────────
const requiredEnvVars = ['JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`[Fatal] Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

let mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  const { MONGO_USER, MONGO_PASSWORD, MONGO_HOST, MONGO_DB } = process.env;
  if (!MONGO_USER || !MONGO_PASSWORD || !MONGO_HOST || !MONGO_DB) {
    console.error('[Fatal] Missing MongoDB configuration. Provide either MONGODB_URI, or MONGO_USER, MONGO_PASSWORD, MONGO_HOST, and MONGO_DB.');
    process.exit(1);
  }
  mongoUri = `mongodb+srv://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PASSWORD)}@${MONGO_HOST}/${MONGO_DB}?retryWrites=true&w=majority`;
}

const PipelineRunner = require('./services/PipelineRunner');

const cookieParser = require('cookie-parser');

const app = express();
app.use(cors());

// Body parser with error handling (catches invalid JSON so it doesn't return HTML)
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ code: 400, message: 'Invalid JSON payload' });
  }
  next(err);
});

// ─── Database ──────────────────────────────────────────────────────────────────
mongoose.connect(mongoUri, { family: 4 })
  .then(() => console.log('[Server] MongoDB connected'))
  .catch(err => {
    console.error('[Fatal] MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ─── Routes ────────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const kitRoutes = require('./routes/kits');

app.use('/api/auth', authRoutes);
app.use('/api/kits', kitRoutes);
const runner = new PipelineRunner();

// POST /api/generate
app.post('/api/generate', async (req, res, next) => {
  try {
    const { jd, company_url, days_available } = req.body;
    
    if (!jd || typeof jd !== 'string') {
      return res.status(400).json({ message: 'jd (job description) is required' });
    }
    
    const kit = await runner.run(jd, company_url || '', parseInt(days_available) || 5);
    return res.json({ kit });
  } catch (e) {
    next(e);
  }
});

// POST /api/regenerate-category
app.post('/api/regenerate-category', async (req, res, next) => {
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
    next(e);
  }
});

// Health check
app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  const status = isConnected ? 200 : 503;
  res.status(status).json({ 
    status: isConnected ? 'ok' : 'error', 
    timestamp: new Date().toISOString(),
    db: isConnected ? 'connected' : 'disconnected'
  });
});

// ─── 404 Handler (Guarantees JSON) ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ code: 404, message: 'Route not found' });
});

// ─── Global Error Handler (Guarantees JSON) ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack || err.message);
  res.status(500).json({ 
    code: 500, 
    message: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[Server] Running on http://localhost:${PORT}`));
