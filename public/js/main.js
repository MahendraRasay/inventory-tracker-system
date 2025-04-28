/**
 * Inventory Management System
 * Main JavaScript file for common functions across the application
 */

// API base URL
const API_BASE_URL = '/api';

// Toast notification function
function showToast(message, type = 'success') {
    // Create toast container if it doesn't exist
    if (!document.getElementById('toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '5';
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toastId = 'toast-' + Date.now();
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
    toastEl.id = toastId;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');

    // Toast content
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    // Add toast to container
    document.getElementById('toast-container').appendChild(toastEl);

    // Initialize and show toast
    const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 3000 });
    toast.show();

    // Remove toast when hidden
    toastEl.addEventListener('hidden.bs.toast', function () {
        toastEl.remove();
    });
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Get stock status with color and text
function getStockStatus(quantity, reorderLevel = 10) {
    if (quantity <= 0) {
        return { class: 'danger', text: 'Out of Stock', icon: 'status-out-of-stock' };
    } else if (quantity <= reorderLevel) {
        return { class: 'warning', text: 'Low Stock', icon: 'status-low-stock' };
    } else {
        return { class: 'success', text: 'In Stock', icon: 'status-in-stock' };
    }
}

// Fetch API wrapper with error handling
async function fetchApi(endpoint, options = {}) {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        // Check if the response is ok (status in the range 200-299)
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        showToast(error.message, 'danger');
        throw error;
    }
}

// Form validation
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;

    let isValid = true;
    const inputs = form.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
        // Reset validation state
        input.classList.remove('is-invalid');
        const feedbackEl = input.nextElementSibling;
        if (feedbackEl && feedbackEl.classList.contains('invalid-feedback')) {
            feedbackEl.remove();
        }

        // Check required fields
        if (input.hasAttribute('required') && !input.value.trim()) {
            isValid = false;
            input.classList.add('is-invalid');
            
            // Add feedback message
            const feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            feedback.textContent = 'This field is required';
            input.insertAdjacentElement('afterend', feedback);
        }

        // Validate number fields
        if (input.type === 'number' && input.value) {
            const min = input.hasAttribute('min') ? parseFloat(input.getAttribute('min')) : null;
            const max = input.hasAttribute('max') ? parseFloat(input.getAttribute('max')) : null;
            const value = parseFloat(input.value);

            if (min !== null && value < min) {
                isValid = false;
                input.classList.add('is-invalid');
                
                const feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                feedback.textContent = `Value must be at least ${min}`;
                input.insertAdjacentElement('afterend', feedback);
            }

            if (max !== null && value > max) {
                isValid = false;
                input.classList.add('is-invalid');
                
                const feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                feedback.textContent = `Value must be no more than ${max}`;
                input.insertAdjacentElement('afterend', feedback);
            }
        }
    });

    return isValid;
}

// Get form data as object
function getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return null;

    const formData = {};
    const inputs = form.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
        // Skip buttons
        if (input.type === 'button' || input.type === 'submit') return;

        // Convert to appropriate type
        if (input.type === 'number') {
            formData[input.name] = input.value ? parseFloat(input.value) : null;
        } else if (input.type === 'checkbox') {
            formData[input.name] = input.checked;
        } else {
            formData[input.name] = input.value;
        }
    });

    return formData;
}

// Reset form
function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        // Remove validation errors
        form.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        form.querySelectorAll('.invalid-feedback').forEach(el => {
            el.remove();
        });
    }
}

// Get unique categories from items
function getUniqueCategories(items) {
    return [...new Set(items.map(item => item.category))].sort();
}

// Generate random colors for charts
function generateColors(count) {
    const colors = [
        '#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545',
        '#fd7e14', '#ffc107', '#198754', '#20c997', '#0dcaf0'
    ];
    
    // If we need more colors than in our predefined array
    if (count > colors.length) {
        for (let i = colors.length; i < count; i++) {
            const randomColor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
            colors.push(randomColor);
        }
    }
    
    return colors.slice(0, count);
}

// Print page content
function printReport() {
    window.print();
}

// Add event listener for showing active page in sidebar
document.addEventListener('DOMContentLoaded', function() {
    // Highlight current page in sidebar
    const currentPath = window.location.pathname;
    document.querySelectorAll('#sidebar .nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
});
