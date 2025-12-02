// Crew Management JavaScript

// Global state
let crewData = [];
let servicesData = [];

// DOM Elements
const crewGrid = document.getElementById('crewGrid');
const totalCrewCountEl = document.getElementById('totalCrewCount');
const availableCountEl = document.getElementById('availableCount');
const onTaskCountEl = document.getElementById('onTaskCount');
const tasksTodayEl = document.getElementById('tasksToday');

// Modals
const addCrewModal = document.getElementById('addCrewModal');
const updateCrewModal = document.getElementById('updateCrewModal');

// Forms
const addCrewForm = document.getElementById('addCrewForm');
const updateCrewForm = document.getElementById('updateCrewForm');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadCrew();
    loadGroundServices();
    
    // Setup form event listeners
    if (addCrewForm) {
        addCrewForm.addEventListener('submit', handleAddCrew);
    }
    
    if (updateCrewForm) {
        updateCrewForm.addEventListener('submit', handleUpdateCrew);
    }
    
    // Close modals on click outside
    window.addEventListener('click', function(event) {
        if (event.target === addCrewModal) {
            closeAddCrewModal();
        }
        if (event.target === updateCrewModal) {
            closeUpdateCrewModal();
        }
    });
});

// Load crew data
async function loadCrew() {
    try {
        const response = await fetch('/api/crew');
        const data = await response.json();
        
        if (data.success) {
            crewData = data.crew;
            updateCrewDisplay();
            updateStatistics();
        } else {
            console.error('Error loading crew:', data.message);
            showNotification('Error loading crew data', 'error');
        }
    } catch (error) {
        console.error('Error loading crew:', error);
        showNotification('Network error loading crew', 'error');
    }
}

// Load ground services
async function loadGroundServices() {
    try {
        const response = await fetch('/api/ground-services');
        const data = await response.json();
        
        if (data.success) {
            servicesData = data.services;
            updateStatistics();
        }
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

// Update crew display
function updateCrewDisplay() {
    if (!crewGrid) return;
    
    if (crewData.length === 0) {
        crewGrid.innerHTML = `
            <p style="text-align: center; padding: 40px; color: #666;">
                No crew members found. Add your first crew member!
            </p>
        `;
        return;
    }
    
    crewGrid.innerHTML = crewData.map(crew => createCrewCard(crew)).join('');
}

// Create crew card HTML
function createCrewCard(crew) {
    const statusIcon = getStatusIcon(crew.status);
    const typeIcon = getTypeIcon(crew.crew_type);
    
    return `
        <div class="crew-card">
            <div class="crew-card-header">
                <div class="crew-avatar">${typeIcon}</div>
                <div class="crew-info">
                    <h4>${crew.full_name}</h4>
                    <span class="crew-id">${crew.crew_id}</span>
                </div>
                <div class="crew-status ${crew.status}">
                    <span>${statusIcon} ${crew.status.replace('_', ' ')}</span>
                </div>
            </div>
            <div class="crew-card-body">
                <div class="crew-detail">
                    <label>Type:</label>
                    <span>${crew.crew_type}</span>
                </div>
                <div class="crew-detail">
                    <label>Qualification:</label>
                    <span>${crew.qualification || 'N/A'}</span>
                </div>
                <div class="crew-detail">
                    <label>Contact:</label>
                    <span>${crew.contact_number || 'N/A'}</span>
                </div>
                <div class="crew-detail">
                    <label>Shift:</label>
                    <span>${crew.shift_start || '08:00'} - ${crew.shift_end || '16:00'}</span>
                </div>
                <div class="crew-detail">
                    <label>Tasks Completed:</label>
                    <span>${crew.total_tasks_completed || 0}</span>
                </div>
            </div>
            <div class="crew-card-actions">
                <button class="btn btn-sm btn-primary" onclick="showUpdateCrewModal('${crew.crew_id}')">
                    ✏️ Edit
                </button>
                ${crew.status === 'available' ? `
                    <button class="btn btn-sm btn-success" onclick="assignCrewToTask('${crew.crew_id}')">
                        📝 Assign Task
                    </button>
                ` : ''}
                <button class="btn btn-sm btn-danger" onclick="deleteCrewMember('${crew.crew_id}', '${crew.full_name}')">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `;
}

// Update statistics
function updateStatistics() {
    if (!totalCrewCountEl || !availableCountEl || !onTaskCountEl || !tasksTodayEl) return;
    
    const totalCrew = crewData.length;
    const availableCount = crewData.filter(c => c.status === 'available').length;
    const onTaskCount = crewData.filter(c => c.status === 'on_task').length;
    
    // Calculate today's tasks
    const today = new Date();
    const todayTasks = servicesData.filter(s => {
        const serviceDate = new Date(s.created_at);
        return serviceDate.toDateString() === today.toDateString();
    }).length;
    
    totalCrewCountEl.textContent = totalCrew;
    availableCountEl.textContent = availableCount;
    onTaskCountEl.textContent = onTaskCount;
    tasksTodayEl.textContent = todayTasks;
}

// Status icons
function getStatusIcon(status) {
    switch(status) {
        case 'available': return '✅';
        case 'on_task': return '📝';
        case 'off_duty': return '🏠';
        default: return '❓';
    }
}

// Type icons
function getTypeIcon(type) {
    switch(type) {
        case 'cleaning': return '🧹';
        case 'fueling': return '⛽';
        case 'catering': return '🍽️';
        case 'maintenance': return '🔧';
        default: return '👷';
    }
}

// Modal functions
function showAddCrewModal() {
    if (addCrewModal) {
        addCrewModal.style.display = 'block';
    }
}

function closeAddCrewModal() {
    if (addCrewModal) {
        addCrewModal.style.display = 'none';
        addCrewForm.reset();
    }
}

function showUpdateCrewModal(crewId) {
    const crew = crewData.find(c => c.crew_id === crewId);
    if (!crew || !updateCrewModal) return;
    
    document.getElementById('updateCrewId').value = crew.crew_id;
    document.getElementById('updateStatus').value = crew.status;
    document.getElementById('updateContactNumber').value = crew.contact_number || '';
    
    updateCrewModal.style.display = 'block';
}

function closeUpdateCrewModal() {
    if (updateCrewModal) {
        updateCrewModal.style.display = 'none';
        updateCrewForm.reset();
    }
}

// Form handlers
async function handleAddCrew(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('fullName').value;
    const crewType = document.getElementById('crewType').value;
    const qualification = document.getElementById('qualification').value;
    const contactNumber = document.getElementById('contactNumber').value;
    const status = document.getElementById('status').value;
    
    try {
        const response = await fetch('/api/crew', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                full_name: fullName,
                crew_type: crewType,
                qualification: qualification,
                contact_number: contactNumber,
                status: status
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Crew member added successfully!', 'success');
            closeAddCrewModal();
            loadCrew();
        } else {
            showNotification(data.message || 'Error adding crew member', 'error');
        }
    } catch (error) {
        console.error('Error adding crew:', error);
        showNotification('Network error adding crew member', 'error');
    }
}

async function handleUpdateCrew(event) {
    event.preventDefault();
    
    const crewId = document.getElementById('updateCrewId').value;
    const status = document.getElementById('updateStatus').value;
    const contactNumber = document.getElementById('updateContactNumber').value;
    
    try {
        const response = await fetch(`/api/crew/${crewId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: status,
                contact_number: contactNumber
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Crew member updated successfully!', 'success');
            closeUpdateCrewModal();
            loadCrew();
        } else {
            showNotification(data.message || 'Error updating crew member', 'error');
        }
    } catch (error) {
        console.error('Error updating crew:', error);
        showNotification('Network error updating crew member', 'error');
    }
}

// Delete crew member
async function deleteCrewMember(crewId, crewName) {
    if (!confirm(`Are you sure you want to delete ${crewName}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/crew/${crewId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Crew member deleted successfully!', 'success');
            loadCrew();
        } else {
            showNotification(data.message || 'Error deleting crew member', 'error');
        }
    } catch (error) {
        console.error('Error deleting crew:', error);
        showNotification('Network error deleting crew member', 'error');
    }
}

// Assign crew to task
async function assignCrewToTask(crewId) {
    // Show available services for assignment
    const availableServices = servicesData.filter(s => s.status === 'pending');
    
    if (availableServices.length === 0) {
        alert('No pending services available for assignment.');
        return;
    }
    
    const serviceOptions = availableServices.map(s => 
        `<option value="${s.service_id}">${s.service_type} - ${s.flight_code} (${s.priority})</option>`
    ).join('');
    
    const serviceId = prompt(`Select a service to assign:\n\n${serviceOptions}`, availableServices[0].service_id);
    
    if (!serviceId) return;
    
    try {
        const response = await fetch(`/api/crew/${crewId}/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ service_id: serviceId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Crew assigned to task successfully!', 'success');
            loadCrew();
            loadGroundServices();
        } else {
            showNotification(data.message || 'Error assigning crew', 'error');
        }
    } catch (error) {
        console.error('Error assigning crew:', error);
        showNotification('Network error assigning crew', 'error');
    }
}

// Notification function
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
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
window.loadCrew = loadCrew;
window.showAddCrewModal = showAddCrewModal;
window.closeAddCrewModal = closeAddCrewModal;
window.showUpdateCrewModal = showUpdateCrewModal;
window.closeUpdateCrewModal = closeUpdateCrewModal;