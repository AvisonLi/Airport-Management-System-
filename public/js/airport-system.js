// ============================================
// AIRCRAFT MANAGEMENT FUNCTIONS
// ============================================

// Global Variables
let currentAircraftId = null;

// Initialize aircraft page - SIMPLIFIED VERSION
function initAircraftPage() {
    console.log('Aircraft page initialized - DEBUG ENABLED');
    
    // Debug: Log all available flights
    const flightSelect = document.getElementById('aircraft-flight-select');
    console.log('Flight select element:', flightSelect);
    if (flightSelect) {
        console.log('Flight options:', flightSelect.innerHTML);
    }
    
    // Debug: Log all aircraft items
    const aircraftItems = document.querySelectorAll('.aircraft-item');
    console.log('Aircraft items found:', aircraftItems.length);
    aircraftItems.forEach(item => {
        console.log('Aircraft:', item.dataset.aircraftId, item.className);
    });
    
    // Force update maintenance stats
    updateMaintenanceStats();
    
    // Add event listeners with error handling
    setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
    const flightSelect = document.getElementById('aircraft-flight-select');
    const typeFilter = document.getElementById('aircraft-type-filter');
    
    if (flightSelect) {
        console.log('Setting up flight select listener');
        flightSelect.addEventListener('change', function() {
            console.log('Flight select changed to:', this.value);
            handleFlightSelection(this.value);
        });
        
        // Force trigger change event if flight is selected
        if (flightSelect.value) {
            handleFlightSelection(flightSelect.value);
        }
    } else {
        console.error('Flight select element not found!');
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', function() {
            filterAircraft(this.value);
        });
    }
    
    // Setup click handlers for assign buttons
    document.addEventListener('click', function(e) {
        // Handle assign aircraft
        if (e.target.classList.contains('assign-aircraft-btn')) {
            const aircraftItem = e.target.closest('.aircraft-item');
            if (aircraftItem) {
                const aircraftId = aircraftItem.dataset.aircraftId;
                console.log('Assign button clicked for aircraft:', aircraftId);
                assignAircraft(aircraftId);
            }
        }
        
        // Handle swap aircraft
        if (e.target.classList.contains('swap-aircraft-btn')) {
            const aircraftItem = e.target.closest('.aircraft-item');
            if (aircraftItem) {
                const aircraftId = aircraftItem.dataset.aircraftId;
                console.log('Swap button clicked for aircraft:', aircraftId);
                openSwapModal(aircraftId);
            }
        }
    });
}

// Handle flight selection
function handleFlightSelection(selectedValue) {
    console.log('Flight selection handler called with:', selectedValue);
    
    if (selectedValue && selectedValue !== '-- Select Flight --') {
        // Get flight details
        const flightSelect = document.getElementById('aircraft-flight-select');
        const flightText = flightSelect ? flightSelect.options[flightSelect.selectedIndex].text : selectedValue;
        
        console.log('Flight selected:', flightText);
        showNotification(`Flight selected: ${flightText}`, 'info');
        
        // Filter aircraft for this flight
        filterAircraftForFlight(selectedValue);
    } else {
        // Show all aircraft
        showAllAircraft();
    }
}

// Filter aircraft for specific flight
function filterAircraftForFlight(flightCode) {
    console.log('Filtering aircraft for flight:', flightCode);
    
    // Simple logic: Show available aircraft for assignment
    const aircraftItems = document.querySelectorAll('.aircraft-item');
    
    aircraftItems.forEach(item => {
        const aircraftType = item.querySelector('.aircraft-type').textContent;
        const isAvailable = item.classList.contains('available');
        const isAssigned = item.classList.contains('assigned');
        
        // Show available aircraft for assignment
        // Also show already assigned aircraft (for swapping)
        item.style.display = (isAvailable || isAssigned) ? 'flex' : 'none';
    });
    
    // Update statistics
    updateMaintenanceStats();
    
    // Show count
    const visibleItems = document.querySelectorAll('.aircraft-item[style*="flex"]');
    console.log('Visible aircraft after filtering:', visibleItems.length);
}

// Show all aircraft
function showAllAircraft() {
    const aircraftItems = document.querySelectorAll('.aircraft-item');
    aircraftItems.forEach(item => {
        item.style.display = 'flex';
    });
    
    updateMaintenanceStats();
}

// Filter aircraft by type
function filterAircraft(selectedType) {
    console.log('Filtering by type:', selectedType);
    
    const aircraftItems = document.querySelectorAll('.aircraft-item');
    
    aircraftItems.forEach(item => {
        const aircraftType = item.querySelector('.aircraft-type').textContent;
        
        if (!selectedType || aircraftType.toLowerCase().includes(selectedType.toLowerCase())) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
    
    updateMaintenanceStats();
}

// Assign aircraft to flight
function assignAircraft(aircraftId) {
    console.log('Assigning aircraft:', aircraftId);
    
    const flightSelect = document.getElementById('aircraft-flight-select');
    const selectedFlight = flightSelect ? flightSelect.value : null;
    
    if (!selectedFlight || selectedFlight === '-- Select Flight --') {
        alert('⚠️ Please select a flight first!');
        return;
    }
    
    const aircraftElement = document.querySelector(`.aircraft-item[data-aircraft-id="${aircraftId}"]`);
    if (!aircraftElement) {
        console.error('Aircraft element not found:', aircraftId);
        return;
    }
    
    // Get flight text for display
    const flightText = flightSelect.options[flightSelect.selectedIndex].text;
    
    // Update UI
    aircraftElement.classList.remove('available');
    aircraftElement.classList.add('assigned');
    
    // Update status
    const statusElement = aircraftElement.querySelector('.aircraft-status');
    if (statusElement) {
        statusElement.innerHTML = `🛫 Assigned to ${selectedFlight}`;
    }
    
    // Update button
    const assignBtn = aircraftElement.querySelector('.assign-aircraft-btn');
    if (assignBtn) {
        assignBtn.remove();
        aircraftElement.innerHTML += `
            <button class="btn btn-sm btn-warning swap-aircraft-btn" 
                    onclick="openSwapModal('${aircraftId}')">
                Swap Aircraft
            </button>
        `;
    }
    
    // Update statistics
    updateMaintenanceStats();
    
    // Show success message
    showNotification(`✓ Aircraft ${aircraftId} assigned to flight ${flightText}`, 'success');
}

// Open swap modal
function openSwapModal(aircraftId) {
    console.log('Opening swap modal for aircraft:', aircraftId);
    
    currentAircraftId = aircraftId;
    
    // Get aircraft details
    const aircraftElement = document.querySelector(`.aircraft-item[data-aircraft-id="${aircraftId}"]`);
    if (!aircraftElement) return;
    
    const aircraftType = aircraftElement.querySelector('.aircraft-type').textContent;
    const flightSelect = document.getElementById('aircraft-flight-select');
    const flightText = flightSelect ? flightSelect.options[flightSelect.selectedIndex].text : 'No flight selected';
    
    // Set current aircraft info
    document.getElementById('current-aircraft-id').textContent = aircraftId;
    document.getElementById('current-aircraft-details').textContent = aircraftType;
    document.getElementById('current-flight-info').textContent = flightText;
    
    // Populate replacement options
    populateReplacementAircraft(aircraftId);
    
    // Show swap card
    document.getElementById('swap-card').style.display = 'block';
    document.getElementById('swap-card').scrollIntoView({ behavior: 'smooth' });
    
    console.log('Swap modal opened for aircraft:', aircraftId);
}

// Populate replacement aircraft
function populateReplacementAircraft(currentAircraftId) {
    console.log('Populating replacements for aircraft:', currentAircraftId);
    
    const selectElement = document.getElementById('replacement-aircraft-select');
    if (!selectElement) return;
    
    // Clear existing options
    selectElement.innerHTML = '<option value="">-- Select Replacement --</option>';
    
    // Get available aircraft (excluding current)
    const availableAircraft = document.querySelectorAll('.aircraft-item.available');
    
    console.log('Available aircraft for replacement:', availableAircraft.length);
    
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
function handleReplacementSelect() {
    const selectElement = document.getElementById('replacement-aircraft-select');
    if (!selectElement) return;
    
    const selectedId = selectElement.value;
    const replacementCard = document.getElementById('replacement-aircraft-card');
    const confirmBtn = document.getElementById('confirm-swap-btn');
    
    if (selectedId) {
        const aircraftElement = document.querySelector(`.aircraft-item[data-aircraft-id="${selectedId}"]`);
        if (aircraftElement) {
            const aircraftType = aircraftElement.querySelector('.aircraft-type').textContent;
            document.getElementById('replacement-aircraft-id').textContent = selectedId;
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
    console.log('Confirming swap for aircraft:', currentAircraftId);
    
    const replacementSelect = document.getElementById('replacement-aircraft-select');
    const replacementId = replacementSelect ? replacementSelect.value : null;
    
    if (!currentAircraftId || !replacementId) {
        alert('Please select a replacement aircraft');
        return;
    }
    
    // Swap the aircraft status
    const currentAircraft = document.querySelector(`.aircraft-item[data-aircraft-id="${currentAircraftId}"]`);
    const replacementAircraft = document.querySelector(`.aircraft-item[data-aircraft-id="${replacementId}"]`);
    
    if (currentAircraft && replacementAircraft) {
        // Current aircraft becomes available
        currentAircraft.classList.remove('assigned');
        currentAircraft.classList.add('available');
        
        const currentStatus = currentAircraft.querySelector('.aircraft-status');
        if (currentStatus) {
            currentStatus.innerHTML = '✅ Available';
        }
        
        // Update current aircraft button
        const currentSwapBtn = currentAircraft.querySelector('.swap-aircraft-btn');
        if (currentSwapBtn) {
            currentSwapBtn.remove();
            currentAircraft.innerHTML += `
                <button class="btn btn-sm btn-primary assign-aircraft-btn" 
                        onclick="assignAircraft('${currentAircraftId}')">
                    Assign
                </button>
            `;
        }
        
        // Replacement aircraft becomes assigned
        replacementAircraft.classList.remove('available');
        replacementAircraft.classList.add('assigned');
        
        const replacementStatus = replacementAircraft.querySelector('.aircraft-status');
        if (replacementStatus) {
            replacementStatus.innerHTML = '🛫 Assigned';
        }
        
        // Update replacement aircraft button
        const replacementAssignBtn = replacementAircraft.querySelector('.assign-aircraft-btn');
        if (replacementAssignBtn) {
            replacementAssignBtn.remove();
            replacementAircraft.innerHTML += `
                <button class="btn btn-sm btn-warning swap-aircraft-btn" 
                        onclick="openSwapModal('${replacementId}')">
                    Swap Aircraft
                </button>
            `;
        }
        
        // Update statistics
        updateMaintenanceStats();
        
        // Close swap modal
        cancelSwap();
        
        showNotification(`✓ Aircraft swapped: ${currentAircraftId} ↔ ${replacementId}`, 'success');
        
        console.log('Swap completed successfully');
    }
}

// Cancel swap
function cancelSwap() {
    console.log('Cancelling swap');
    
    currentAircraftId = null;
    document.getElementById('swap-card').style.display = 'none';
    
    const selectElement = document.getElementById('replacement-aircraft-select');
    if (selectElement) {
        selectElement.value = '';
    }
    
    const replacementCard = document.getElementById('replacement-aircraft-card');
    if (replacementCard) {
        replacementCard.style.display = 'none';
    }
    
    const confirmBtn = document.getElementById('confirm-swap-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
    }
}

// Update maintenance stats
function updateMaintenanceStats() {
    console.log('Updating maintenance stats');
    
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
    const maintenanceCount = document.getElementById('maintenance-count');
    const availableCount = document.getElementById('available-count');
    const serviceCount = document.getElementById('service-count');
    
    if (maintenanceCount) maintenanceCount.textContent = inMaintenance;
    if (availableCount) availableCount.textContent = available;
    if (serviceCount) serviceCount.textContent = inService;
}

// Refresh maintenance list
function refreshMaintenanceList() {
    console.log('Refreshing maintenance list');
    
    // Simulate refresh
    updateMaintenanceStats();
    showNotification('Maintenance list refreshed', 'info');
}

// ============================================
// CREW ASSIGNMENT FUNCTIONS
// ============================================

// Initialize crew assignment
async function initCrewAssignment() {
    console.log('Initializing crew assignment');
    
    try {
        // Populate crew member dropdown
        const crewSelect = document.getElementById('crew-member-select');
        if (crewSelect) {
            crewSelect.innerHTML = `
                <option value="">-- Select Crew Member --</option>
                <option value="CC-001">Michael Chen - Cleaning Crew</option>
                <option value="FC-001">David Wong - Fueling Crew</option>
                <option value="CT-001">Sarah Lee - Catering Crew</option>
                <option value="MC-001">Robert Kim - Maintenance Crew</option>
            `;
        }
        
        // Populate aircraft dropdown for tasks
        const aircraftSelect = document.getElementById('task-aircraft-select');
        if (aircraftSelect) {
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
        }
    } catch (error) {
        console.error('Error initializing crew assignment:', error);
    }
}

// Filter crew by type
function filterCrewByType() {
    console.log('Filtering crew by type');
    
    const typeSelect = document.getElementById('crew-type-select');
    const crewSelect = document.getElementById('crew-member-select');
    
    if (!typeSelect || !crewSelect) return;
    
    const selectedType = typeSelect.value.toLowerCase();
    const options = crewSelect.options;
    
    // Show all options if no type selected
    if (!selectedType) {
        for (let i = 0; i < options.length; i++) {
            options[i].style.display = '';
        }
        return;
    }
    
    // Filter by type
    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const optionText = option.textContent.toLowerCase();
        
        if (i === 0 || optionText.includes(selectedType)) {
            option.style.display = '';
        } else {
            option.style.display = 'none';
        }
    }
}

// Assign crew to task
function assignCrewToTask() {
    console.log('Assigning crew to task');
    
    const crewSelect = document.getElementById('crew-member-select');
    const aircraftSelect = document.getElementById('task-aircraft-select');
    const taskDescription = document.getElementById('task-description');
    
    const crewId = crewSelect ? crewSelect.value : null;
    const aircraftId = aircraftSelect ? aircraftSelect.value : null;
    const description = taskDescription ? taskDescription.value : '';
    
    if (!crewId || !aircraftId || !description) {
        alert('Please fill all fields');
        return;
    }
    
    // Get crew and aircraft details
    const crewOption = crewSelect.options[crewSelect.selectedIndex];
    const aircraftOption = aircraftSelect.options[aircraftSelect.selectedIndex];
    
    showNotification(`Crew ${crewOption.text} assigned to ${description} on aircraft ${aircraftOption.text}`, 'success');
    
    // Clear form
    if (crewSelect) crewSelect.value = '';
    if (aircraftSelect) aircraftSelect.value = '';
    if (taskDescription) taskDescription.value = '';
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Show notification
function showNotification(message, type = 'info') {
    console.log('Notification:', type, message);
    
    // Simple browser notification for debugging
    if (type === 'error') {
        alert('Error: ' + message);
    } else if (type === 'success') {
        alert('Success: ' + message);
    } else {
        console.log('Info:', message);
    }
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize based on current page
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');
    
    // Check if we're on the aircraft page
    const aircraftSection = document.getElementById('aircraft-section');
    const aircraftList = document.querySelector('.aircraft-list');
    
    if (aircraftSection || aircraftList) {
        console.log('Aircraft page detected, initializing...');
        
        // Give DOM time to fully render
        setTimeout(() => {
            initAircraftPage();
        }, 100);
    }
    
    // Add event listener for replacement select
    const replacementSelect = document.getElementById('replacement-aircraft-select');
    if (replacementSelect) {
        replacementSelect.addEventListener('change', handleReplacementSelect);
    }
});

// Export functions for global access
window.assignAircraft = assignAircraft;
window.openSwapModal = openSwapModal;
window.confirmSwap = confirmSwap;
window.cancelSwap = cancelSwap;
window.refreshMaintenanceList = refreshMaintenanceList;
window.filterCrewByType = filterCrewByType;
window.assignCrewToTask = assignCrewToTask;
window.handleReplacementSelect = handleReplacementSelect;