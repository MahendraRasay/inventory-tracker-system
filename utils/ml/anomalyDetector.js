
const fs = require('fs');
const path = require('path');
const ss = require('simple-statistics');

// Create directories if they don't exist
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const MODEL_DIR = path.join(DATA_DIR, 'models');
if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
}

class SimpleAnomalyDetector {
    constructor() {
        this.stats = {};
        this.modelPath = path.join(MODEL_DIR, 'anomaly_detector.json');
    }

    // Train the anomaly detection model
    train(items) {
        if (!items || items.length < 5) {
            return 0;
        }
        
        // Group items by category
        const categories = {};
        items.forEach(item => {
            const category = item.category || 'Uncategorized';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(item);
        });
        
        // Calculate statistics for each category
        this.stats = {};
        
        Object.entries(categories).forEach(([category, categoryItems]) => {
            if (categoryItems.length < 3) return; // Need at least 3 items
            
            // Extract numerical features
            const quantities = categoryItems.map(item => parseInt(item.quantity) || 0);
            const prices = categoryItems.map(item => parseFloat(item.price) || 0);
            
            // Calculate statistics
            this.stats[category] = {
                quantity: {
                    mean: ss.mean(quantities),
                    std: ss.standardDeviation(quantities) || 1, // Avoid division by zero
                    median: ss.median(quantities),
                    min: Math.min(...quantities),
                    max: Math.max(...quantities)
                },
                price: {
                    mean: ss.mean(prices),
                    std: ss.standardDeviation(prices) || 1, // Avoid division by zero
                    median: ss.median(prices),
                    min: Math.min(...prices),
                    max: Math.max(...prices)
                }
            };
        });
        
        // Save model to disk
        try {
            fs.writeFileSync(this.modelPath, JSON.stringify(this.stats));
        } catch (err) {
            console.error('Error saving anomaly detector model:', err);
        }
        
        return Object.keys(this.stats).length;
    }

    // Load model from disk
    load() {
        try {
            if (fs.existsSync(this.modelPath)) {
                this.stats = JSON.parse(fs.readFileSync(this.modelPath, 'utf8'));
                return true;
            }
        } catch (err) {
            console.error('Error loading anomaly detector model:', err);
        }
        return false;
    }

    // Detect anomalies in inventory data
    detect(items) {
        if (!items || items.length === 0) {
            return [];
        }
        
        // Load model if not already loaded
        if (Object.keys(this.stats).length === 0) {
            this.load();
        }
        
        const anomalies = [];
        
        // Check each item for anomalies
        items.forEach(item => {
            const category = item.category || 'Uncategorized';
            const stats = this.stats[category];
            
            // Skip if no stats for this category
            if (!stats) return;
            
            const quantity = parseInt(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            const reasons = [];
            
            // Calculate z-scores
            const quantityZScore = Math.abs((quantity - stats.quantity.mean) / stats.quantity.std);
            const priceZScore = Math.abs((price - stats.price.mean) / stats.price.std);
            
            // Check for quantity anomalies (z-score > 2)
            if (quantityZScore > 2) {
                reasons.push(quantity > stats.quantity.mean ? 
                    'unusually high quantity' : 'unusually low quantity');
            }
            
            // Check for price anomalies (z-score > 2)
            if (priceZScore > 2) {
                reasons.push(price > stats.price.mean ? 
                    'unusually high price' : 'unusually low price');
            }
            
            // Add to anomalies if reasons found
            if (reasons.length > 0) {
                anomalies.push({
                    item,
                    reasons,
                    score: Math.max(quantityZScore, priceZScore),
                    stats: {
                        quantityZScore,
                        priceZScore,
                        categoryAvgQuantity: stats.quantity.mean,
                        categoryAvgPrice: stats.price.mean
                    }
                });
            }
        });
        
        // Sort by anomaly score (highest first)
        return anomalies.sort((a, b) => b.score - a.score);
    }
}

module.exports = new SimpleAnomalyDetector();