const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const itemsRouter = require('./routes/items');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
// For demo purposes, we'll handle MongoDB connection errors gracefully
global.isMongoConnected = false;

mongoose.connect('mongodb://localhost:27017/inventory_management', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000 // Reduce timeout for faster fallback
})
.then(() => {
    console.log('MongoDB connected successfully');
    global.isMongoConnected = true;
})
.catch(err => {
    console.log('MongoDB connection error (expected in demo environment):', err.message);
    console.log('Running with in-memory demo mode - data will not persist');
    // Make sure global variable is set to false when MongoDB connection fails
    global.isMongoConnected = false;
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/items', itemsRouter);

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
