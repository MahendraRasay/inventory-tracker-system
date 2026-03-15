/**
 * Inventory Management System
 * Inventory Management JavaScript file
 */

// Global variables
let allItems = [];
let currentItems = [];
let currentPage = 1;
const itemsPerPage = 10;
let sortField = 'name';
let sortDirection = 'asc';
let searchTerm = '';
let categoryFilter = '';
let stockStatusFilter = '';

document.addEventListener('DOMContentLoaded', function() {
    // Initial data load
    loadInventoryItems();
    
    // Event listeners for filters
    document.getElementById('searchButton').addEventListener('click', applyFilters);
    document.getElementById('searchInput').addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });
    
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);
    document.getElementById('stockStatusFilter').addEventListener('change', applyFilters);
    
    // Sort headers
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', function() {
            const field = this.getAttribute('data-sort');
            if (sortField === field) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortField = field;
                sortDirection = 'asc';
            }
            applySorting();
        });
    });
    
    // Add item event
    document.getElementById('saveItemBtn').addEventListener('click', saveItem);
    
    // Edit/Update item events
    document.getElementById('updateItemBtn').addEventListener('click', updateItem);
    
    // Delete item events
    document.getElementById('deleteItemBtn').addEventListener('click', function() {
        const itemId = document.getElementById('editItemId').value;
        const itemName = document.getElementById('editItemName').value;
        document.getElementById('deleteItemName').textContent = itemName;
        
        // Hide edit modal and show delete confirmation modal
        const editModal = bootstrap.Modal.getInstance(document.getElementById('editItemModal'));
        editModal.hide();
        
        // Show delete confirmation modal
        const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
        deleteModal.show();
        
        // Store item ID in the delete confirmation button
        document.getElementById('confirmDeleteBtn').setAttribute('data-item-id', itemId);
    });
    
    // Confirm delete button event
    document.getElementById('confirmDeleteBtn').addEventListener('click', deleteItem);
});

/**
 * Load inventory items from API
 */
async function loadInventoryItems() {
    try {
        // Construct query parameters for filtering
        let queryParams = [];
        if (searchTerm) queryParams.push(`search=${encodeURIComponent(searchTerm)}`);
        if (categoryFilter) queryParams.push(`category=${encodeURIComponent(categoryFilter)}`);
        if (stockStatusFilter) queryParams.push(`stockStatus=${encodeURIComponent(stockStatusFilter)}`);
        
        const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
        
        // Fetch items with any applied filters
        const items = await fetchApi(`/items${queryString}`);
        allItems = items;
        
        // Extract unique categories for filter dropdown
        populateCategoryFilter(items);
        
        // Apply sorting and render items
        applySorting();
        
    } catch (error) {
        console.error('Error loading inventory items:', error);
        showToast('Failed to load inventory items', 'danger');
    }
}

/**
 * Populate category filter dropdown
 */
function populateCategoryFilter(items) {
    const categoryFilter = document.getElementById('categoryFilter');
    
    // Get current selected value
    const currentValue = categoryFilter.value;
    
    // Get unique categories
    const categories = getUniqueCategories(items);
    
    // Clear existing options except first "All Categories" option
    while (categoryFilter.options.length > 1) {
        categoryFilter.remove(1);
    }
    
    // Add category options
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
    
    // Restore previously selected value if it exists
    if (currentValue && categories.includes(currentValue)) {
        categoryFilter.value = currentValue;
    }
}

/**
 * Apply filters to inventory items
 */
function applyFilters() {
    searchTerm = document.getElementById('searchInput').value.trim();
    categoryFilter = document.getElementById('categoryFilter').value;
    stockStatusFilter = document.getElementById('stockStatusFilter').value;
    
    // Reset to first page when filters change
    currentPage = 1;
    
    // Reload items with new filters
    loadInventoryItems();
}

/**
 * Apply sorting to inventory items
 */
function applySorting() {
    // Update sort headers UI
    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        const field = th.getAttribute('data-sort');
        if (field === sortField) {
            th.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
    
    // Apply sorting
    currentItems = [...allItems].sort((a, b) => {
        let valueA = a[sortField];
        let valueB = b[sortField];
        
        // Handle numeric sorting
        if (typeof valueA === 'number' && typeof valueB === 'number') {
            return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        }
        
        // Handle string sorting
        valueA = String(valueA).toLowerCase();
        valueB = String(valueB).toLowerCase();
        
        if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    // Render items and update pagination
    renderInventoryItems();
    renderPagination();
}

/**
 * Render inventory items table
 */
function renderInventoryItems() {
    const inventoryList = document.getElementById('inventoryList');
    const itemCount = document.getElementById('itemCount');
    
    // Update item count
    itemCount.textContent = currentItems.length;
    
    if (currentItems.length === 0) {
        inventoryList.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <p class="my-3">No inventory items found</p>
                    <button class="btn btn-sm btn-outline-secondary" onclick="resetFilters()">
                        Clear Filters
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    // Calculate pagination offset
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, currentItems.length);
    const paginatedItems = currentItems.slice(startIndex, endIndex);
    
    inventoryList.innerHTML = '';
    
    paginatedItems.forEach(item => {
        const status = getStockStatus(item.quantity, item.reorderLevel);
        const totalValue = item.quantity * item.price;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.price).replace('$', '')}</td>
            <td>
                <span class="badge bg-${status.class}">
                    <span class="status-indicator ${status.icon}"></span>
                    ${status.text}
                </span>
            </td>
            <td>${formatCurrency(totalValue).replace('$', '')}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary action-btn" onclick="editItem('${item._id}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-info action-btn" onclick="viewItem('${item._id}')">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        `;
        
        // Highlight low and out of stock rows
        if (item.quantity <= 0) {
            row.classList.add('out-of-stock-warning');
        } else if (item.quantity <= item.reorderLevel) {
            row.classList.add('low-stock-warning');
        }
        
        inventoryList.appendChild(row);
    });
}

/**
 * Render pagination controls
 */
function renderPagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(currentItems.length / itemsPerPage);
    
    pagination.innerHTML = '';
    
    if (totalPages <= 1) {
        return;
    }
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `
        <a class="page-link" href="#" aria-label="Previous" ${currentPage > 1 ? 'onclick="changePage(' + (currentPage - 1) + '); return false;"' : ''}>
            <span aria-hidden="true">&laquo;</span>
        </a>
    `;
    pagination.appendChild(prevLi);
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page if not visible
    if (startPage > 1) {
        const firstLi = document.createElement('li');
        firstLi.className = 'page-item';
        firstLi.innerHTML = `
            <a class="page-link" href="#" onclick="changePage(1); return false;">1</a>
        `;
        pagination.appendChild(firstLi);
        
        if (startPage > 2) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = '<a class="page-link" href="#">...</a>';
            pagination.appendChild(ellipsisLi);
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageLi.innerHTML = `
            <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
        `;
        pagination.appendChild(pageLi);
    }
    
    // Last page if not visible
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = '<a class="page-link" href="#">...</a>';
            pagination.appendChild(ellipsisLi);
        }
        
        const lastLi = document.createElement('li');
        lastLi.className = 'page-item';
        lastLi.innerHTML = `
            <a class="page-link" href="#" onclick="changePage(${totalPages}); return false;">${totalPages}</a>
        `;
        pagination.appendChild(lastLi);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `
        <a class="page-link" href="#" aria-label="Next" ${currentPage < totalPages ? 'onclick="changePage(' + (currentPage + 1) + '); return false;"' : ''}>
            <span aria-hidden="true">&raquo;</span>
        </a>
    `;
    pagination.appendChild(nextLi);
}

/**
 * Change pagination page
 */
function changePage(page) {
    currentPage = page;
    renderInventoryItems();
    renderPagination();
    
    // Scroll to top of the table
    document.getElementById('inventoryList').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Reset all filters
 */
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('stockStatusFilter').value = '';
    
    searchTerm = '';
    categoryFilter = '';
    stockStatusFilter = '';
    currentPage = 1;
    
    loadInventoryItems();
}

/**
 * Save new item
 */
async function saveItem() {
    if (!validateForm('addItemForm')) {
        showToast('Please fill in all required fields correctly', 'danger');
        return;
    }
    
    try {
        const formData = getFormData('addItemForm');
        console.log('Sending data to server:', formData);
        
        // Convert numeric fields
        formData.quantity = parseInt(formData.quantity);
        formData.price = parseFloat(formData.price);
        formData.reorderLevel = parseInt(formData.reorderLevel);
        
        const response = await fetchApi('/items', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        console.log('Server response:', response);
        
        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('addItemModal'));
        modal.hide();
        resetForm('addItemForm');
        
        // Reload inventory items
        loadInventoryItems();
        
        showToast('Item added successfully');
        
    } catch (error) {
        console.error('Error adding item:', error);
        showToast('Failed to add item: ' + error.message, 'danger');
    }
}

/**
 * Edit item - load data into form
 */
async function editItem(itemId) {
    try {
        const item = await fetchApi(`/items/${itemId}`);
        
        // Set form values
        document.getElementById('editItemId').value = item._id;
        document.getElementById('editItemName').value = item.name;
        document.getElementById('editItemCategory').value = item.category;
        document.getElementById('editItemQuantity').value = item.quantity;
        document.getElementById('editItemPrice').value = item.price;
        document.getElementById('editItemDescription').value = item.description || '';
        document.getElementById('editSupplierName').value = item.supplierName || '';
        document.getElementById('editSupplierContact').value = item.supplierContact || '';
        document.getElementById('editReorderLevel').value = item.reorderLevel;
        document.getElementById('editLocation').value = item.location || '';
        
        // Show edit modal
        const editModal = new bootstrap.Modal(document.getElementById('editItemModal'));
        editModal.show();
        
    } catch (error) {
        console.error('Error fetching item details:', error);
        showToast('Failed to load item details', 'danger');
    }
}

/**
 * View item details
 */
function viewItem(itemId) {
    // For now, just use the edit modal in read-only mode
    editItem(itemId);
}

/**
 * Update existing item
 */
async function updateItem() {
    const itemId = document.getElementById('editItemId').value;
    
    if (!validateForm('editItemForm')) {
        showToast('Please fill in all required fields correctly', 'danger');
        return;
    }
    
    try {
        const formData = getFormData('editItemForm');
        console.log('Updating item with data:', formData);
        
        // Convert numeric fields
        formData.quantity = parseInt(formData.quantity);
        formData.price = parseFloat(formData.price);
        formData.reorderLevel = parseInt(formData.reorderLevel);
        
        const updatedItem = await fetchApi(`/items/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
        
        console.log('Item updated:', updatedItem);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editItemModal'));
        modal.hide();
        
        // Reload inventory items
        loadInventoryItems();
        
        showToast('Item updated successfully');
        
    } catch (error) {
        console.error('Error updating item:', error);
        showToast('Failed to update item: ' + error.message, 'danger');
    }
}

/**
 * Delete item
 */
async function deleteItem() {
    const itemId = document.getElementById('confirmDeleteBtn').getAttribute('data-item-id');
    
    try {
        console.log('Deleting item with ID:', itemId);
        const response = await fetchApi(`/items/${itemId}`, {
            method: 'DELETE'
        });
        
        console.log('Item deleted:', response);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
        modal.hide();
        
        // Reload inventory items
        loadInventoryItems();
        
        showToast('Item deleted successfully');
        
    } catch (error) {
        console.error('Error deleting item:', error);
        showToast('Failed to delete item: ' + error.message, 'danger');
    }
}