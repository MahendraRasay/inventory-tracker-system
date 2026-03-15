document.addEventListener('DOMContentLoaded', initMLDashboard);

async function initMLDashboard() {
    try {
        // Setup event listeners
        document.getElementById('trainModelsBtn').addEventListener('click', trainModels);
        document.getElementById('generateForecastBtn').addEventListener('click', generateForecast);
        document.getElementById('detectAnomaliesBtn').addEventListener('click', detectAnomalies);
        
        // Initialize tabs
        const tabLinks = document.querySelectorAll('.nav-link[data-bs-toggle="tab"]');
        tabLinks.forEach(tabLink => {
            tabLink.addEventListener('click', function(e) {
                e.preventDefault();
                tabLinks.forEach(link => {
                    link.classList.remove('active');
                    const target = document.querySelector(link.getAttribute('href'));
                    if (target) target.classList.remove('show', 'active');
                });
                this.classList.add('active');
                const target = document.querySelector(this.getAttribute('href'));
                if (target) target.classList.add('show', 'active');
            });
        });
        
        // Activate first tab
        if (tabLinks.length > 0) {
            tabLinks[0].click();
        }
    } catch (err) {
        console.error('Error initializing ML dashboard:', err);
    }
}


async function trainModels() {
    try {
        // Show training progress
        document.getElementById('trainingProgress').classList.remove('d-none');
        document.getElementById('mlStatus').textContent = 'Training models...';
        
        // Make API call using fetch directly
        const response = await fetch('/api/ml/train', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Hide training progress
        document.getElementById('trainingProgress').classList.add('d-none');
        
        if (data.success) {
            document.getElementById('mlStatus').innerHTML = `
                <span class="text-success">
                    <i class="bi bi-check-circle"></i> ML models trained successfully
                </span>
            `;
            document.getElementById('lastTrained').textContent = 
                `Last trained: ${new Date().toLocaleString()}`;
                
            showToast('ML models trained successfully', 'success');
        } else {
            throw new Error(data.message || 'Failed to train models');
        }
    } catch (err) {
        console.error('Error training models:', err);
        document.getElementById('trainingProgress').classList.add('d-none');
        document.getElementById('mlStatus').innerHTML = `
            <span class="text-danger">
                <i class="bi bi-exclamation-triangle"></i> ${err.message || 'Training failed'}
            </span>
        `;
        showToast('Failed to train ML models', 'error');
    }
}

/**
 * Generate inventory forecast
 */
async function generateForecast() {
    try {
        // Show loading indicator
        document.getElementById('forecastResults').innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><p>Generating forecasts...</p></div>';
        
        // Get forecast days
        const days = document.getElementById('forecastDays').value || 7;
        
        // Make API call using fetch directly
        const response = await fetch(`/api/ml/forecast?days=${days}`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error(`Forecast API error: ${response.status} ${response.statusText}`);
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Render forecast results
            renderForecasts(data.forecasts, days);
        } else {
            throw new Error(data.message || 'Failed to generate forecasts');
        }
    } catch (err) {
        console.error('Error generating forecasts:', err);
        document.getElementById('forecastResults').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> ${err.message || 'Failed to generate forecasts. Please try again.'}
            </div>
        `;
    }
}

/**
 * Render forecast results
 */
function renderForecasts(forecasts, days) {
    // Clear previous results
    const resultsContainer = document.getElementById('forecastResults');
    resultsContainer.innerHTML = '';
    
    if (!forecasts || forecasts.length === 0) {
        resultsContainer.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> No forecasts available. Try training the models first.
            </div>
        `;
        return;
    }
    
    // Add forecast header
    resultsContainer.innerHTML = `
        <h5>Inventory Forecast for the Next ${days} Days</h5>
        <p class="text-muted mb-4">Forecast generated on ${new Date().toLocaleString()}</p>
        <div class="row" id="forecastCards"></div>
    `;
    
    const forecastCards = document.getElementById('forecastCards');
    
    // Create a card for each forecast
    forecasts.forEach(forecast => {
        // Determine trend icon
        let trendIcon = '';
        if (forecast.trend === 'up') {
            trendIcon = '<i class="bi bi-arrow-up-circle text-success"></i>';
        } else if (forecast.trend === 'down') {
            trendIcon = '<i class="bi bi-arrow-down-circle text-danger"></i>';
        } else {
            trendIcon = '<i class="bi bi-dash-circle text-secondary"></i>';
        }
        
        // Create card
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4 mb-4';
        card.innerHTML = `
            <div class="card h-100 ${forecast.willStockOut ? 'border-danger' : ''}">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">${forecast.name}</h6>
                    <span class="badge bg-secondary">${forecast.category || 'Uncategorized'}</span>
                </div>
                <div class="card-body">
                    <div class="d-flex justify-content-between mb-3">
                        <div>
                            <p class="card-text mb-0">Current: <strong>${forecast.currentQuantity}</strong></p>
                            <p class="card-text">Trend: ${trendIcon} ${forecast.trend}</p>
                        </div>
                        <div class="text-end">
                            <p class="card-text mb-0">After ${days} days: <strong>${forecast.forecast[forecast.forecast.length-1]}</strong></p>
                            ${forecast.willStockOut ? 
                                '<p class="text-danger"><i class="bi bi-exclamation-triangle"></i> Will stock out</p>' : 
                                '<p class="text-success"><i class="bi bi-check-circle"></i> Sufficient stock</p>'}
                        </div>
                    </div>
                    <div class="forecast-chart" id="chart-${forecast.itemId}"></div>
                </div>
            </div>
        `;
        
        forecastCards.appendChild(card);
        
        // Wait for the chart container to be added to the DOM
        setTimeout(() => {
            createForecastChart(forecast);
        }, 100);
    });
}

/**
 * Create a forecast chart for an item
 */
function createForecastChart(forecast) {
    const chartElement = document.getElementById(`chart-${forecast.itemId}`);
    if (!chartElement) return;
    
    // Prepare data for Chart.js
    const labels = [];
    for (let i = 1; i <= forecast.forecast.length; i++) {
        labels.push(`Day ${i}`);
    }
    
    const ctx = document.createElement('canvas');
    chartElement.appendChild(ctx);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantity',
                data: forecast.forecast,
                borderColor: forecast.willStockOut ? 'rgb(220, 53, 69)' : 'rgb(40, 167, 69)',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMin: 0
                }
            }
        }
    });
}

/**
 * Detect anomalies in inventory
 */
async function detectAnomalies() {
    try {
        // Show loading indicator
        document.getElementById('anomalyResults').innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><p>Detecting anomalies...</p></div>';
        
        // Make API call using fetch directly
        const response = await fetch('/api/ml/anomalies', {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Render anomaly results
            renderAnomalies(data.anomalies);
        } else {
            throw new Error(data.message || 'Failed to detect anomalies');
        }
    } catch (err) {
        console.error('Error detecting anomalies:', err);
        document.getElementById('anomalyResults').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> ${err.message || 'Failed to detect anomalies. Please try again.'}
            </div>
        `;
    }
}

/**
 * Render anomaly results
 */
function renderAnomalies(anomalies) {
    // Clear previous results
    const resultsContainer = document.getElementById('anomalyResults');
    resultsContainer.innerHTML = '';
    
    if (!anomalies || anomalies.length === 0) {
        resultsContainer.innerHTML = `
            <div class="alert alert-success">
                <i class="bi bi-check-circle"></i> No anomalies detected in your inventory.
            </div>
        `;
        return;
    }
    
    // Add anomaly header
    resultsContainer.innerHTML = `
        <h5>Detected Anomalies</h5>
        <p class="text-muted mb-4">Analysis performed on ${new Date().toLocaleString()}</p>
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Anomaly</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="anomalyTableBody"></tbody>
            </table>
        </div>
    `;
    
    const tableBody = document.getElementById('anomalyTableBody');
    
    // Add rows for each anomaly
    anomalies.forEach(anomaly => {
        const { item, reasons, score } = anomaly;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.category || 'Uncategorized'}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>
                <span class="badge bg-warning text-dark">
                    ${reasons.join(', ')}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary" 
                    onclick="window.location.href='/inventory?edit=${item._id}'">
                    <i class="bi bi-pencil"></i> Edit
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}
