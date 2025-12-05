// Gates Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeGatesPage();
});

let currentSelectedFlight = null;
let currentSelectedGate = null;
let gateCompatibilityCache = {};

function initializeGatesPage() {
    loadGateSchedule();
    setupEventListeners();
    refreshGateStatus();
    
    // Auto-refresh every 30 seconds
    setInterval(refreshGateStatus, 30000);
}

function setupEventListeners() {
    // Flight selection
    document.getElementById('flightSelect').addEventListener('change', function(e) {
        currentSelectedFlight = e.target.value;
        updateAssignmentButton();
    });
    
    // Gate selection
    document.getElementById('gateSelect').addEventListener('change', function(e) {
        currentSelectedGate = e.target.value;
        updateAssignmentButton();
    });
    
    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.style.display = 'none';
        }
    });
}

function updateAssignmentButton() {
    const assignBtn = document.getElementById('assignButton');
    if (currentSelectedFlight && currentSelectedGate) {
        assignBtn.disabled = false;
    } else {
        assignBtn.disabled = true;
    }
}

async function checkCompatibility() {
    if (!currentSelectedFlight || !currentSelectedGate) {
        showAlert('Please select both a flight and a gate', 'warning');
        return;
    }
    
    const compatibilityDiv = document.getElementById('compatibilityCheck');
    compatibilityDiv.innerHTML = '<div class="loading">Checking compatibility...</div>';
    compatibilityDiv.style.display = 'block';
    
    try {
        const response = await fetch('/api/gates/assign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                gate_id: currentSelectedGate,
                flight_code: currentSelectedFlight,
                check_compatibility: true,
                override_warnings: false
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            compatibilityDiv.innerHTML = `
                <div class="compatibility-check">
                    <span class="compatible">✅ Compatible</span>
                    <p>Gate ${currentSelectedGate} is suitable for flight ${currentSelectedFlight}</p>
                </div>
            `;
            
            // Enable assign button
            document.getElementById('assignButton').disabled = false;
            gateCompatibilityCache[`${currentSelectedFlight}-${currentSelectedGate}`] = true;
            
        } else if (data.requires_override) {
            compatibilityDiv.innerHTML = `
                <div class="conflict-warning">
                    <p><strong>⚠️ Warning:</strong> ${data.message}</p>
                    ${data.conflicts ? `
                        <p>Scheduling Conflicts:</p>
                        <ul>
                            ${data.conflicts.map(c => `<li>Flight ${c.flight} at ${c.departure} (${c.status})</li>`).join('')}
                        </ul>
                    ` : ''}
                    <div class="action-buttons">
                        <button class="btn btn-warning" onclick="assignGateWithOverride()">
                            Override & Assign
                        </button>
                        <button class="btn btn-secondary" onclick="document.getElementById('compatibilityCheck').style.display='none'">
                            Cancel
                        </button>
                    </div>
                </div>
            `;
        } else {
            compatibilityDiv.innerHTML = `
                <div class="compatibility-check">
                    <span class="incompatible">❌ Incompatible</span>
                    <p>${data.message}</p>
                </div>
            `;
        }
    } catch (error) {
        compatibilityDiv.innerHTML = `
            <div class="compatibility-check">
                <span class="incompatible">❌ Error</span>
                <p>Failed to check compatibility: ${error.message}</p>
            </div>
        `;
    }
}

async function assignGate() {
    if (!currentSelectedFlight || !currentSelectedGate) {
        showAlert('Please select both a flight and a gate', 'warning');
        return;
    }
    
    const confirmed = confirm(`Assign Gate ${currentSelectedGate} to Flight ${currentSelectedFlight}?`);
    if (!confirmed) return;
    
    try {
        const response = await fetch('/api/gates/assign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                gate_id: currentSelectedGate,
                flight_code: currentSelectedFlight,
                check_compatibility: false,
                override_warnings: false
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            refreshGateStatus();
            clearSelection();
            
            // Update gate visualization
            updateGateVisualization(currentSelectedGate, 'occupied');
            
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        showAlert('Error assigning gate: ' + error.message, 'error');
    }
}

async function assignGateWithOverride() {
    if (!currentSelectedFlight || !currentSelectedGate) {
        return;
    }
    
    try {
        const response = await fetch('/api/gates/assign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                gate_id: currentSelectedGate,
                flight_code: currentSelectedFlight,
                check_compatibility: false,
                override_warnings: true
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            refreshGateStatus();
            clearSelection();
            document.getElementById('compatibilityCheck').style.display = 'none';
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        showAlert('Error assigning gate: ' + error.message, 'error');
    }
}

async function showGateDetails(gateId) {
    try {
        const response = await fetch(`/api/gates/${gateId}`);
        const data = await response.json();
        
        if (data.success) {
            const modal = document.getElementById('gateDetailsModal');
            const content = document.getElementById('gateDetailsContent');
            
            content.innerHTML = `
                <div class="modal-header">
                    <h2>Gate ${gateId} Details</h2>
                    <button class="btn-close" onclick="closeModal('gateDetailsModal')">×</button>
                </div>
                
                <div class="gate-info-grid">
                    <div>
                        <strong>Status:</strong>
                        <span class="status-${data.gate.status}">${data.gate.status}</span>
                    </div>
                    <div>
                        <strong>Terminal:</strong> ${data.gate.terminal || 'N/A'}
                    </div>
                    <div>
                        <strong>Capacity:</strong> ${data.gate.capacity || 'N/A'}
                    </div>
                    <div>
                        <strong>Facilities:</strong>
                        <ul>
                            ${(data.gate.facilities || []).map(f => `<li>${f}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                <div class="gate-flight-assignment">
                    <h3>Assigned Flights</h3>
                    ${data.assigned_flights.length > 0 ? `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Flight</th>
                                    <th>Departure</th>
                                    <th>Status</th>
                                    <th>Aircraft</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.assigned_flights.map(flight => `
                                    <tr>
                                        <td>${flight.flight_code}</td>
                                        <td>${flight.scheduled_departure}</td>
                                        <td>
                                            <span class="status-badge status-${flight.flight_status}">
                                                ${flight.flight_status}
                                            </span>
                                        </td>
                                        <td>${flight.aircraft_id || 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p>No flights currently assigned to this gate.</p>'}
                </div>
                
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="updateGateStatus('${gateId}', 'available')">
                        Mark as Available
                    </button>
                    <button class="btn btn-warning" onclick="updateGateStatus('${gateId}', 'maintenance')">
                        Mark for Maintenance
                    </button>
                    <button class="btn btn-danger" onclick="updateGateStatus('${gateId}', 'closed')">
                        Close Gate
                    </button>
                </div>
            `;
            
            modal.style.display = 'flex';
        }
    } catch (error) {
        showAlert('Error loading gate details: ' + error.message, 'error');
    }
}

async function updateGateStatus(gateId, status) {
    const confirmed = confirm(`Change Gate ${gateId} status to ${status}?`);
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/gates/${gateId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: status,
                notes: `Status changed to ${status} by operator`
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            closeModal('gateDetailsModal');
            refreshGateStatus();
        } else {
            if (data.active_flights) {
                const flightList = data.active_flights.map(f => 
                    `Flight ${f.flight} at ${f.departure}`
                ).join('\n');
                alert(`Cannot change status. Active flights:\n${flightList}`);
            } else {
                showAlert(data.message, 'error');
            }
        }
    } catch (error) {
        showAlert('Error updating gate status: ' + error.message, 'error');
    }
}

async function refreshGateStatus() {
    try {
        const response = await fetch('/api/gates');
        const data = await response.json();
        
        if (data.success) {
            updateGateVisualizations(data.gates);
        }
    } catch (error) {
        console.error('Error refreshing gate status:', error);
    }
}

function updateGateVisualizations(gates) {
    const gatesList = document.getElementById('gatesList');
    
    // Update gate cards
    gates.forEach(gate => {
        const gateElement = document.querySelector(`.gate-visual[onclick*="${gate.gate_id}"]`);
        if (gateElement) {
            gateElement.className = `gate-visual ${gate.status}`;
            
            const statusElement = gateElement.querySelector('.gate-status');
            if (statusElement) {
                statusElement.className = `gate-status status-${gate.status}`;
                statusElement.textContent = gate.status;
            }
            
            if (gate.current_flight) {
                let flightElement = gateElement.querySelector('.current-flight');
                if (!flightElement) {
                    flightElement = document.createElement('div');
                    flightElement.className = 'current-flight';
                    gateElement.appendChild(flightElement);
                }
                flightElement.textContent = gate.current_flight;
            }
        }
    });
}

function updateGateVisualization(gateId, status) {
    const gateElement = document.querySelector(`.gate-visual[onclick*="${gateId}"]`);
    if (gateElement) {
        gateElement.className = `gate-visual ${status}`;
        const statusElement = gateElement.querySelector('.gate-status');
        if (statusElement) {
            statusElement.className = `gate-status status-${status}`;
            statusElement.textContent = status;
        }
    }
}

async function loadGateSchedule() {
    const timeline = document.getElementById('scheduleTimeline');
    timeline.innerHTML = '<div class="loading">Loading schedule...</div>';
    
    try {
        // In a real app, you would fetch schedule data from API
        // For now, we'll simulate with static data
        
        const timeSlots = [
            '06:00', '07:00', '08:00', '09:00', '10:00',
            '11:00', '12:00', '13:00', '14:00', '15:00',
            '16:00', '17:00', '18:00', '19:00', '20:00'
        ];
        
        const scheduleHtml = timeSlots.map(time => `
            <div class="time-block" data-time="${time}">
                <strong>${time}</strong>
                <div class="time-slots" id="slot-${time.replace(':', '')}"></div>
            </div>
        `).join('');
        
        timeline.innerHTML = scheduleHtml;
        
        // Simulate occupied slots
        setTimeout(() => {
            const occupiedSlots = [
                { time: '08:00', gate: 'A12', flight: 'HX101' },
                { time: '09:00', gate: 'A15', flight: 'HKAP001' },
                { time: '11:00', gate: 'B05', flight: 'HX202' },
                { time: '14:00', gate: 'C02', flight: 'HKAP003' }
            ];
            
            occupiedSlots.forEach(slot => {
                const slotElement = document.querySelector(`.time-block[data-time="${slot.time}"]`);
                if (slotElement) {
                    slotElement.classList.add('occupied');
                    slotElement.innerHTML += `
                        <div class="flight-info">
                            <small>${slot.gate}: ${slot.flight}</small>
                        </div>
                    `;
                }
            });
        }, 500);
        
    } catch (error) {
        timeline.innerHTML = '<div class="error">Failed to load schedule</div>';
    }
}

function filterGates() {
    const searchTerm = document.getElementById('gateSearch').value.toLowerCase();
    const statusFilter = document.getElementById('gateFilter').value;
    
    const gateElements = document.querySelectorAll('.gate-visual');
    
    gateElements.forEach(element => {
        const gateId = element.querySelector('.gate-id').textContent.toLowerCase();
        const gateStatus = element.className.includes('available') ? 'available' :
                          element.className.includes('occupied') ? 'occupied' :
                          element.className.includes('maintenance') ? 'maintenance' : '';
        
        const matchesSearch = gateId.includes(searchTerm);
        const matchesStatus = !statusFilter || gateStatus === statusFilter;
        
        if (matchesSearch && matchesStatus) {
            element.style.display = 'block';
        } else {
            element.style.display = 'none';
        }
    });
}

function quickAssign(flightCode) {
    document.getElementById('flightSelect').value = flightCode;
    currentSelectedFlight = flightCode;
    updateAssignmentButton();
    
    // Scroll to assignment form
    document.querySelector('.assignment-form').scrollIntoView({ 
        behavior: 'smooth' 
    });
    
    showAlert(`Selected flight ${flightCode}. Now choose a gate.`, 'info');
}

async function showAutoAssignModal() {
    try {
        const response = await fetch('/api/passenger-services/bookings');
        const data = await response.json();
        
        if (data.success) {
            const modal = document.getElementById('autoAssignModal');
            const content = document.getElementById('autoAssignContent');
            
            // Filter flights needing gates
            const flightsNeedingGates = data.bookings.filter(booking => 
                !booking.seat_number || booking.seat_number === 'N/A'
            ).slice(0, 10); // Limit to 10 flights
            
            content.innerHTML = `
                <div class="modal-header">
                    <h2>Auto-Assign Multiple Flights</h2>
                    <button class="btn-close" onclick="closeModal('autoAssignModal')">×</button>
                </div>
                
                <p>Select flights to auto-assign gates:</p>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="selectAllFlights" onclick="toggleAllFlights()"></th>
                            <th>Flight</th>
                            <th>Passenger</th>
                            <th>Departure</th>
                            <th>Current Status</th>
                        </tr>
                    </thead>
                    <tbody id="autoAssignFlightsList">
                        ${flightsNeedingGates.map((flight, index) => `
                            <tr>
                                <td>
                                    <input type="checkbox" 
                                           id="flight_${index}" 
                                           value="${flight.flight_code}"
                                           ${flight.booking_status === 'checked_in' ? 'checked' : ''}>
                                </td>
                                <td>${flight.flight_code}</td>
                                <td>${flight.passenger_name}</td>
                                <td>${flight.departure_time || 'N/A'}</td>
                                <td>
                                    <span class="status-badge status-${flight.booking_status}">
                                        ${flight.booking_status}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="executeAutoAssign()">
                        🚀 Auto-Assign Selected Flights
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal('autoAssignModal')">
                        Cancel
                    </button>
                </div>
                
                <div id="autoAssignResults" style="margin-top: 20px;"></div>
            `;
            
            modal.style.display = 'flex';
        }
    } catch (error) {
        showAlert('Error loading flights: ' + error.message, 'error');
    }
}

function toggleAllFlights() {
    const selectAll = document.getElementById('selectAllFlights');
    const checkboxes = document.querySelectorAll('#autoAssignFlightsList input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
}

async function executeAutoAssign() {
    const checkboxes = document.querySelectorAll('#autoAssignFlightsList input[type="checkbox"]:checked');
    const selectedFlights = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedFlights.length === 0) {
        showAlert('Please select at least one flight', 'warning');
        return;
    }
    
    const resultsDiv = document.getElementById('autoAssignResults');
    resultsDiv.innerHTML = '<div class="loading">Auto-assigning gates...</div>';
    
    try {
        const response = await fetch('/api/gates/auto-assign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                flight_codes: selectedFlights
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            resultsDiv.innerHTML = `
                <div class="success-message">
                    <h4>✅ Auto-Assignment Complete</h4>
                    <p>Successfully assigned ${data.assignments.length} flight(s)</p>
                    
                    ${data.assignments.length > 0 ? `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Flight</th>
                                    <th>Gate</th>
                                    <th>Departure</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.assignments.map(assignment => `
                                    <tr>
                                        <td>${assignment.flight}</td>
                                        <td>${assignment.gate}</td>
                                        <td>${assignment.departure}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : ''}
                    
                    ${data.errors.length > 0 ? `
                        <h5>⚠️ Failed Assignments (${data.errors.length})</h5>
                        <ul>
                            ${data.errors.map(error => `
                                <li>${error.flight}: ${error.reason}</li>
                            `).join('')}
                        </ul>
                    ` : ''}
                </div>
            `;
            
            // Refresh the page after 3 seconds
            setTimeout(() => {
                closeModal('autoAssignModal');
                location.reload();
            }, 3000);
            
        } else {
            resultsDiv.innerHTML = `
                <div class="error-message">
                    <h4>❌ Auto-Assignment Failed</h4>
                    <p>${data.message}</p>
                </div>
            `;
        }
    } catch (error) {
        resultsDiv.innerHTML = `
            <div class="error-message">
                <h4>❌ Error</h4>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function clearSelection() {
    document.getElementById('flightSelect').value = '';
    document.getElementById('gateSelect').value = '';
    document.getElementById('compatibilityCheck').style.display = 'none';
    currentSelectedFlight = null;
    currentSelectedGate = null;
    updateAssignmentButton();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add to page
    document.body.appendChild(alert);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + F to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('gateSearch').focus();
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.style.display = 'none';
        });
    }
});