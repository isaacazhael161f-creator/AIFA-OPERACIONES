// Simple static server for AIFA-OPERACIONES to avoid file:// CORS issues
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname);

// Enable CORS for local development (optional but handy)
app.use(cors());

// Helpful headers for local PDFs and static assets
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Serve all static files from the repository root
app.use(express.static(ROOT, { index: 'index.html' }));

app.get('*', (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AIFA-OPERACIONES dev server running at http://localhost:${PORT}`);
});
