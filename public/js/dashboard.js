/**
 * Inventory Management System
 * Dashboard JavaScript file
 */

document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();

    // Add refresh button event listener
    document.getElementById('refreshDashboard').addEventListener('click', function() {
        loadDashboardData();
        showToast('Dashboard data refreshed');
    });
});

/**
 * Load all dashboard data
 */
async function loadDashboardData() {
    try {
        // Fetch all items
        const items = await fetchApi('/items');
        
        // Fetch inventory reports
        const reports = await fetchApi('/items/reports/inventory');
        
        updateDashboardStats(items, reports);
        populateRecentItems(items);
        populateLowStockList(reports.lowStockItems);
        populateCategoriesList(reports.categories);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Failed to load dashboard data', 'danger');
    }
}

/**
 * Update dashboard statistic cards
 */
function updateDashboardStats(items, reports) {
    // Update stat counters
    document.getElementById('totalItems').textContent = items.length;
    document.getElementById('inventoryValue').textContent = formatCurrency(reports.totalValue);
    document.getElementById('lowStockItems').textContent = reports.lowStockItems.length;
    document.getElementById('outOfStockItems').textContent = reports.outOfStockItems.length;
}

/**
 * Populate recent items table
 */
function populateRecentItems(items) {
    const recentItemsList = document.getElementById('recentItemsList');
    
    // Sort by creation date (most recent first) and limit to 5
    const recentItems = [...items]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
    
    if (recentItems.length === 0) {
        recentItemsList.innerHTML = `<tr><td colspan="5" class="text-center">No items found</td></tr>`;
        return;
    }
    
    recentItemsList.innerHTML = '';
    
    recentItems.forEach(item => {
        const status = getStockStatus(item.quantity, item.reorderLevel);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>
                <span class="badge bg-${status.class}">
                    <span class="status-indicator ${status.icon}"></span>
                    ${status.text}
                </span>
            </td>
        `;
        
        recentItemsList.appendChild(row);
    });
}

/**
 * Populate low stock list
 */
function populateLowStockList(lowStockItems) {
    const lowStockList = document.getElementById('lowStockList');
    
    if (lowStockItems.length === 0) {
        lowStockList.innerHTML = `<li class="list-group-item text-center">No low stock items</li>`;
        return;
    }
    
    // Sort by quantity (lowest first) and limit to 6
    const sortedItems = [...lowStockItems]
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 6);
    
    lowStockList.innerHTML = '';
    
    sortedItems.forEach(item => {
        const percentRemaining = (item.quantity / item.reorderLevel) * 100;
        
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-0">${item.name}</h6>
                    <small class="text-muted">${item.category} - ${item.quantity} remaining</small>
                </div>
                <span class="badge bg-warning">${item.quantity}</span>
            </div>
            <div class="progress mt-2" style="height: 5px;">
                <div class="progress-bar bg-warning" role="progressbar" style="width: ${percentRemaining}%"></div>
            </div>
        `;
        
        lowStockList.appendChild(listItem);
    });
}

/**
 * Populate categories list
 */
function populateCategoriesList(categories) {
    const categoriesList = document.getElementById('categoriesList');
    
    if (categories.length === 0) {
        categoriesList.innerHTML = `<tr><td colspan="4" class="text-center">No categories found</td></tr>`;
        return;
    }
    
    // Sort by total value (highest first)
    const sortedCategories = [...categories].sort((a, b) => b.totalValue - a.totalValue);
    
    categoriesList.innerHTML = '';
    
    sortedCategories.forEach(category => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${category._id}</td>
            <td>${category.count}</td>
            <td>${formatCurrency(category.totalValue)}</td>
            <td>${formatCurrency(category.avgPrice)}</td>
        `;
        
        categoriesList.appendChild(row);
    });
}
