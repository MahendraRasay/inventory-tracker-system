/**
 * Inventory Management System
 * Reports JavaScript file
 */

// Global variables for charts
let stockStatusChart = null;
let categoryItemsChart = null;
let categoryValueChart = null;

document.addEventListener('DOMContentLoaded', function() {
    // Load reports data
    loadReportsData();
    
    // Print report button event
    document.getElementById('printReportBtn').addEventListener('click', printReport);
    
    // Tab change event for charts resize
    document.querySelectorAll('a[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(e) {
            // Resize charts when tab becomes visible
            if (e.target.id === 'category-tab' && categoryItemsChart) {
                categoryItemsChart.resize();
            }
            if (e.target.id === 'value-tab' && categoryValueChart) {
                categoryValueChart.resize();
            }
        });
    });
});

/**
 * Load all reports data
 */
async function loadReportsData() {
    try {
        // Fetch all items
        const items = await fetchApi('/items');
        
        // Fetch inventory reports
        const reports = await fetchApi('/items/reports/inventory');
        
        // Populate summary tab
        populateSummaryTab(items, reports);
        
        // Populate low stock tab
        populateLowStockTab(reports.lowStockItems, reports.outOfStockItems);
        
        // Populate category analysis tab
        populateCategoryTab(reports.categories);
        
        // Populate value analysis tab
        populateValueTab(items, reports.categories);
        
    } catch (error) {
        console.error('Error loading reports data:', error);
        showToast('Failed to load reports data', 'danger');
    }
}

/**
 * Populate summary tab with overview data
 */
function populateSummaryTab(items, reports) {
    // Set summary stats
    document.getElementById('summaryTotalItems').textContent = items.length;
    document.getElementById('summaryTotalValue').textContent = formatCurrency(reports.totalValue);
    document.getElementById('summaryCategories').textContent = reports.categories.length;
    
    // Calculate total quantity
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('summaryQuantity').textContent = totalQuantity;
    
    // Create stock status chart
    createStockStatusChart(items);
}

/**
 * Create stock status pie chart
 */
function createStockStatusChart(items) {
    // Count items by stock status
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    
    items.forEach(item => {
        if (item.quantity <= 0) {
            outOfStockCount++;
        } else if (item.quantity <= item.reorderLevel) {
            lowStockCount++;
        } else {
            inStockCount++;
        }
    });
    
    // Get canvas element
    const ctx = document.getElementById('stockStatusChart').getContext('2d');
    
    // Destroy previous chart if exists
    if (stockStatusChart) {
        stockStatusChart.destroy();
    }
    
    // Create new chart
    stockStatusChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['In Stock', 'Low Stock', 'Out of Stock'],
            datasets: [{
                data: [inStockCount, lowStockCount, outOfStockCount],
                backgroundColor: ['#198754', '#ffc107', '#dc3545'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Populate low stock tab
 */
function populateLowStockTab(lowStockItems, outOfStockItems) {
    // Populate low stock table
    const lowStockTable = document.getElementById('lowStockTable');
    if (lowStockItems.length === 0) {
        lowStockTable.innerHTML = `<tr><td colspan="7" class="text-center">No low stock items</td></tr>`;
    } else {
        lowStockTable.innerHTML = '';
        
        // Sort by quantity (lowest first)
        const sortedLowStockItems = [...lowStockItems].sort((a, b) => a.quantity - b.quantity);
        
        sortedLowStockItems.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'low-stock-warning';
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.quantity}</td>
                <td>${item.reorderLevel}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>
                    <span class="badge bg-warning">
                        <span class="status-indicator status-low-stock"></span>
                        Low Stock
                    </span>
                </td>
                <td>
                    <a href="/inventory" class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-pencil"></i> Edit
                    </a>
                </td>
            `;
            lowStockTable.appendChild(row);
        });
    }
    
    // Populate out of stock table
    const outOfStockTable = document.getElementById('outOfStockTable');
    if (outOfStockItems.length === 0) {
        outOfStockTable.innerHTML = `<tr><td colspan="5" class="text-center">No out of stock items</td></tr>`;
    } else {
        outOfStockTable.innerHTML = '';
        
        outOfStockItems.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'out-of-stock-warning';
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.reorderLevel}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>
                    <a href="/inventory" class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-pencil"></i> Edit
                    </a>
                </td>
            `;
            outOfStockTable.appendChild(row);
        });
    }
}

/**
 * Populate category analysis tab
 */
function populateCategoryTab(categories) {
    // Populate category table
    const categoryTable = document.getElementById('categoryTable');
    
    if (categories.length === 0) {
        categoryTable.innerHTML = `<tr><td colspan="5" class="text-center">No categories found</td></tr>`;
    } else {
        // Sort by item count (highest first)
        const sortedCategories = [...categories].sort((a, b) => b.count - a.count);
        
        // Calculate total items for percentage
        const totalItems = sortedCategories.reduce((sum, category) => sum + category.count, 0);
        
        categoryTable.innerHTML = '';
        
        sortedCategories.forEach(category => {
            const percentage = ((category.count / totalItems) * 100).toFixed(1);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${category._id}</td>
                <td>${category.count}</td>
                <td>${formatCurrency(category.totalValue)}</td>
                <td>${formatCurrency(category.avgPrice)}</td>
                <td>${percentage}%</td>
            `;
            categoryTable.appendChild(row);
        });
    }
    
    // Create category items chart
    createCategoryItemsChart(categories);
}

/**
 * Create category items bar chart
 */
function createCategoryItemsChart(categories) {
    // Sort categories by count (descending)
    const sortedCategories = [...categories].sort((a, b) => b.count - a.count);
    
    // Prepare chart data
    const labels = sortedCategories.map(cat => cat._id);
    const data = sortedCategories.map(cat => cat.count);
    const colors = generateColors(categories.length);
    
    // Get canvas element
    const ctx = document.getElementById('categoryItemsChart').getContext('2d');
    
    // Destroy previous chart if exists
    if (categoryItemsChart) {
        categoryItemsChart.destroy();
    }
    
    // Create new chart
    categoryItemsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Items',
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(color => color),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    precision: 0
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

/**
 * Populate value analysis tab
 */
function populateValueTab(items, categories) {
    // Create category value chart
    createCategoryValueChart(categories);
    
    // Populate top value items table
    const topValueTable = document.getElementById('topValueTable');
    
    if (items.length === 0) {
        topValueTable.innerHTML = `<tr><td colspan="5" class="text-center">No items found</td></tr>`;
    } else {
        // Calculate total value for each item
        const itemsWithValue = items.map(item => {
            return {
                ...item,
                totalValue: item.quantity * item.price
            };
        });
        
        // Sort by total value (highest first) and take top 10
        const topValueItems = itemsWithValue
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 10);
        
        topValueTable.innerHTML = '';
        
        topValueItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>${formatCurrency(item.totalValue)}</td>
            `;
            topValueTable.appendChild(row);
        });
    }
}

/**
 * Create category value doughnut chart
 */
function createCategoryValueChart(categories) {
    // Sort categories by total value (descending)
    const sortedCategories = [...categories].sort((a, b) => b.totalValue - a.totalValue);
    
    // Prepare chart data
    const labels = sortedCategories.map(cat => cat._id);
    const data = sortedCategories.map(cat => cat.totalValue);
    const colors = generateColors(categories.length);
    
    // Get canvas element
    const ctx = document.getElementById('categoryValueChart').getContext('2d');
    
    // Destroy previous chart if exists
    if (categoryValueChart) {
        categoryValueChart.destroy();
    }
    
    // Create new chart
    categoryValueChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: '#ffffff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const formattedValue = formatCurrency(value);
                            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${formattedValue} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}
