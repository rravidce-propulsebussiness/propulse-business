require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('Express app created');

app.use(cors());
app.use(express.json());

console.log('Middleware registered');

app.get('/health', (req, res) => {
  console.log('Health endpoint hit');
  res.json({ status: 'ok' });
});

console.log('Health route registered');

app.use((req, res) => {
  console.log('404:', req.method, req.path);
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});