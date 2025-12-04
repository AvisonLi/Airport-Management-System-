// Crew Management JavaScript

// Global variables
let crewMembers = [];
let groundServices = [];

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    loadCrew();
    loadGroundServices();
    
    // Add Crew Form Submission
    document.getElementById('addCrewForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addCrewMember();
    });
    
    // Update Crew Form Submission
    document.getElementById('updateCrewForm').addEventListener('submit', function(e) {
        e.preventDefault();
        updateCrewMember();
    });
    
    // Assign Task Form Submission
    document.getElementById('assignTaskForm').addEventListener('submit', function(e) {
        e.preventDefault();
        assignTask();
    });
});

// Load all crew members
async function loadCrew() {
    try {
        const response = await fetch('/api/crew');
        const data = await response.json();
        
        if (data.success) {
            crewMembers = data.crew;
            displayCrewMembers(crewMembers);
            updateStatistics();
        } else {
            showError('Failed to load crew members: ' + data.message);
        }
    } catch (error) {
        showError('Error loading crew members: ' + error.message);
    }
}

// Load ground services for task assignment
async function loadGroundServices() {
    try {
        const response = await fetch('/api/ground-services');
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                groundServices = data.services;
            }
        }
    } catch (error) {
        console.error('Error loading ground services:', error);
    }
}

// Display crew members in grid
function displayCrewMembers(crewList) {
    const crewGrid = document.getElementById('crewGrid');
    
    if (!crewList || crewList.length === 0) {
        crewGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                <p>No crew members found. Add your first crew member!</p>
            </div>
        `;
        return;
    }
    
    crewGrid.innerHTML = crewList.map(crew => {
        // Determine status badge color
        let statusBadge = '';
        switch(crew.status) {
            case 'available':
                statusBadge = '<span class="badge badge-success">Available</span>';
                break;
            case 'on_task':
                statusBadge = '<span class="badge badge-warning">On Task</span>';
                break;
            case 'off_duty':
                statusBadge = '<span class="badge badge-secondary">Off Duty</span>';
                break;
            default:
                statusBadge = `<span class="badge">${crew.status}</span>`;
        }
        
        // Determine crew type icon
        let typeIcon = '👷';
        switch(crew.crew_type) {
            case 'cleaning':
                typeIcon = '🧹';
                break;
            case 'fueling':
                typeIcon = '⛽';
                break;
            case 'catering':
                typeIcon = '🍱';
                break;
            case 'maintenance':
                typeIcon = '🔧';
                break;
        }
        
        // Format shift hours
        const shiftHours = crew.shift_start && crew.shift_end 
            ? `${crew.shift_start} - ${crew.shift_end}`
            : '08:00 - 16:00';
        
        // Format tasks completed
        const tasksCompleted = crew.total_tasks_completed || 0;
        const tasksToday = crew.tasks_completed_today || 0;
        
        return `
            <div class="crew-card" id="crew-${crew.crew_id}">
                <div class="crew-card-header">
                    <div class="crew-avatar">
                        ${typeIcon}
                    </div>
                    <div class="crew-info">
                        <h4>${crew.full_name}</h4>
                        <div class="crew-type">${getCrewTypeName(crew.crew_type)}</div>
                    </div>
                    ${statusBadge}
                </div>
                
                <div class="crew-card-details">
                    <div class="crew-detail">
                        <span class="detail-label">ID:</span>
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
                    <button class="btn btn-sm btn-outline-success" onclick="showAssignTaskModal('${crew.crew_id}', '${crew.full_name}')" ${crew.status !== 'available' ? 'disabled' : ''}>
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
function updateStatistics() {
    const totalCrew = crewMembers.length;
    const availableCount = crewMembers.filter(c => c.status === 'available').length;
    const onTaskCount = crewMembers.filter(c => c.status === 'on_task').length;
    
    // Calculate tasks today from ground services
    const today = new Date().toISOString().split('T')[0];
    const tasksToday = groundServices.filter(service => {
        const serviceDate = new Date(service.created_at).toISOString().split('T')[0];
        return serviceDate === today;
    }).length;
    
    document.getElementById('totalCrewCount').textContent = totalCrew;
    document.getElementById('availableCount').textContent = availableCount;
    document.getElementById('onTaskCount').textContent = onTaskCount;
    document.getElementById('tasksToday').textContent = tasksToday;
}

// Get crew type name
function getCrewTypeName(type) {
    const typeNames = {
        'cleaning': 'Cleaning Crew',
        'fueling': 'Fueling Crew',
        'catering': 'Catering Crew',
        'maintenance': 'Maintenance Crew',
        'baggage': 'Baggage Crew',
        'pushback': 'Pushback Crew'
    };
    return typeNames[type] || type;
}

// Add Crew Member
async function addCrewMember() {
    const form = document.getElementById('addCrewForm');
    const formData = {
        full_name: document.getElementById('fullName').value,
        crew_type: document.getElementById('crewType').value,
        qualification: document.getElementById('qualification').value,
        contact_number: document.getElementById('contactNumber').value,
        status: document.getElementById('status').value
    };
    
    // Validation
    if (!formData.full_name || !formData.crew_type || !formData.qualification) {
        showError('Please fill in all required fields');
        return;
    }
    
    try {
        const response = await fetch('/api/crew', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Crew member added successfully!');
            closeAddCrewModal();
            loadCrew();
            form.reset();
        } else {
            showError('Failed to add crew member: ' + data.message);
        }
    } catch (error) {
        showError('Error adding crew member: ' + error.message);
    }
}

// Update Crew Member
async function updateCrewMember() {
    const crewId = document.getElementById('updateCrewId').value;
    
    const updateData = {
        full_name: document.getElementById('updateFullName').value,
        crew_type: document.getElementById('updateCrewType').value,
        qualification: document.getElementById('updateQualification').value,
        contact_number: document.getElementById('updateContactNumber').value,
        status: document.getElementById('updateStatus').value,
        shift_start: document.getElementById('updateShiftStart').value || '08:00',
        shift_end: document.getElementById('updateShiftEnd').value || '16:00'
    };
    
    // Validation
    if (!updateData.full_name || !updateData.crew_type || !updateData.qualification) {
        showError('Please fill in all required fields');
        return;
    }
    
    try {
        const response = await fetch(`/api/crew/${crewId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Crew member updated successfully!');
            closeUpdateCrewModal();
            loadCrew();
        } else {
            showError('Failed to update crew member: ' + data.message);
        }
    } catch (error) {
        showError('Error updating crew member: ' + error.message);
    }
}

// Assign Task to Crew
async function assignTask() {
    const crewId = document.getElementById('assignCrewId').value;
    
    const taskData = {
        service_type: document.getElementById('taskType').value,
        flight_code: document.getElementById('taskFlightCode').value,
        scheduled_time: new Date().toISOString(),
        notes: document.getElementById('taskDescription').value || '',
        priority: document.getElementById('taskPriority').value,
        estimated_duration_minutes: parseInt(document.getElementById('taskDuration').value) || 30,
        assigned_crew: crewId
    };
    
    // Validation
    if (!taskData.service_type || !taskData.flight_code) {
        showError('Please fill in all required fields');
        return;
    }
    
    try {
        // First create the ground service
        const serviceResponse = await fetch('/api/ground-services', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
        
        const serviceData = await serviceResponse.json();
        
        if (serviceData.success) {
            // Then update crew status to on_task
            const crewResponse = await fetch(`/api/crew/${crewId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'on_task',
                    tasks_completed_today: (crewMembers.find(c => c.crew_id === crewId)?.tasks_completed_today || 0) + 1,
                    total_tasks_completed: (crewMembers.find(c => c.crew_id === crewId)?.total_tasks_completed || 0) + 1
                })
            });
            
            const crewData = await crewResponse.json();
            
            if (crewData.success) {
                showSuccess('Task assigned successfully!');
                closeAssignTaskModal();
                loadCrew();
                loadGroundServices();
            } else {
                showError('Task assigned but failed to update crew status: ' + crewData.message);
            }
        } else {
            showError('Failed to create task: ' + serviceData.message);
        }
    } catch (error) {
        showError('Error assigning task: ' + error.message);
    }
}

// Delete Crew Member
async function deleteCrewMember(crewId) {
    try {
        const response = await fetch(`/api/crew/${crewId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Crew member deleted successfully!');
            loadCrew();
        } else {
            showError('Failed to delete crew member: ' + data.message);
        }
    } catch (error) {
        showError('Error deleting crew member: ' + error.message);
    }
}

// Modal Functions
function showAddCrewModal() {
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
    if (!crew || crew.status !== 'available') {
        showError('Crew member is not available for task assignment');
        return;
    }
    
    document.getElementById('assignCrewId').value = crewId;
    document.getElementById('assignCrewName').value = crewName;
    
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

let deleteCrewId = null;

function confirmDeleteCrew(crewId, crewName) {
    deleteCrewId = crewId;
    document.getElementById('confirmTitle').textContent = 'Delete Crew Member';
    document.getElementById('confirmMessage').textContent = `Are you sure you want to delete "${crewName}"? This action cannot be undone.`;
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


function showSuccess(message) {
    alert(message); 
    console.log('Success:', message);
}

function showError(message) {
    alert('Error: ' + message); 
    console.error('Error:', message);
}

window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
};