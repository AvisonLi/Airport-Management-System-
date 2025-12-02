// Ground Services JavaScript

// Global state
let servicesData = [];

// DOM Elements
const servicesTableBody = document.getElementById('servicesTableBody');
const pendingCountEl = document.getElementById('pendingCount');
const inProgressCountEl = document.getElementById('inProgressCount');
const completedCountEl = document.getElementById('completedCount');
const totalCountEl = document.getElementById('totalCount');

// Modals
const addServiceModal = document.getElementById('addServiceModal');
const updateServiceModal = document.getElementById('updateServiceModal');

// Forms
const addServiceForm = document.getElementById('addServiceForm');
const updateServiceForm = document.getElementById('updateServiceForm');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadServices();
    
    // Setup form event listeners
    if (addServiceForm) {
        addServiceForm.addEventListener('submit', handleAddService);
    }
    
    if (updateServiceForm) {
        updateServiceForm.addEventListener('submit', handleUpdateService);
    }
    
    // Close modals on click outside
    window.addEventListener('click', function(event) {
        if (event.target === addServiceModal) {
            closeAddServiceModal();
        }
        if (event.target === updateServiceModal) {
            closeUpdateServiceModal();
        }
    });
    
    // Set default scheduled time to now
    const now = new Date();
    const formattedDateTime = now.toISOString().slice(0, 16);
    const scheduledTimeInput = document.getElementById('scheduledTime');
    if (scheduledTimeInput) {
        scheduledTimeInput.value = formattedDateTime;
    }
});

// Load services data
async function loadServices() {
    try {
        const response = await fetch('/api/ground-services');
        const data = await response.json();
        
        if (data.success) {
            servicesData = data.services;
            updateServicesDisplay();
            updateStatistics();
        } else {
            console.error('Error loading services:', data.message);
            showNotification('Error loading services data', 'error');
        }
    } catch (error) {
        console.error('Error loading services:', error);
        showNotification('Network error loading services', 'error');
    }
}

// Update services display
function updateServicesDisplay() {
    if (!servicesTableBody) return;
    
    if (servicesData.length === 0) {
        servicesTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    No ground services found. Create your first service!
                </td>
            </tr>
        `;
        return;
    }
    
    servicesTableBody.innerHTML = servicesData.map(service => createServiceRow(service)).join('');
}

// Create service table row
function createServiceRow(service) {
    const statusBadge = getStatusBadge(service.status);
    const priorityBadge = getPriorityBadge(service.priority);
    
    return `
        <tr>
            <td><strong>${service.service_id}</strong></td>
            <td>${service.service_type}</td>
            <td>${service.flight_code || 'N/A'}</td>
            <td>${formatDateTime(service.scheduled_time)}</td>
            <td>${service.assigned_crew || 'Unassigned'}</td>
            <td>${priorityBadge}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="showUpdateServiceModal('${service.service_id}')">
                        ✏️
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteService('${service.service_id}')">
                        🗑️
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Update statistics
function updateStatistics() {
    if (!pendingCountEl || !inProgressCountEl || !completedCountEl || !totalCountEl) return;
    
    const pendingCount = servicesData.filter(s => s.status === 'pending').length;
    const inProgressCount = servicesData.filter(s => s.status === 'in-progress').length;
    const completedCount = servicesData.filter(s => s.status === 'completed').length;
    const totalCount = servicesData.length;
    
    pendingCountEl.textContent = pendingCount;
    inProgressCountEl.textContent = inProgressCount;
    completedCountEl.textContent = completedCount;
    totalCountEl.textContent = totalCount;
}

// Status badge
function getStatusBadge(status) {
    switch(status) {
        case 'pending':
            return '<span class="badge badge-warning">Pending</span>';
        case 'in-progress':
            return '<span class="badge badge-info">In Progress</span>';
        case 'completed':
            return '<span class="badge badge-success">Completed</span>';
        default:
            return '<span class="badge badge-secondary">' + status + '</span>';
    }
}

// Priority badge
function getPriorityBadge(priority) {
    switch(priority) {
        case 'high':
            return '<span class="badge badge-danger">High</span>';
        case 'medium':
            return '<span class="badge badge-warning">Medium</span>';
        case 'low':
            return '<span class="badge badge-secondary">Low</span>';
        default:
            return '<span class="badge badge-secondary">' + priority + '</span>';
    }
}

// Format date time
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Modal functions
function showAddServiceModal() {
    if (addServiceModal) {
        addServiceModal.style.display = 'block';
    }
}

function closeAddServiceModal() {
    if (addServiceModal) {
        addServiceModal.style.display = 'none';
        addServiceForm.reset();
        
        // Reset scheduled time to now
        const now = new Date();
        const formattedDateTime = now.toISOString().slice(0, 16);
        const scheduledTimeInput = document.getElementById('scheduledTime');
        if (scheduledTimeInput) {
            scheduledTimeInput.value = formattedDateTime;
        }
    }
}

function showUpdateServiceModal(serviceId) {
    const service = servicesData.find(s => s.service_id === serviceId);
    if (!service || !updateServiceModal) return;
    
    document.getElementById('updateServiceId').value = service.service_id;
    document.getElementById('updateStatus').value = service.status;
    document.getElementById('updateNotes').value = service.notes || '';
    
    updateServiceModal.style.display = 'block';
}

function closeUpdateServiceModal() {
    if (updateServiceModal) {
        updateServiceModal.style.display = 'none';
        updateServiceForm.reset();
    }
}

// Form handlers
async function handleAddService(event) {
    event.preventDefault();
    
    const serviceType = document.getElementById('serviceType').value;
    const flightCode = document.getElementById('flightCode').value;
    const scheduledTime = document.getElementById('scheduledTime').value;
    const priority = document.getElementById('priority').value;
    const estimatedDuration = document.getElementById('estimatedDuration').value;
    const notes = document.getElementById('notes').value;
    
    if (!serviceType || !flightCode) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/ground-services', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                service_type: serviceType,
                flight_code: flightCode,
                scheduled_time: scheduledTime,
                priority: priority,
                estimated_duration_minutes: estimatedDuration,
                notes: notes
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Service created successfully!', 'success');
            closeAddServiceModal();
            loadServices();
        } else {
            showNotification(data.message || 'Error creating service', 'error');
        }
    } catch (error) {
        console.error('Error creating service:', error);
        showNotification('Network error creating service', 'error');
    }
}

async function handleUpdateService(event) {
    event.preventDefault();
    
    const serviceId = document.getElementById('updateServiceId').value;
    const status = document.getElementById('updateStatus').value;
    const notes = document.getElementById('updateNotes').value;
    
    try {
        const response = await fetch(`/api/ground-services/${serviceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: status,
                notes: notes
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Service updated successfully!', 'success');
            closeUpdateServiceModal();
            loadServices();
        } else {
            showNotification(data.message || 'Error updating service', 'error');
        }
    } catch (error) {
        console.error('Error updating service:', error);
        showNotification('Network error updating service', 'error');
    }
}

// Delete service
async function deleteService(serviceId) {
    if (!confirm('Are you sure you want to delete this service?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/ground-services/${serviceId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Service deleted successfully!', 'success');
            loadServices();
        } else {
            showNotification(data.message || 'Error deleting service', 'error');
        }
    } catch (error) {
        console.error('Error deleting service:', error);
        showNotification('Network error deleting service', 'error');
    }
}

// Notification function
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Add styles if not already present
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                padding: 15px 20px;
                border-radius: 5px;
                color: white;
                font-weight: 500;
                min-width: 300px;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideIn 0.3s ease;
            }
            .notification.success {
                background: #10b981;
                border-left: 4px solid #059669;
            }
            .notification.error {
                background: #ef4444;
                border-left: 4px solid #dc2626;
            }
            .notification.info {
                background: #3b82f6;
                border-left: 4px solid #2563eb;
            }
            .notification-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .notification button {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                margin-left: 15px;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add to body
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Export functions
window.loadServices = loadServices;
window.showAddServiceModal = showAddServiceModal;
window.closeAddServiceModal = closeAddServiceModal;
window.showUpdateServiceModal = showUpdateServiceModal;
window.closeUpdateServiceModal = closeUpdateServiceModal;
window.deleteService = deleteService;