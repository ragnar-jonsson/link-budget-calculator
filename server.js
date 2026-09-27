// server.js
// Simple Express HTTP API exposing the link-budget calculator for AI consumption.
// POST /compute   body: { inputOverrides: { ... } }
// Returns the full JSON result from compute().

const express = require('express');
const bodyParser = require('body-parser');
const { compute } = require('./channel_capacity_calc');

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

app.get('/ping', (req, res) => res.json({ status: 'ok' }));

app.post('/compute', (req, res) => {
  const overrides = req.body.inputOverrides || {};
  try {
    const result = compute(overrides);
    res.json({ success: true, result });
  } catch (err) {
    console.error('Compute error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(Link-budget calculator API listening on port );
});
