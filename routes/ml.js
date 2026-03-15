
const express = require('express');
const router = express.Router();
const forecaster = require('../utils/ml/forecaster');
const anomalyDetector = require('../utils/ml/anomalyDetector');
const Item = require('../models/Item');

// Test route to verify API is working
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'ML API is working' });
});

// Train all ML models
router.post('/train', async (req, res) => {
    try {
        console.log('Training ML models...');

        const items = await Item.find({});
        console.log(`Found ${items.length} items for training`);
        
        if (items.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Not enough data to train models. Add at least 3 items.'
            });
        }
        
        // Train each model (without categoryRecommender)
        const forecastResults = await forecaster.train(items);
        const anomalyResults = await anomalyDetector.train(items);
        
        console.log(`Training complete: ${forecastResults} items forecasted, ${anomalyResults} anomaly categories`);
        
        res.json({
            success: true,
            message: 'ML models trained successfully',
            stats: {
                forecastedItems: forecastResults,
                anomalyCategories: anomalyResults,
                trainedAt: new Date()
            }
        });
    } catch (err) {
        console.error('Error training ML models:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to train ML models',
            error: err.message
        });
    }
});

// Get forecasts for all items
router.get('/forecast', async (req, res) => {
    try {
        console.log('Forecast API called with query:', req.query);
        const days = parseInt(req.query.days) || 7;
        const itemId = req.query.itemId;
        
        const query = {};
        if (itemId) {
            query._id = itemId;
        }

        const items = await Item.find(query);
        console.log(`Found ${items.length} items for forecast`);
        
        if (items.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No items found'
            });
        }
        
        console.log('Generating forecasts...');
        // Generate forecasts
        const forecasts = forecaster.forecastAll(items, days);
        console.log(`Generated forecasts for ${Object.keys(forecasts).length} items`);
        
        res.json({
            success: true,
            forecasts: Object.values(forecasts),
            days
        });
    } catch (err) {
        console.error('Error generating forecasts:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to generate forecasts',
            error: err.message
        });
    }
});

// Detect anomalies in inventory data
router.get('/anomalies', async (req, res) => {
    try {
        console.log('Anomaly detection API called');

        const items = await Item.find({});
        console.log(`Found ${items.length} items for anomaly detection`);
        
        if (items.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No items found'
            });
        }
        
        // Detect anomalies
        const anomalies = anomalyDetector.detect(items);
        console.log(`Detected ${anomalies.length} anomalies`);
        
        res.json({
            success: true,
            anomalies
        });
    } catch (err) {
        console.error('Error detecting anomalies:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to detect anomalies',
            error: err.message
        });
    }
});

module.exports = router;