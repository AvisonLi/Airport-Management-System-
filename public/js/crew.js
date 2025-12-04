// Crew Management JavaScript - Fixed Version

// Global variables
let crewMembers = [];
let crewTasks = [];

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Crew management page loaded');
    loadCrew();
    loadCrewStats();
    
    // Add Crew Form Submission
    const addCrewForm = document.getElementById('addCrewForm');
    if (addCrewForm) {
        addCrewForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Add crew form submitted');
            addCrewMember();
        });
    }
    
    // Update Crew Form Submission
    const updateCrewForm = document.getElementById('updateCrewForm');
    if (updateCrewForm) {
        updateCrewForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Update crew form submitted');
            updateCrewMember();
        });
    }
    
    // Assign Task Form Submission
    const assignTaskForm = document.getElementById('assignTaskForm');
    if (assignTaskForm) {
        assignTaskForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Assign task form submitted');
            assignTask();
        });
    }
    
    // Close modals on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    console.log('Event listeners initialized');
});

// Load all crew members
async function loadCrew() {
    try {
        console.log('Loading crew members...');
        showLoading('crewGrid', 'Loading crew members...');
        
        const response = await fetch('/api/crew', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Crew data received:', data);
        
        if (data.success) {
            crewMembers = data.crew;
            console.log(`Loaded ${crewMembers.length} crew members`);
            displayCrewMembers(crewMembers);
            updateStatistics();
        } else {
            showError('Failed to load crew members: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading crew members:', error);
        showError('Error loading crew members. Please check your connection and try again.');
    }
}

// Load crew statistics
async function loadCrewStats() {
    try {
        const response = await fetch('/api/crew/stats', {
            headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                updateStatistics(data.stats);
            }
        }
    } catch (error) {
        console.error('Error loading crew stats:', error);
    }
}

// Display crew members in grid
function displayCrewMembers(crewList) {
    const crewGrid = document.getElementById('crewGrid');
    
    if (!crewGrid) {
        console.error('Crew grid element not found');
        return;
    }
    
    if (!crewList || crewList.length === 0) {
        crewGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 20px;">👷</div>
                <h3>No Crew Members Found</h3>
                <p>Add your first crew member to get started!</p>
                <button class="btn btn-primary" onclick="showAddCrewModal()" style="margin-top: 20px;">
                    ➕ Add First Crew Member
                </button>
            </div>
        `;
        return;
    }
    
    crewGrid.innerHTML = crewList.map(crew => {
        // Determine status badge color and icon
        let statusBadge, statusIcon, statusClass;
        switch(crew.status) {
            case 'available':
                statusBadge = 'Available';
                statusIcon = '✅';
                statusClass = 'badge-success';
                break;
            case 'on_task':
                statusBadge = 'On Task';
                statusIcon = '🔄';
                statusClass = 'badge-warning';
                break;
            case 'off_duty':
                statusBadge = 'Off Duty';
                statusIcon = '🏠';
                statusClass = 'badge-secondary';
                break;
            default:
                statusBadge = crew.status || 'Unknown';
                statusIcon = '❓';
                statusClass = 'badge';
        }
        
        // Determine crew type icon and name
        let typeIcon, typeName;
        switch(crew.crew_type) {
            case 'cleaning':
                typeIcon = '🧹';
                typeName = 'Cleaning Crew';
                break;
            case 'fueling':
                typeIcon = '⛽';
                typeName = 'Fueling Crew';
                break;
            case 'catering':
                typeIcon = '🍱';
                typeName = 'Catering Crew';
                break;
            case 'maintenance':
                typeIcon = '🔧';
                typeName = 'Maintenance Crew';
                break;
            default:
                typeIcon = '👷';
                typeName = crew.crew_type || 'Crew Member';
        }
        
        // Format shift hours
        const shiftStart = crew.shift_start || '08:00';
        const shiftEnd = crew.shift_end || '16:00';
        const shiftHours = `${shiftStart} - ${shiftEnd}`;
        
        // Format tasks completed
        const tasksCompleted = crew.total_tasks_completed || 0;
        const tasksToday = crew.tasks_completed_today || 0;
        
        return `
            <div class="crew-card" id="crew-${crew.crew_id}">
                <div class="crew-card-header">
                    <div class="crew-avatar" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        ${typeIcon}
                    </div>
                    <div class="crew-info">
                        <h4>${crew.full_name}</h4>
                        <div class="crew-type">${typeName}</div>
                    </div>
                    <span class="badge ${statusClass}">
                        ${statusIcon} ${statusBadge}
                    </span>
                </div>
                
                <div class="crew-card-details">
                    <div class="crew-detail">
                        <span class="detail-label">Employee ID:</span>
                        <span class="detail-value">${crew.employee_id || crew.crew_id}</span>
                    </div>
                    <div class="crew-detail">
                        <span class="detail-label">Qualification:</span>
                        <span class="detail-value">${crew.qualification || 'N/A'}</span>
                    </div>
                    <div class="crew-detail">
                        <span class="detail-label">Contact:</span>
                        <span class="detail-value">${crew.contact_number || 'N/A'}</span>
                    </div>
                    <div class="crew-detail">
                        <span class="detail-label">Shift:</span>
                        <span class="detail-value">${shiftHours}</span>
                    </div>
                    <div class="crew-detail">
                        <span class="detail-label">Tasks:</span>
                        <span class="detail-value">${tasksCompleted} total, ${tasksToday} today</span>
                    </div>
                </div>
                
                <div class="crew-card-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="showUpdateCrewModal('${crew.crew_id}')">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-sm btn-outline-success" 
                            onclick="showAssignTaskModal('${crew.crew_id}', '${crew.full_name}')" 
                            ${crew.status !== 'available' ? 'disabled' : ''}
                            title="${crew.status !== 'available' ? 'Crew member is not available' : 'Assign task'}">
                        📋 Assign Task
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteCrew('${crew.crew_id}', '${crew.full_name}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Update statistics
function updateStatistics(stats = null) {
    if (stats) {
        // Use provided stats
        document.getElementById('totalCrewCount').textContent = stats.totalCrew || 0;
        document.getElementById('availableCount').textContent = stats.availableCount || 0;
        document.getElementById('onTaskCount').textContent = stats.onTaskCount || 0;
        document.getElementById('tasksToday').textContent = stats.tasksToday || 0;
    } else {
        // Calculate from crew data
        const totalCrew = crewMembers.length;
        const availableCount = crewMembers.filter(c => c.status === 'available').length;
        const onTaskCount = crewMembers.filter(c => c.status === 'on_task').length;
        
        // Try to get tasks today from API or calculate
        fetch('/api/ground-services')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const today = new Date().toISOString().split('T')[0];
                    const tasksToday = data.services.filter(service => {
                        const serviceDate = new Date(service.created_at).toISOString().split('T')[0];
                        return serviceDate === today;
                    }).length;
                    document.getElementById('tasksToday').textContent = tasksToday;
                }
            })
            .catch(() => {
                document.getElementById('tasksToday').textContent = crewMembers.reduce((sum, crew) => sum + (crew.tasks_completed_today || 0), 0);
            });
        
        document.getElementById('totalCrewCount').textContent = totalCrew;
        document.getElementById('availableCount').textContent = availableCount;
        document.getElementById('onTaskCount').textContent = onTaskCount;
    }
}

// Add Crew Member
async function addCrewMember() {
    const form = document.getElementById('addCrewForm');
    const formData = {
        full_name: document.getElementById('fullName').value.trim(),
        crew_type: document.getElementById('crewType').value,
        qualification: document.getElementById('qualification').value.trim(),
        contact_number: document.getElementById('contactNumber').value.trim(),
        status: document.getElementById('status').value
    };
    
    console.log('Form data:', formData);
    
    // Validation
    if (!formData.full_name) {
        showError('Please enter the crew member\'s full name');
        return;
    }
    
    if (!formData.crew_type) {
        showError('Please select a crew type');
        return;
    }
    
    if (!formData.qualification) {
        showError('Please enter the crew member\'s qualification');
        return;
    }
    
    if (!formData.contact_number) {
        showError('Please enter a contact number');
        return;
    }
    
    try {
        showLoading('crewGrid', 'Adding crew member...');
        
        const response = await fetch('/api/crew', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        console.log('Add crew response status:', response.status);
        
        const responseText = await response.text();
        console.log('Add crew response text:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse response:', parseError);
            throw new Error('Server returned invalid JSON');
        }
        
        if (response.ok && data.success) {
            showSuccess('Crew member added successfully!');
            closeAddCrewModal();
            form.reset();
            await loadCrew();
        } else {
            throw new Error(data.message || 'Failed to add crew member');
        }
    } catch (error) {
        console.error('Error adding crew member:', error);
        showError('Error adding crew member: ' + error.message);
    }
}

// Update Crew Member
async function updateCrewMember() {
    const crewId = document.getElementById('updateCrewId').value;
    
    const updateData = {
        full_name: document.getElementById('updateFullName').value.trim(),
        crew_type: document.getElementById('updateCrewType').value,
        qualification: document.getElementById('updateQualification').value.trim(),
        contact_number: document.getElementById('updateContactNumber').value.trim(),
        status: document.getElementById('updateStatus').value,
        shift_start: document.getElementById('updateShiftStart').value || '08:00',
        shift_end: document.getElementById('updateShiftEnd').value || '16:00'
    };
    
    // Validation
    if (!updateData.full_name || !updateData.crew_type || !updateData.qualification || !updateData.contact_number) {
        showError('Please fill in all required fields');
        return;
    }
    
    try {
        showLoading('crewGrid', 'Updating crew member...');
        
        const response = await fetch(`/api/crew/${crewId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Crew member updated successfully!');
            closeUpdateCrewModal();
            await loadCrew();
        } else {
            throw new Error(data.message || 'Failed to update crew member');
        }
    } catch (error) {
        console.error('Error updating crew member:', error);
        showError('Error updating crew member: ' + error.message);
    }
}

// Assign Task to Crew
async function assignTask() {
    const crewId = document.getElementById('assignCrewId').value;
    const crewName = document.getElementById('assignCrewName').value;
    
    const taskData = {
        service_type: document.getElementById('taskType').value,
        flight_code: document.getElementById('taskFlightCode').value.trim(),
        notes: document.getElementById('taskDescription').value.trim(),
        priority: document.getElementById('taskPriority').value,
        estimated_duration_minutes: parseInt(document.getElementById('taskDuration').value) || 30
    };
    
    console.log('Task data:', taskData);
    
    // Validation
    if (!taskData.service_type) {
        showError('Please select a task type');
        return;
    }
    
    if (!taskData.flight_code) {
        showError('Please enter a flight code');
        return;
    }
    
    try {
        showLoading('crewGrid', `Assigning task to ${crewName}...`);
        
        const response = await fetch(`/api/crew/${crewId}/assign-task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
        
        console.log('Assign task response status:', response.status);
        
        const responseText = await response.text();
        console.log('Assign task response text:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse response:', parseError);
            throw new Error('Server returned invalid JSON');
        }
        
        if (response.ok && data.success) {
            showSuccess(`Task assigned to ${crewName} successfully!`);
            closeAssignTaskModal();
            await loadCrew();
        } else {
            throw new Error(data.message || 'Failed to assign task');
        }
    } catch (error) {
        console.error('Error assigning task:', error);
        showError('Error assigning task: ' + error.message);
    }
}

// Delete Crew Member
async function deleteCrewMember(crewId) {
    try {
        showLoading('crewGrid', 'Deleting crew member...');
        
        const response = await fetch(`/api/crew/${crewId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Crew member deleted successfully!');
            await loadCrew();
        } else {
            throw new Error(data.message || 'Failed to delete crew member');
        }
    } catch (error) {
        console.error('Error deleting crew member:', error);
        showError('Error deleting crew member: ' + error.message);
    }
}

// Modal Functions
function showAddCrewModal() {
    console.log('Showing add crew modal');
    document.getElementById('addCrewModal').style.display = 'block';
}

function closeAddCrewModal() {
    document.getElementById('addCrewModal').style.display = 'none';
}

function showUpdateCrewModal(crewId) {
    const crew = crewMembers.find(c => c.crew_id === crewId);
    if (!crew) {
        showError('Crew member not found');
        return;
    }
    
    console.log('Showing update modal for crew:', crew);
    
    document.getElementById('updateCrewId').value = crewId;
    document.getElementById('updateFullName').value = crew.full_name || '';
    document.getElementById('updateCrewType').value = crew.crew_type || '';
    document.getElementById('updateQualification').value = crew.qualification || '';
    document.getElementById('updateContactNumber').value = crew.contact_number || '';
    document.getElementById('updateStatus').value = crew.status || 'available';
    document.getElementById('updateShiftStart').value = crew.shift_start || '08:00';
    document.getElementById('updateShiftEnd').value = crew.shift_end || '16:00';
    
    document.getElementById('updateCrewModal').style.display = 'block';
}

function closeUpdateCrewModal() {
    document.getElementById('updateCrewModal').style.display = 'none';
}

function showAssignTaskModal(crewId, crewName) {
    const crew = crewMembers.find(c => c.crew_id === crewId);
    if (!crew) {
        showError('Crew member not found');
        return;
    }
    
    if (crew.status !== 'available') {
        showError(`Crew member is ${crew.status}. Only available crew can be assigned tasks.`);
        return;
    }
    
    console.log('Showing assign task modal for crew:', crew);
    
    document.getElementById('assignCrewId').value = crewId;
    document.getElementById('assignCrewName').value = crewName;
    
    // Reset form with default values
    document.getElementById('taskType').value = '';
    document.getElementById('taskFlightCode').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskDuration').value = '30';
    
    document.getElementById('assignTaskModal').style.display = 'block';
}

function closeAssignTaskModal() {
    document.getElementById('assignTaskModal').style.display = 'none';
}

// Confirmation Modal Functions
let deleteCrewId = null;

function confirmDeleteCrew(crewId, crewName) {
    deleteCrewId = crewId;
    document.getElementById('confirmTitle').textContent = 'Delete Crew Member';
    document.getElementById('confirmMessage').textContent = `Are you sure you want to delete "${crewName}"? This action cannot be undone.`;
    document.getElementById('confirmDeleteBtn').textContent = 'Delete';
    document.getElementById('confirmModal').style.display = 'block';
}

function confirmDelete() {
    if (deleteCrewId) {
        deleteCrewMember(deleteCrewId);
        closeConfirmModal();
    }
}

function closeConfirmModal() {
    deleteCrewId = null;
    document.getElementById('confirmModal').style.display = 'none';
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// Utility Functions
function showSuccess(message) {
    // Create a success notification
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">✅</span>
            <span>${message}</span>
        </div>
    `;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

function showError(message) {
    // Create an error notification
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">❌</span>
            <span>${message}</span>
        </div>
    `;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

function showLoading(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                <div class="loading-spinner" style="
                    width: 40px;
                    height: 40px;
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #667eea;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px auto;
                "></div>
                <p>${message}</p>
            </div>
        `;
        
        // Add spin animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

window.loadCrew = loadCrew;
window.showAddCrewModal = showAddCrewModal;
window.closeAddCrewModal = closeAddCrewModal;
window.showUpdateCrewModal = showUpdateCrewModal;
window.closeUpdateCrewModal = closeUpdateCrewModal;
window.showAssignTaskModal = showAssignTaskModal;
window.closeAssignTaskModal = closeAssignTaskModal;
window.confirmDeleteCrew = confirmDeleteCrew;
window.confirmDelete = confirmDelete;
window.closeConfirmModal = closeConfirmModal;