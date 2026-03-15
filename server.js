const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const itemsRouter = require('./routes/items');
const mlRouter = require('./routes/ml');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/inventory_management')
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/items', itemsRouter);
app.use('/api/ml', mlRouter);

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/inventory', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'inventory.html'));
});

app.get('/reports', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'reports.html'));
});

app.get('/ml-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'ml-dashboard.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});