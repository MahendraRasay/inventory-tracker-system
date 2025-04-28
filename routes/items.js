const express = require('express');
const router = express.Router();
const Item = require('../models/Item');

// Demo data for in-memory fallback when MongoDB is not available
let demoItems = [
    {
        _id: '1',
        name: 'Laptop',
        description: 'High-performance laptop for professionals',
        category: 'Electronics',
        quantity: 25,
        price: 1299.99,
        supplierName: 'Tech Solutions Inc',
        supplierContact: 'sales@techsolutions.com',
        reorderLevel: 5,
        location: 'Warehouse A, Shelf 12',
        createdAt: new Date('2023-01-15'),
        updatedAt: new Date('2023-03-10')
    },
    {
        _id: '2',
        name: 'Office Chair',
        description: 'Ergonomic office chair with lumbar support',
        category: 'Furniture',
        quantity: 40,
        price: 249.99,
        supplierName: 'Office Comfort Co',
        supplierContact: 'orders@officecomfort.com',
        reorderLevel: 10,
        location: 'Warehouse B, Section 5',
        createdAt: new Date('2023-02-20'),
        updatedAt: new Date('2023-02-20')
    },
    {
        _id: '3',
        name: 'Wireless Mouse',
        description: 'Wireless optical mouse with long battery life',
        category: 'Electronics',
        quantity: 8,
        price: 39.99,
        supplierName: 'Tech Solutions Inc',
        supplierContact: 'sales@techsolutions.com',
        reorderLevel: 15,
        location: 'Warehouse A, Shelf 3',
        createdAt: new Date('2023-03-05'),
        updatedAt: new Date('2023-03-05')
    },
    {
        _id: '4',
        name: 'Desk Lamp',
        description: 'Adjustable LED desk lamp with multiple brightness levels',
        category: 'Office Supplies',
        quantity: 0,
        price: 59.99,
        supplierName: 'Office Comfort Co',
        supplierContact: 'orders@officecomfort.com',
        reorderLevel: 8,
        location: 'Warehouse B, Section 2',
        createdAt: new Date('2023-01-30'),
        updatedAt: new Date('2023-04-02')
    },
    {
        _id: '5',
        name: 'Printer Paper',
        description: 'Premium A4 printer paper, 500 sheets per ream',
        category: 'Office Supplies',
        quantity: 150,
        price: 12.99,
        supplierName: 'Paper Suppliers Ltd',
        supplierContact: 'info@papersuppliers.com',
        reorderLevel: 30,
        location: 'Warehouse C, Rack 7',
        createdAt: new Date('2023-02-10'),
        updatedAt: new Date('2023-03-15')
    },
    {
        _id: '6',
        name: 'External Hard Drive',
        description: '2TB external hard drive with USB-C connection',
        category: 'Electronics',
        quantity: 3,
        price: 99.99,
        supplierName: 'Tech Solutions Inc',
        supplierContact: 'sales@techsolutions.com',
        reorderLevel: 5,
        location: 'Warehouse A, Shelf 7',
        createdAt: new Date('2023-03-20'),
        updatedAt: new Date('2023-03-20')
    },
    {
        _id: '7',
        name: 'Conference Table',
        description: 'Large conference table for meeting rooms',
        category: 'Furniture',
        quantity: 2,
        price: 1499.99,
        supplierName: 'Office Comfort Co',
        supplierContact: 'orders@officecomfort.com',
        reorderLevel: 1,
        location: 'Warehouse B, Section 1',
        createdAt: new Date('2023-01-05'),
        updatedAt: new Date('2023-01-05')
    },
    {
        _id: '8',
        name: 'Whiteboard',
        description: 'Magnetic whiteboard with aluminum frame, 4x6 feet',
        category: 'Office Supplies',
        quantity: 12,
        price: 129.99,
        supplierName: 'Office Comfort Co',
        supplierContact: 'orders@officecomfort.com',
        reorderLevel: 3,
        location: 'Warehouse B, Section 4',
        createdAt: new Date('2023-02-25'),
        updatedAt: new Date('2023-04-01')
    }
];

// Flag to determine if MongoDB connection is available
// This will be updated by the server
let isMongoConnected = true;
try {
    isMongoConnected = global.isMongoConnected;
} catch (e) {
    console.log('MongoDB connection status not available, defaulting to true');
}

// GET all items
router.get('/', async (req, res) => {
    try {
        // If MongoDB is not connected, use demo data
        if (!isMongoConnected) {
            console.log('Using demo data for GET /items');
            let filteredItems = [...demoItems];
            
            // Apply filters to demo data
            if (req.query.search) {
                const searchTerm = req.query.search.toLowerCase();
                filteredItems = filteredItems.filter(item => 
                    item.name.toLowerCase().includes(searchTerm));
            }
            
            if (req.query.category) {
                filteredItems = filteredItems.filter(item => 
                    item.category === req.query.category);
            }
            
            if (req.query.stockStatus) {
                if (req.query.stockStatus === 'outOfStock') {
                    filteredItems = filteredItems.filter(item => item.quantity === 0);
                } else if (req.query.stockStatus === 'lowStock') {
                    const reorderLevel = parseInt(req.query.reorderLevel) || 10;
                    filteredItems = filteredItems.filter(item => 
                        item.quantity > 0 && item.quantity <= reorderLevel);
                } else if (req.query.stockStatus === 'inStock') {
                    const reorderLevel = parseInt(req.query.reorderLevel) || 10;
                    filteredItems = filteredItems.filter(item => 
                        item.quantity > reorderLevel);
                }
            }
            
            // Sort by createdAt descending
            filteredItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            return res.json(filteredItems);
        }
        
        // Normal MongoDB operation
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
        
        // If error, fallback to demo data
        console.log('Error with MongoDB query, using demo data instead');
        let filteredItems = [...demoItems];
        
        // Sort by createdAt descending
        filteredItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json(filteredItems);
    }
});

// Need to move reports route before the :id route to avoid conflict
// GET inventory reports
router.get('/reports/inventory', async (req, res) => {
    try {
        // If MongoDB is not connected, use demo data
        if (!isMongoConnected) {
            console.log('Using demo data for GET /items/reports/inventory');
            
            // Calculate low stock items
            const lowStockItems = demoItems.filter(item => 
                item.quantity > 0 && item.quantity <= item.reorderLevel);
            
            // Calculate out of stock items
            const outOfStockItems = demoItems.filter(item => item.quantity <= 0);
            
            // Calculate total inventory value
            const totalValue = demoItems.reduce((total, item) => {
                return total + (item.quantity * item.price);
            }, 0);
            
            // Calculate inventory by category
            const categoryMap = {};
            demoItems.forEach(item => {
                if (!categoryMap[item.category]) {
                    categoryMap[item.category] = {
                        _id: item.category,
                        count: 0,
                        totalValue: 0,
                        totalPrice: 0
                    };
                }
                
                categoryMap[item.category].count++;
                categoryMap[item.category].totalValue += item.quantity * item.price;
                categoryMap[item.category].totalPrice += item.price;
            });
            
            const categories = Object.values(categoryMap).map(cat => ({
                _id: cat._id,
                count: cat.count,
                totalValue: cat.totalValue,
                avgPrice: cat.totalPrice / cat.count
            }));
            
            return res.json({
                lowStockItems,
                outOfStockItems,
                totalValue,
                categories
            });
        }
        
        // Normal MongoDB operation
        // Get low stock items
        const lowStockItems = await Item.find({
            quantity: { $gt: 0, $lte: 10 }
        }).sort({ quantity: 1 });

        // Get out of stock items
        const outOfStockItems = await Item.find({
            quantity: 0
        });

        // Get total inventory value
        const allItems = await Item.find();
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
        
        // Fallback to demo data
        console.log('Error with MongoDB query, using demo data instead');
        
        // Calculate low stock items
        const lowStockItems = demoItems.filter(item => 
            item.quantity > 0 && item.quantity <= item.reorderLevel);
        
        // Calculate out of stock items
        const outOfStockItems = demoItems.filter(item => item.quantity <= 0);
        
        // Calculate total inventory value
        const totalValue = demoItems.reduce((total, item) => {
            return total + (item.quantity * item.price);
        }, 0);
        
        // Calculate inventory by category
        const categoryMap = {};
        demoItems.forEach(item => {
            if (!categoryMap[item.category]) {
                categoryMap[item.category] = {
                    _id: item.category,
                    count: 0,
                    totalValue: 0,
                    totalPrice: 0
                };
            }
            
            categoryMap[item.category].count++;
            categoryMap[item.category].totalValue += item.quantity * item.price;
            categoryMap[item.category].totalPrice += item.price;
        });
        
        const categories = Object.values(categoryMap).map(cat => ({
            _id: cat._id,
            count: cat.count,
            totalValue: cat.totalValue,
            avgPrice: cat.totalPrice / cat.count
        }));
        
        res.json({
            lowStockItems,
            outOfStockItems,
            totalValue,
            categories
        });
    }
});

// GET single item
router.get('/:id', async (req, res) => {
    try {
        // If MongoDB is not connected, use demo data
        if (!isMongoConnected) {
            console.log('Using demo data for GET /items/:id');
            const item = demoItems.find(item => item._id === req.params.id);
            if (!item) {
                return res.status(404).json({ message: 'Item not found' });
            }
            return res.json(item);
        }
        
        // Normal MongoDB operation
        const item = await Item.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.json(item);
    } catch (err) {
        console.error('Error fetching item:', err);
        
        // Try to find item in demo data as fallback
        console.log('Error with MongoDB query, using demo data instead');
        const item = demoItems.find(item => item._id === req.params.id);
        if (item) {
            return res.json(item);
        }
        
        res.status(404).json({ message: 'Item not found' });
    }
});

// CREATE new item
router.post('/', async (req, res) => {
    try {
        // If MongoDB is not connected, use demo data
        if (!isMongoConnected) {
            console.log('Using demo data for POST /items');
            const newItem = {
                _id: (demoItems.length + 1).toString(),
                ...req.body,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            demoItems.push(newItem);
            return res.status(201).json(newItem);
        }
        
        // Normal MongoDB operation
        const newItem = new Item(req.body);
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (err) {
        console.error('Error creating item:', err);
        
        // Fallback to demo data
        console.log('Error with MongoDB query, using demo data instead');
        const newItem = {
            _id: (demoItems.length + 1).toString(),
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        demoItems.push(newItem);
        res.status(201).json(newItem);
    }
});

// UPDATE item
router.put('/:id', async (req, res) => {
    try {
        // If MongoDB is not connected, use demo data
        if (!isMongoConnected) {
            console.log('Using demo data for PUT /items/:id');
            const index = demoItems.findIndex(item => item._id === req.params.id);
            if (index === -1) {
                return res.status(404).json({ message: 'Item not found' });
            }
            
            // Update the item
            req.body.updatedAt = new Date();
            demoItems[index] = { ...demoItems[index], ...req.body };
            return res.json(demoItems[index]);
        }
        
        // Normal MongoDB operation
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
        
        // Try to update in demo data as fallback
        console.log('Error with MongoDB query, using demo data instead');
        const index = demoItems.findIndex(item => item._id === req.params.id);
        if (index !== -1) {
            // Update the item
            req.body.updatedAt = new Date();
            demoItems[index] = { ...demoItems[index], ...req.body };
            return res.json(demoItems[index]);
        }
        
        res.status(404).json({ message: 'Item not found' });
    }
});

// DELETE item
router.delete('/:id', async (req, res) => {
    try {
        // If MongoDB is not connected, use demo data
        if (!isMongoConnected) {
            console.log('Using demo data for DELETE /items/:id');
            const index = demoItems.findIndex(item => item._id === req.params.id);
            if (index === -1) {
                return res.status(404).json({ message: 'Item not found' });
            }
            
            // Remove the item
            const deletedItem = demoItems.splice(index, 1)[0];
            return res.json({ message: 'Item deleted', item: deletedItem });
        }
        
        // Normal MongoDB operation
        const deletedItem = await Item.findByIdAndDelete(req.params.id);
        if (!deletedItem) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.json({ message: 'Item deleted', item: deletedItem });
    } catch (err) {
        console.error('Error deleting item:', err);
        
        // Try to delete from demo data as fallback
        console.log('Error with MongoDB query, using demo data instead');
        const index = demoItems.findIndex(item => item._id === req.params.id);
        if (index !== -1) {
            // Remove the item
            const deletedItem = demoItems.splice(index, 1)[0];
            return res.json({ message: 'Item deleted', item: deletedItem });
        }
        
        res.status(404).json({ message: 'Item not found' });
    }
});

// Duplicate route removed

module.exports = router;
