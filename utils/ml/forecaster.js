
const fs = require('fs');
const path = require('path');
const ss = require('simple-statistics');
const regression = require('regression');

// Create directories if they don't exist
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const MODEL_DIR = path.join(DATA_DIR, 'models');
if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
}

class SimpleForecaster {
    constructor() {
        this.models = {};
        this.modelPath = path.join(MODEL_DIR, 'forecaster_models.json');
    }

    // Generate historical data based on current quantities
    generateHistory(items) {
        const history = {};
        
        items.forEach(item => {
            const itemId = item._id.toString();
            const currentQty = parseInt(item.quantity) || 0;
            
            // Generate 30 days of history
            // This creates a realistic time series with some noise
            let quantity = Math.max(5, currentQty / 2); // Start with half current qty
            const timeSeries = [];
            
            for (let day = 0; day < 30; day++) {
                // Add some random variation
                const change = Math.floor(Math.random() * 5) - 2;
                quantity = Math.max(0, quantity + change);
                
                // Add a general trend towards current quantity
                const trend = (currentQty - quantity) * 0.1;
                quantity = Math.max(0, quantity + trend);
                
                // Add to time series [day, quantity]
                timeSeries.push([day, Math.round(quantity)]);
            }
            
            // Add current quantity as latest point
            timeSeries.push([30, currentQty]);
            
            history[itemId] = timeSeries;
        });
        
        return history;
    }

    // Train forecasting models
    train(items) {
        if (!items || items.length === 0) {
            return 0;
        }
        
        // Generate history data
        const history = this.generateHistory(items);
        
        // Train regression model for each item
        this.models = {};
        
        for (const [itemId, timeSeries] of Object.entries(history)) {
            if (timeSeries.length < 7) continue; // Skip if not enough data
            
            try {
                // Train a polynomial regression model (degree 2)
                const result = regression.polynomial(timeSeries, { order: 2 });
                
                // Store model parameters and item stats
                const item = items.find(i => i._id.toString() === itemId);
                this.models[itemId] = {
                    equation: result.equation,
                    r2: result.r2, // goodness of fit
                    points: timeSeries,
                    name: item.name,
                    category: item.category,
                    currentQuantity: parseInt(item.quantity) || 0
                };
            } catch (err) {
                console.error(`Error training model for item ${itemId}:`, err);
            }
        }
        
        // Save models to disk
        try {
            fs.writeFileSync(this.modelPath, JSON.stringify(this.models));
        } catch (err) {
            console.error('Error saving forecaster models:', err);
        }
        
        return Object.keys(this.models).length;
    }

    // Load models from disk
    load() {
        try {
            if (fs.existsSync(this.modelPath)) {
                this.models = JSON.parse(fs.readFileSync(this.modelPath, 'utf8'));
                return true;
            }
        } catch (err) {
            console.error('Error loading forecaster models:', err);
        }
        return false;
    }

    // Forecast future inventory for a specific item
    forecast(itemId, days = 7) {
        // Load models if not already loaded
        if (Object.keys(this.models).length === 0) {
            this.load();
        }
        
        const model = this.models[itemId];
        if (!model) return null;
        
        try {
            const [a, b, c] = model.equation;
            const startDay = 31; // Start forecasting from day after current
            
            // Generate forecast for specified days
            const forecast = [];
            
            for (let i = 0; i < days; i++) {
                const day = startDay + i;
                // Calculate using polynomial equation: ax² + bx + c
                const predicted = a * day * day + b * day + c;
                // Ensure non-negative and round to integer
                forecast.push(Math.max(0, Math.round(predicted)));
            }
            
            return forecast;
        } catch (err) {
            console.error(`Error forecasting for item ${itemId}:`, err);
            return null;
        }
    }

    // Forecast for all items
    forecastAll(items, days = 7) {
        console.log(`forecastAll called with ${items.length} items and ${days} days`);
        
        // Load models if not already loaded
        if (Object.keys(this.models).length === 0) {
            console.log('No models loaded, attempting to load from disk');
            const loaded = this.load();
            console.log(`Models loaded from disk: ${loaded}`);
            
            // If no models loaded, train on the items
            if (Object.keys(this.models).length === 0) {
                console.log('No saved models found, training new models');
                this.train(items);
            }
        }
        
        const forecasts = {};
        
        console.log(`Models available for ${Object.keys(this.models).length} items`);
        
        items.forEach(item => {
            try {
                const itemId = item._id.toString();
                console.log(`Forecasting for item ${itemId}`);
                const forecast = this.forecast(itemId, days);
                
                if (forecast) {
                    // Check if stock out predicted and determine trend
                    const willStockOut = forecast.some(qty => qty <= 0);
                    const trend = forecast[forecast.length - 1] > forecast[0] ? 'up' : 
                                  forecast[forecast.length - 1] < forecast[0] ? 'down' : 'stable';
                    
                    forecasts[itemId] = {
                        itemId,
                        name: item.name,
                        category: item.category,
                        currentQuantity: parseInt(item.quantity) || 0,
                        forecast,
                        willStockOut,
                        trend
                    };
                } else {
                    console.log(`No forecast generated for item ${itemId}`);
                }
            } catch (err) {
                console.error(`Error in forecast for item ${item._id}:`, err);
            }
        });
        
        console.log(`Returning forecasts for ${Object.keys(forecasts).length} items`);
        return forecasts;
    }
}

module.exports = new SimpleForecaster();