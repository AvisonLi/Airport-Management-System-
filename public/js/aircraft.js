// Airport Aircraft Management System - FIXED VERSION
console.log('Aircraft Management System - Loading...');

// ============================================
// GLOBAL VARIABLES
// ============================================
let currentAircraftId = null;
let selectedFlight = null;

// ============================================
// INITIALIZATION
// ============================================

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Aircraft Page');
    initAircraftSystem();
});

// Main initialization function
function initAircraftSystem() {
    console.log('Initializing Aircraft System...');
    
    // Check if we're on the aircraft page
    if (!document.querySelector('.aircraft-list')) {
        console.log('Not on aircraft page, skipping initialization');
        return;
    }
    
    // Debug: Show what's available
    debugPageState();
    
    // Setup all event listeners
    setupEventListeners();
    
    // Initialize stats
    updateMaintenanceStats();
    
    // Initialize crew system
    initCrewAssignment();
    
    console.log('Aircraft System Initialized Successfully');
}

// Debug function to show current state
function debugPageState() {
    console.log('=== DEBUG INFO ===');
    
    // Check flight dropdown
    const flightSelect = document.getElementById('aircraft-flight-select');
    if (flightSelect) {
        console.log('Flight Select Found:', flightSelect.id);
        console.log('Flight Options:', flightSelect.options.length);
        for (let i = 0; i < flightSelect.options.length; i++) {
            console.log(`  ${i}: ${flightSelect.options[i].value} - ${flightSelect.options[i].text}`);
        }
    } else {
        console.error('❌ Flight Select NOT FOUND!');
    }
    
    // Check aircraft items
    const aircraftItems = document.querySelectorAll('.aircraft-item');
    console.log('Aircraft Items Found:', aircraftItems.length);
    aircraftItems.forEach(item => {
        console.log(`  Aircraft: ${item.dataset.aircraftId}, Status: ${item.className}`);
    });
    
    // Check crew elements
    const crewSelect = document.getElementById('crew-member-select');
    console.log('Crew Select Found:', crewSelect ? 'Yes' : 'No');
    
    console.log('=== END DEBUG ===');
}

// Setup all event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Flight selection
    const flightSelect = document.getElementById('aircraft-flight-select');
    if (flightSelect) {
        flightSelect.addEventListener('change', function() {
            console.log('Flight selected:', this.value);
            selectedFlight = this.value;
            onFlightSelected(this.value);
        });
    }
    
    // Aircraft type filter
    const typeFilter = document.getElementById('aircraft-type-filter');
    if (typeFilter) {
        typeFilter.addEventListener('change', function() {
            filterAircraftByType(this.value);
        });
    }
    
    // Crew type filter
    const crewTypeFilter = document.getElementById('crew-type-select');
    if (crewTypeFilter) {
        crewTypeFilter.addEventListener('change', function() {
            filterCrewByType(this.value);
        });
    }
    
    // Assign crew button
    const assignCrewBtn = document.querySelector('.btn-success[onclick*="assignCrewToTask"]');
    if (assignCrewBtn) {
        // Remove old onclick and add new event listener
        assignCrewBtn.removeAttribute('onclick');
        assignCrewBtn.addEventListener('click', assignCrewToTask);
    }
    
    // Refresh maintenance button
    const refreshBtn = document.querySelector('.btn-primary[onclick*="refreshMaintenanceList"]');
    if (refreshBtn) {
        refreshBtn.removeAttribute('onclick');
        refreshBtn.addEventListener('click', refreshMaintenanceList);
    }
    
    // Replacement aircraft select
    const replacementSelect = document.getElementById('replacement-aircraft-select');
    if (replacementSelect) {
        replacementSelect.addEventListener('change', function() {
            onReplacementSelected(this.value);
        });
    }
    
    // Confirm swap button
    const confirmSwapBtn = document.getElementById('confirm-swap-btn');
    if (confirmSwapBtn) {
        confirmSwapBtn.addEventListener('click', confirmSwap);
    }
    
    // Cancel swap button
    const cancelSwapBtn = document.querySelector('button[onclick*="cancelSwap"]');
    if (cancelSwapBtn) {
        cancelSwapBtn.removeAttribute('onclick');
        cancelSwapBtn.addEventListener('click', cancelSwap);
    }
    
    // Setup click handlers for assign aircraft buttons
    document.addEventListener('click', function(e) {
        // Assign aircraft button
        if (e.target.classList.contains('assign-aircraft-btn')) {
            const aircraftId = e.target.dataset.aircraftId || 
                              e.target.closest('.aircraft-item').dataset.aircraftId;
            if (aircraftId) {
                assignAircraft(aircraftId);
            }
        }
        
        // Swap aircraft button
        if (e.target.classList.contains('swap-aircraft-btn')) {
            const aircraftId = e.target.closest('.aircraft-item').dataset.aircraftId;
            if (aircraftId) {
                openSwapModal(aircraftId);
            }
        }
    });
    
    console.log('Event listeners setup complete');
}

// ============================================
// AIRCRAFT ASSIGNMENT FUNCTIONS
// ============================================

// Handle flight selection
function onFlightSelected(flightCode) {
    console.log('Flight selected handler:', flightCode);
    
    if (!flightCode || flightCode === '-- Select Flight --') {
        showMessage('Please select a valid flight', 'warning');
        return;
    }
    
    // Get flight details
    const flightSelect = document.getElementById('aircraft-flight-select');
    const flightOption = flightSelect.options[flightSelect.selectedIndex];
    const flightText = flightOption.text;
    
    showMessage(`Selected: ${flightText}`, 'info');
    
    // Filter aircraft for this flight
    filterAircraftForFlight(flightCode);
}

// Filter aircraft for selected flight
function filterAircraftForFlight(flightCode) {
    const aircraftItems = document.querySelectorAll('.aircraft-item');
    let availableCount = 0;
    
    aircraftItems.forEach(item => {
        const isAvailable = item.classList.contains('available');
        const isAssigned = item.classList.contains('assigned');
        
        // Show available and assigned aircraft
        item.style.display = (isAvailable || isAssigned) ? 'flex' : 'none';
        
        if (isAvailable) availableCount++;
    });
    
    console.log(`Available aircraft for flight ${flightCode}: ${availableCount}`);
    
    if (availableCount === 0) {
        showMessage('No available aircraft for this flight', 'warning');
    }
}

// Filter aircraft by type
function filterAircraftByType(type) {
    console.log('Filtering by type:', type);
    
    const aircraftItems = document.querySelectorAll('.aircraft-item');
    
    aircraftItems.forEach(item => {
        const aircraftType = item.querySelector('.aircraft-type').textContent;
        
        if (!type || aircraftType.toLowerCase().includes(type.toLowerCase())) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Assign aircraft to flight
function assignAircraft(aircraftId) {
    console.log('Assigning aircraft:', aircraftId);
    
    // Get selected flight
    const flightSelect = document.getElementById('aircraft-flight-select');
    if (!flightSelect || !flightSelect.value || flightSelect.value === '-- Select Flight --') {
        showMessage('Please select a flight first', 'error');
        return;
    }
    
    const flightCode = flightSelect.value;
    const flightText = flightSelect.options[flightSelect.selectedIndex].text;
    
    // Find aircraft element
    const aircraftElement = document.querySelector(`.aircraft-item[data-aircraft-id="${aircraftId}"]`);
    if (!aircraftElement) {
        showMessage('Aircraft not found', 'error');
        return;
    }
    
    // Check if aircraft is available
    if (!aircraftElement.classList.contains('available')) {
        showMessage('Aircraft is not available for assignment', 'error');
        return;
    }
    
    // Update UI
    aircraftElement.classList.remove('available');
    aircraftElement.classList.add('assigned');
    
    // Update status display
    const statusElement = aircraftElement.querySelector('.aircraft-status');
    if (statusElement) {
        statusElement.innerHTML = `<span class="status-assigned">🛫 Assigned to ${flightCode}</span>`;
    }
    
    // Update button
    const assignBtn = aircraftElement.querySelector('.assign-aircraft-btn');
    if (assignBtn) {
        assignBtn.remove();
        aircraftElement.innerHTML += `
            <button class="btn btn-sm btn-warning swap-aircraft-btn" 
                    data-aircraft-id="${aircraftId}">
                Swap Aircraft
            </button>
        `;
    }
    
    // Update maintenance stats
    updateMaintenanceStats();
    
    // Show success message
    showMessage(`Aircraft ${aircraftId} assigned to ${flightText}`, 'success');
    
    // Send to server (optional)
    sendAssignmentToServer(aircraftId, flightCode);
}

// Send assignment to server
async function sendAssignmentToServer(aircraftId, flightCode) {
    try {
        const response = await fetch('/api/aircraft/assign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                aircraft_id: aircraftId,
                flight_code: flightCode
            })
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('Assignment saved to server');
        }
    } catch (error) {
        console.error('Error saving assignment:', error);
    }
}

// ============================================
// AIRCRAFT SWAPPING FUNCTIONS
// ============================================

// Open swap modal
function openSwapModal(aircraftId) {
    console.log('Opening swap modal for:', aircraftId);
    
    currentAircraftId = aircraftId;
    
    // Get aircraft details
    const aircraftElement = document.querySelector(`.aircraft-item[data-aircraft-id="${aircraftId}"]`);
    if (!aircraftElement) return;
    
    const aircraftType = aircraftElement.querySelector('.aircraft-type').textContent;
    const flightSelect = document.getElementById('aircraft-flight-select');
    const flightText = flightSelect ? flightSelect.options[flightSelect.selectedIndex].text : 'No flight selected';
    
    // Update modal display
    document.getElementById('current-aircraft-id').textContent = aircraftId;
    document.getElementById('current-aircraft-details').textContent = aircraftType;
    document.getElementById('current-flight-info').textContent = flightText;
    
    // Populate replacement options
    populateReplacementAircraft(aircraftId);
    
    // Show swap card
    const swapCard = document.getElementById('swap-card');
    if (swapCard) {
        swapCard.style.display = 'block';
        swapCard.scrollIntoView({ behavior: 'smooth' });
    }
    
    showMessage(`Swap mode activated for ${aircraftId}`, 'info');
}

// Populate replacement aircraft dropdown
function populateReplacementAircraft(currentAircraftId) {
    const selectElement = document.getElementById('replacement-aircraft-select');
    if (!selectElement) return;
    
    // Clear existing options
    selectElement.innerHTML = '<option value="">-- Select Replacement --</option>';
    
    // Get all available aircraft except current one
    const availableAircraft = document.querySelectorAll('.aircraft-item.available');
    
    if (availableAircraft.length === 0) {
        selectElement.innerHTML = '<option value="">No available replacements</option>';
        return;
    }
    
    availableAircraft.forEach(aircraft => {
        const aircraftId = aircraft.dataset.aircraftId;
        if (aircraftId !== currentAircraftId) {
            const aircraftType = aircraft.querySelector('.aircraft-type').textContent;
            const option = document.createElement('option');
            option.value = aircraftId;
            option.textContent = `${aircraftId} - ${aircraftType}`;
            selectElement.appendChild(option);
        }
    });
}

// Handle replacement selection
function onReplacementSelected(aircraftId) {
    const replacementCard = document.getElementById('replacement-aircraft-card');
    const confirmBtn = document.getElementById('confirm-swap-btn');
    
    if (aircraftId) {
        const aircraftElement = document.querySelector(`.aircraft-item[data-aircraft-id="${aircraftId}"]`);
        if (aircraftElement) {
            const aircraftType = aircraftElement.querySelector('.aircraft-type').textContent;
            document.getElementById('replacement-aircraft-id').textContent = aircraftId;
            document.getElementById('replacement-aircraft-details').textContent = aircraftType;
            replacementCard.style.display = 'block';
            confirmBtn.disabled = false;
        }
    } else {
        replacementCard.style.display = 'none';
        confirmBtn.disabled = true;
    }
}

// Confirm swap
function confirmSwap() {
    if (!currentAircraftId) {
        showMessage('No aircraft selected for swap', 'error');
        return;
    }
    
    const replacementSelect = document.getElementById('replacement-aircraft-select');
    const replacementId = replacementSelect ? replacementSelect.value : null;
    
    if (!replacementId) {
        showMessage('Please select a replacement aircraft', 'error');
        return;
    }
    
    // Get the aircraft elements
    const currentAircraft = document.querySelector(`.aircraft-item[data-aircraft-id="${currentAircraftId}"]`);
    const replacementAircraft = document.querySelector(`.aircraft-item[data-aircraft-id="${replacementId}"]`);
    
    if (!currentAircraft || !replacementAircraft) {
        showMessage('Aircraft not found', 'error');
        return;
    }
    
    // Perform the swap
    swapAircraftStatus(currentAircraftId, replacementId);
    
    // Update UI
    updateMaintenanceStats();
    cancelSwap();
    
    showMessage(`Aircraft swapped: ${currentAircraftId} ↔ ${replacementId}`, 'success');
}

// Swap aircraft status
function swapAircraftStatus(currentId, replacementId) {
    const currentAircraft = document.querySelector(`.aircraft-item[data-aircraft-id="${currentId}"]`);
    const replacementAircraft = document.querySelector(`.aircraft-item[data-aircraft-id="${replacementId}"]`);
    
    if (!currentAircraft || !replacementAircraft) return;
    
    // Current aircraft becomes available
    currentAircraft.classList.remove('assigned');
    currentAircraft.classList.add('available');
    
    const currentStatus = currentAircraft.querySelector('.aircraft-status');
    if (currentStatus) {
        currentStatus.innerHTML = '<span class="status-available">✅ Available</span>';
    }
    
    // Remove swap button, add assign button
    const currentSwapBtn = currentAircraft.querySelector('.swap-aircraft-btn');
    if (currentSwapBtn) {
        currentSwapBtn.remove();
        currentAircraft.innerHTML += `
            <button class="btn btn-sm btn-primary assign-aircraft-btn" 
                    data-aircraft-id="${currentId}">
                Assign
            </button>
        `;
    }
    
    // Replacement aircraft becomes assigned
    replacementAircraft.classList.remove('available');
    replacementAircraft.classList.add('assigned');
    
    const replacementStatus = replacementAircraft.querySelector('.aircraft-status');
    if (replacementStatus) {
        replacementStatus.innerHTML = '<span class="status-assigned">🛫 Assigned</span>';
    }
    
    // Remove assign button, add swap button
    const replacementAssignBtn = replacementAircraft.querySelector('.assign-aircraft-btn');
    if (replacementAssignBtn) {
        replacementAssignBtn.remove();
        replacementAircraft.innerHTML += `
            <button class="btn btn-sm btn-warning swap-aircraft-btn" 
                    data-aircraft-id="${replacementId}">
                Swap Aircraft
            </button>
        `;
    }
}

// Cancel swap
function cancelSwap() {
    currentAircraftId = null;
    
    const swapCard = document.getElementById('swap-card');
    if (swapCard) swapCard.style.display = 'none';
    
    const selectElement = document.getElementById('replacement-aircraft-select');
    if (selectElement) selectElement.value = '';
    
    const replacementCard = document.getElementById('replacement-aircraft-card');
    if (replacementCard) replacementCard.style.display = 'none';
    
    const confirmBtn = document.getElementById('confirm-swap-btn');
    if (confirmBtn) confirmBtn.disabled = true;
}

// ============================================
// MAINTENANCE TRACKING FUNCTIONS
// ============================================

// Update maintenance statistics
function updateMaintenanceStats() {
    console.log('Updating maintenance stats...');
    
    const aircraftItems = document.querySelectorAll('.aircraft-item');
    let inMaintenance = 0;
    let available = 0;
    let inService = 0;
    
    aircraftItems.forEach(item => {
        if (item.classList.contains('maintenance')) {
            inMaintenance++;
        } else if (item.classList.contains('available')) {
            available++;
        } else if (item.classList.contains('assigned')) {
            inService++;
        }
    });
    
    console.log('Stats - Maintenance:', inMaintenance, 'Available:', available, 'In Service:', inService);
    
    // Update display
    const updateStat = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    
    updateStat('maintenance-count', inMaintenance);
    updateStat('available-count', available);
    updateStat('service-count', inService);
}

// Refresh maintenance list
function refreshMaintenanceList() {
    console.log('Refreshing maintenance list...');
    
    // Simulate API call
    setTimeout(() => {
        updateMaintenanceStats();
        showMessage('Maintenance list refreshed', 'success');
    }, 500);
}

// ============================================
// CREW ASSIGNMENT FUNCTIONS - FIXED
// ============================================

// Initialize crew assignment system
function initCrewAssignment() {
    console.log('Initializing crew assignment...');
    
    // Populate crew dropdown
    populateCrewDropdown();
    
    // Populate aircraft dropdown for tasks
    populateTaskAircraftDropdown();
    
    console.log('Crew assignment system ready');
}

// Populate crew dropdown
function populateCrewDropdown() {
    const crewSelect = document.getElementById('crew-member-select');
    if (!crewSelect) {
        console.error('Crew select element not found');
        return;
    }
    
    // Start with default option
    crewSelect.innerHTML = '<option value="">-- Select Crew Member --</option>';
    
    // Add crew options from server data (embedded in HTML)
    const crewData = [
        { id: 'CC-001', name: 'Michael Chen', type: 'Cleaning Crew' },
        { id: 'FC-001', name: 'David Wong', type: 'Fueling Crew' },
        { id: 'CT-001', name: 'Sarah Lee', type: 'Catering Crew' },
        { id: 'MC-001', name: 'Robert Kim', type: 'Maintenance Crew' }
    ];
    
    crewData.forEach(crew => {
        const option = document.createElement('option');
        option.value = crew.id;
        option.textContent = `${crew.name} - ${crew.type}`;
        option.dataset.crewType = crew.type.toLowerCase();
        crewSelect.appendChild(option);
    });
    
    console.log('Crew dropdown populated with', crewData.length, 'options');
}

// Populate aircraft dropdown for tasks
function populateTaskAircraftDropdown() {
    const aircraftSelect = document.getElementById('task-aircraft-select');
    if (!aircraftSelect) return;
    
    aircraftSelect.innerHTML = '<option value="">-- Select Aircraft --</option>';
    
    const aircraftItems = document.querySelectorAll('.aircraft-item');
    aircraftItems.forEach(item => {
        const aircraftId = item.dataset.aircraftId;
        const aircraftType = item.querySelector('.aircraft-type').textContent;
        
        const option = document.createElement('option');
        option.value = aircraftId;
        option.textContent = `${aircraftId} - ${aircraftType}`;
        aircraftSelect.appendChild(option);
    });
    
    console.log('Task aircraft dropdown populated with', aircraftItems.length, 'options');
}

// Filter crew by type
function filterCrewByType(type) {
    const crewSelect = document.getElementById('crew-member-select');
    if (!crewSelect) return;
    
    const options = crewSelect.options;
    
    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const crewType = option.dataset.crewType || '';
        
        if (!type || i === 0 || crewType.includes(type.toLowerCase())) {
            option.style.display = '';
        } else {
            option.style.display = 'none';
        }
    }
    
    // Reset to first option if current selection is hidden
    if (crewSelect.value && options[crewSelect.selectedIndex].style.display === 'none') {
        crewSelect.value = '';
    }
}

// Assign crew to task
function assignCrewToTask() {
    console.log('Assigning crew to task...');
    
    const crewSelect = document.getElementById('crew-member-select');
    const aircraftSelect = document.getElementById('task-aircraft-select');
    const taskDescription = document.getElementById('task-description');
    
    const crewId = crewSelect ? crewSelect.value : null;
    const aircraftId = aircraftSelect ? aircraftSelect.value : null;
    const description = taskDescription ? taskDescription.value.trim() : '';
    
    // Validation
    if (!crewId) {
        showMessage('Please select a crew member', 'error');
        return;
    }
    
    if (!aircraftId) {
        showMessage('Please select an aircraft', 'error');
        return;
    }
    
    if (!description) {
        showMessage('Please enter a task description', 'error');
        return;
    }
    
    // Get selected values
    const crewText = crewSelect.options[crewSelect.selectedIndex].text;
    const aircraftText = aircraftSelect.options[aircraftSelect.selectedIndex].text;
    
    // Show success message
    showMessage(`Crew assigned: ${crewText} to ${description} on ${aircraftText}`, 'success');
    
    // Add to task log (simulated)
    addToTaskLog(crewText, aircraftText, description);
    
    // Clear form
    if (crewSelect) crewSelect.value = '';
    if (aircraftSelect) aircraftSelect.value = '';
    if (taskDescription) taskDescription.value = '';
}

// Add task to log
function addToTaskLog(crew, aircraft, task) {
    // This would normally add to a database
    console.log('Task logged:', { crew, aircraft, task, timestamp: new Date().toISOString() });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Show message/notification
function showMessage(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <strong>${type.toUpperCase()}:</strong> ${message}
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add to page
    const container = document.querySelector('.main-content') || document.body;
    container.insertBefore(notification, container.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    // Close button handler
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
}

// ============================================
// GLOBAL EXPORTS
// ============================================

// Make functions available globally
window.initAircraftSystem = initAircraftSystem;
window.assignAircraft = assignAircraft;
window.openSwapModal = openSwapModal;
window.confirmSwap = confirmSwap;
window.cancelSwap = cancelSwap;
window.refreshMaintenanceList = refreshMaintenanceList;
window.filterCrewByType = filterCrewByType;
window.assignCrewToTask = assignCrewToTask;