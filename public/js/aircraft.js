console.log('Aircraft Management System - Loading...');


let currentAircraftId = null;
let selectedFlight = null;


document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Aircraft Page');
    initAircraftSystem();
});


function initAircraftSystem() {
    console.log('Initializing Aircraft System...');
    
    
    if (!document.querySelector('.aircraft-list')) {
        console.log('Not on aircraft page, skipping initialization');
        return;
    }
    
    
    debugPageState();
    

    setupEventListeners();
    
    // Initialize stats
    updateMaintenanceStats();
    

    initCrewAssignment();
    
    console.log('Aircraft System Initialized Successfully');
}


function debugPageState() {
    console.log('=== DEBUG INFO ===');
    

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
    
 
    const aircraftItems = document.querySelectorAll('.aircraft-item');
    console.log('Aircraft Items Found:', aircraftItems.length);
    aircraftItems.forEach(item => {
        console.log(`  Aircraft: ${item.dataset.aircraftId}, Status: ${item.className}`);
    });
    
    
    const crewSelect = document.getElementById('crew-member-select');
    console.log('Crew Select Found:', crewSelect ? 'Yes' : 'No');
    
    console.log('=== END DEBUG ===');
}


function setupEventListeners() {
    console.log('Setting up event listeners...');
    
  
    const flightSelect = document.getElementById('aircraft-flight-select');
    if (flightSelect) {
        flightSelect.addEventListener('change', function() {
            console.log('Flight selected:', this.value);
            selectedFlight = this.value;
            onFlightSelected(this.value);
        });
    }
    

    const typeFilter = document.getElementById('aircraft-type-filter');
    if (typeFilter) {
        typeFilter.addEventListener('change', function() {
            filterAircraftByType(this.value);
        });
    }
    

    const crewTypeFilter = document.getElementById('crew-type-select');
    if (crewTypeFilter) {
        crewTypeFilter.addEventListener('change', function() {
            filterCrewByType(this.value);
        });
    }
    
 
    const assignCrewBtn = document.querySelector('.btn-success[onclick*="assignCrewToTask"]');
    if (assignCrewBtn) {
     
        assignCrewBtn.removeAttribute('onclick');
        assignCrewBtn.addEventListener('click', assignCrewToTask);
    }
    
 
    const refreshBtn = document.querySelector('.btn-primary[onclick*="refreshMaintenanceList"]');
    if (refreshBtn) {
        refreshBtn.removeAttribute('onclick');
        refreshBtn.addEventListener('click', refreshMaintenanceList);
    }
    

    const replacementSelect = document.getElementById('replacement-aircraft-select');
    if (replacementSelect) {
        replacementSelect.addEventListener('change', function() {
            onReplacementSelected(this.value);
        });
    }
    
  
    const confirmSwapBtn = document.getElementById('confirm-swap-btn');
    if (confirmSwapBtn) {
        confirmSwapBtn.addEventListener('click', confirmSwap);
    }
    
    
    const cancelSwapBtn = document.querySelector('button[onclick*="cancelSwap"]');
    if (cancelSwapBtn) {
        cancelSwapBtn.removeAttribute('onclick');
        cancelSwapBtn.addEventListener('click', cancelSwap);
    }
    

    document.addEventListener('click', function(e) {
      
        if (e.target.classList.contains('assign-aircraft-btn')) {
            const aircraftId = e.target.dataset.aircraftId || 
                              e.target.closest('.aircraft-item').dataset.aircraftId;
            if (aircraftId) {
                assignAircraft(aircraftId);
            }
        }
        
  
        if (e.target.classList.contains('swap-aircraft-btn')) {
            const aircraftId = e.target.closest('.aircraft-item').dataset.aircraftId;
            if (aircraftId) {
                openSwapModal(aircraftId);
            }
        }
    });
    
    console.log('Event listeners setup complete');
}

function onFlightSelected(flightCode) {
    console.log('Flight selected handler:', flightCode);
    
    if (!flightCode || flightCode === '-- Select Flight --') {
        showMessage('Please select a valid flight', 'warning');
        return;
    }
    

    const flightSelect = document.getElementById('aircraft-flight-select');
    const flightOption = flightSelect.options[flightSelect.selectedIndex];
    const flightText = flightOption.text;
    
    showMessage(`Selected: ${flightText}`, 'info');
    

    filterAircraftForFlight(flightCode);
}


function filterAircraftForFlight(flightCode) {
    const aircraftItems = document.querySelectorAll('.aircraft-item');
    let availableCount = 0;
    
    aircraftItems.forEach(item => {
        const isAvailable = item.classList.contains('available');
        const isAssigned = item.classList.contains('assigned');
        
        item.style.display = (isAvailable || isAssigned) ? 'flex' : 'none';
        
        if (isAvailable) availableCount++;
    });
    
    console.log(`Available aircraft for flight ${flightCode}: ${availableCount}`);
    
    if (availableCount === 0) {
        showMessage('No available aircraft for this flight', 'warning');
    }
}

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

function assignAircraft(aircraftId) {
    console.log('Assigning aircraft:', aircraftId);
    
    const flightSelect = document.getElementById('aircraft-flight-select');
    if (!flightSelect || !flightSelect.value || flightSelect.value === '-- Select Flight --') {
        showMessage('Please select a flight first', 'error');
        return;
    }
    
    const flightCode = flightSelect.value;
    const flightText = flightSelect.options[flightSelect.selectedIndex].text;
    
    const aircraftElement = document.querySelector(`.aircraft-item[data-aircraft-id="${aircraftId}"]`);
    if (!aircraftElement) {
        showMessage('Aircraft not found', 'error');
        return;
    }
    
    if (!aircraftElement.classList.contains('available')) {
        showMessage('Aircraft is not available for assignment', 'error');
        return;
    }
    
    aircraftElement.classList.remove('available');
    aircraftElement.classList.add('assigned');
    
    const statusElement = aircraftElement.querySelector('.aircraft-status');
    if (statusElement) {
        statusElement.innerHTML = `<span class="status-assigned">🛫 Assigned to ${flightCode}</span>`;
    }
    
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
    
    updateMaintenanceStats();
    
    showMessage(`Aircraft ${aircraftId} assigned to ${flightText}`, 'success');
    
    sendAssignmentToServer(aircraftId, flightCode);
}

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


function openSwapModal(aircraftId) {
    console.log('Opening swap modal for:', aircraftId);
    
    currentAircraftId = aircraftId;
    
    const aircraftElement = document.querySelector(`.aircraft-item[data-aircraft-id="${aircraftId}"]`);
    if (!aircraftElement) return;
    
    const aircraftType = aircraftElement.querySelector('.aircraft-type').textContent;
    const flightSelect = document.getElementById('aircraft-flight-select');
    const flightText = flightSelect ? flightSelect.options[flightSelect.selectedIndex].text : 'No flight selected';
    
    document.getElementById('current-aircraft-id').textContent = aircraftId;
    document.getElementById('current-aircraft-details').textContent = aircraftType;
    document.getElementById('current-flight-info').textContent = flightText;
    
    populateReplacementAircraft(aircraftId);
    
    const swapCard = document.getElementById('swap-card');
    if (swapCard) {
        swapCard.style.display = 'block';
        swapCard.scrollIntoView({ behavior: 'smooth' });
    }
    
    showMessage(`Swap mode activated for ${aircraftId}`, 'info');
}

function populateReplacementAircraft(currentAircraftId) {
    const selectElement = document.getElementById('replacement-aircraft-select');
    if (!selectElement) return;
    
    selectElement.innerHTML = '<option value="">-- Select Replacement --</option>';
    
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
    
    const currentAircraft = document.querySelector(`.aircraft-item[data-aircraft-id="${currentAircraftId}"]`);
    const replacementAircraft = document.querySelector(`.aircraft-item[data-aircraft-id="${replacementId}"]`);
    
    if (!currentAircraft || !replacementAircraft) {
        showMessage('Aircraft not found', 'error');
        return;
    }
    
    swapAircraftStatus(currentAircraftId, replacementId);
    
    updateMaintenanceStats();
    cancelSwap();
    
    showMessage(`Aircraft swapped: ${currentAircraftId} ↔ ${replacementId}`, 'success');
}

function swapAircraftStatus(currentId, replacementId) {
    const currentAircraft = document.querySelector(`.aircraft-item[data-aircraft-id="${currentId}"]`);
    const replacementAircraft = document.querySelector(`.aircraft-item[data-aircraft-id="${replacementId}"]`);
    
    if (!currentAircraft || !replacementAircraft) return;
    
    currentAircraft.classList.remove('assigned');
    currentAircraft.classList.add('available');
    
    const currentStatus = currentAircraft.querySelector('.aircraft-status');
    if (currentStatus) {
        currentStatus.innerHTML = '<span class="status-available">✅ Available</span>';
    }
    
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
    
    replacementAircraft.classList.remove('available');
    replacementAircraft.classList.add('assigned');
    
    const replacementStatus = replacementAircraft.querySelector('.aircraft-status');
    if (replacementStatus) {
        replacementStatus.innerHTML = '<span class="status-assigned">🛫 Assigned</span>';
    }
    
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
    

    const updateStat = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    
    updateStat('maintenance-count', inMaintenance);
    updateStat('available-count', available);
    updateStat('service-count', inService);
}


function refreshMaintenanceList() {
    console.log('Refreshing maintenance list...');
    

    setTimeout(() => {
        updateMaintenanceStats();
        showMessage('Maintenance list refreshed', 'success');
    }, 500);
}

function initCrewAssignment() {
    console.log('Initializing crew assignment...');
    

    populateCrewDropdown();
    

    populateTaskAircraftDropdown();
    
    console.log('Crew assignment system ready');
}


function populateCrewDropdown() {
    const crewSelect = document.getElementById('crew-member-select');
    if (!crewSelect) {
        console.error('Crew select element not found');
        return;
    }

    crewSelect.innerHTML = '<option value="">-- Select Crew Member --</option>';
    

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

    if (crewSelect.value && options[crewSelect.selectedIndex].style.display === 'none') {
        crewSelect.value = '';
    }
}


function assignCrewToTask() {
    console.log('Assigning crew to task...');
    
    const crewSelect = document.getElementById('crew-member-select');
    const aircraftSelect = document.getElementById('task-aircraft-select');
    const taskDescription = document.getElementById('task-description');
    
    const crewId = crewSelect ? crewSelect.value : null;
    const aircraftId = aircraftSelect ? aircraftSelect.value : null;
    const description = taskDescription ? taskDescription.value.trim() : '';
    
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
    
   
    const crewText = crewSelect.options[crewSelect.selectedIndex].text;
    const aircraftText = aircraftSelect.options[aircraftSelect.selectedIndex].text;
    

    showMessage(`Crew assigned: ${crewText} to ${description} on ${aircraftText}`, 'success');
    
   
    addToTaskLog(crewText, aircraftText, description);
    

    if (crewSelect) crewSelect.value = '';
    if (aircraftSelect) aircraftSelect.value = '';
    if (taskDescription) taskDescription.value = '';
}

function addToTaskLog(crew, aircraft, task) {
    console.log('Task logged:', { crew, aircraft, task, timestamp: new Date().toISOString() });
}


function showMessage(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <strong>${type.toUpperCase()}:</strong> ${message}
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    const container = document.querySelector('.main-content') || document.body;
    container.insertBefore(notification, container.firstChild);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
}


window.initAircraftSystem = initAircraftSystem;
window.assignAircraft = assignAircraft;
window.openSwapModal = openSwapModal;
window.confirmSwap = confirmSwap;
window.cancelSwap = cancelSwap;
window.refreshMaintenanceList = refreshMaintenanceList;
window.filterCrewByType = filterCrewByType;
window.assignCrewToTask = assignCrewToTask;