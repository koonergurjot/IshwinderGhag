const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Cache static assets for one year
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  maxAge: '1y',
  immutable: true
}));

// Serve remaining static files without aggressive caching
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
