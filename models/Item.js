const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0, 'Quantity cannot be negative']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    supplierName: {
        type: String,
        trim: true
    },
    supplierContact: {
        type: String,
        trim: true
    },
    reorderLevel: {
        type: Number,
        default: 10,
        min: 0
    },
    location: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
ItemSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for total value
ItemSchema.virtual('totalValue').get(function() {
    return this.quantity * this.price;
});

// Virtual for stock status
ItemSchema.virtual('stockStatus').get(function() {
    if (this.quantity <= 0) {
        return 'Out of Stock';
    } else if (this.quantity <= this.reorderLevel) {
        return 'Low Stock';
    } else {
        return 'In Stock';
    }
});

module.exports = mongoose.model('Item', ItemSchema);
