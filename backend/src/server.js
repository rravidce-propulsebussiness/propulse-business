require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/database');
const industryRoutes = require('./routes/industryRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/industries', industryRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
