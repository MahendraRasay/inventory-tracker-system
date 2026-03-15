const express = require('express');
const router = express.Router();
const Item = require('../models/Item');

// GET all items
router.get('/', async (req, res) => {
    try {
        // Construct query parameters for filtering
        let query = {};
        
        // Search by name
        if (req.query.search) {
            query.name = { $regex: req.query.search, $options: 'i' };
        }
        
        // Filter by category
        if (req.query.category) {
            query.category = req.query.category;
        }
        
        // Filter by stock status
        if (req.query.stockStatus) {
            if (req.query.stockStatus === 'outOfStock') {
                query.quantity = 0;
            } else if (req.query.stockStatus === 'lowStock') {
                query.quantity = { $gt: 0, $lte: req.query.reorderLevel || 10 };
            } else if (req.query.stockStatus === 'inStock') {
                query.quantity = { $gt: req.query.reorderLevel || 10 };
            }
        }

        const items = await Item.find(query).sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        console.error('Error fetching items:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET inventory reports
router.get('/reports/inventory', async (req, res) => {
    try {
        // Get low stock items
        const lowStockItems = await Item.find({
            quantity: { $gt: 0, $lte: 10 }
        }).sort({ quantity: 1 });

        // Get out of stock items
        const outOfStockItems = await Item.find({
            quantity: 0
        });

        // Get total inventory value
        const allItems = await Item.find({});
        const totalValue = allItems.reduce((total, item) => {
            return total + (item.quantity * item.price);
        }, 0);

        // Get inventory by category
        const categories = await Item.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
                    avgPrice: { $avg: '$price' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            lowStockItems,
            outOfStockItems,
            totalValue,
            categories
        });
    } catch (err) {
        console.error('Error generating reports:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET single item
router.get('/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        res.json(item);
    } catch (err) {
        console.error('Error fetching item:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// CREATE new item
router.post('/', async (req, res) => {
    try {
        console.log('Received item data:', req.body);

        const newItem = new Item(req.body);
        
        const savedItem = await newItem.save();
        console.log('Item saved to MongoDB:', savedItem);
        
        res.status(201).json(savedItem);
    } catch (err) {
        console.error('Error creating item:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation error', error: err.message });
        }
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// UPDATE item
router.put('/:id', async (req, res) => {
    try {
        // Set updatedAt to now
        req.body.updatedAt = Date.now();
        
        const updatedItem = await Item.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!updatedItem) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        res.json(updatedItem);
    } catch (err) {
        console.error('Error updating item:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation error', error: err.message });
        }
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// DELETE item
router.delete('/:id', async (req, res) => {
    try {
        const deletedItem = await Item.findByIdAndDelete(req.params.id);
        
        if (!deletedItem) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        res.json({ message: 'Item deleted', item: deletedItem });
    } catch (err) {
        console.error('Error deleting item:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;