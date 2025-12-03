const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const app = express();

// ============================================
// MONGODB CONFIGURATION
// ============================================
const mongourl = 'mongodb+srv://Airport:airport123@cluster0.rnw3evi.mongodb.net/Airport?retryWrites=true&w=majority';
const client = new MongoClient(mongourl);
const dbName = 'Airport';

const collections = {
  passengers: 'passengers',
  bookings: 'bookings',
  boardingPasses: 'boarding_passes',
  flights: 'flights',
  gates: 'gates',
  aircraft: 'aircraft',
  crewMembers: 'crew_members',
  maintenanceRecords: 'maintenance_records',
  boardingLogs: 'boarding_logs',
  baggage: 'baggage',
  groundServices: 'ground_services',
  users: 'users',
  specialAssistance: 'special_assistance'
};

let db;

// ============================================
// CONNECT TO DATABASE
// ============================================
async function connectDB() {
  try {
    await client.connect();
    db = client.db(dbName);
    console.log('✅ Connected to MongoDB Atlas');
    console.log(`📦 Database: ${dbName}`);
    

    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

function getCollection(collectionName) {
  return db.collection(collectionName);
}
connectDB();

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'airport-management-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24
  }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
function requireAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

function requirePassengerAuth(req, res, next) {
  if (req.session.user && req.session.user.role === 'passenger') {
    next();
  } else {
    res.redirect('/login');
  }
}

function requireAdminAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  if (req.session.user.role === 'admin' || 
      req.session.user.role === 'staff' || 
      req.session.user.role === 'ground_staff') {
    next();
  } else {
    res.status(403).send('Access Denied: Admin privileges required');
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function generateId(prefix = 'ID-') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${timestamp}-${random}`;
}

function calculateBoardingTime(departureTime) {
  if (!departureTime) return '';
  const [hours, minutes] = departureTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes - 30;
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
}

// ============================================
// MAIN ROUTES
// ============================================

// Root route
app.get('/', (req, res) => {
  if (req.session.user) {
    if (req.session.user.role === 'passenger') {
      res.redirect('/passenger');
    } else {
      res.redirect('/dashboard');
    }
  } else {
    res.redirect('/login');
  }
});

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Login GET
app.get('/login', (req, res) => {
  if (req.session.user) {
    if (req.session.user.role === 'passenger') {
      return res.redirect('/passenger');
    }
    return res.redirect('/dashboard');
  }
  
  res.render('login', {
    title: 'Login - Airport Management System',
    error: null,
    success: null
  });
});

// Login POST
app.post('/login', async (req, res) => {
  try {
    const { username, password, remember } = req.body;
    
    const usersCollection = getCollection(collections.users);
    const user = await usersCollection.findOne({
      $or: [{ username }, { email: username }],
      status: 'active'
    });

    if (!user) {
      return res.render('login', {
        title: 'Login - Airport Management System',
        error: 'Invalid username or password',
        success: null
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.render('login', {
        title: 'Login - Airport Management System',
        error: 'Invalid username or password',
        success: null
      });
    }

    // Set session
    req.session.user = {
      id: user.user_id,
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      avatar: user.avatar,
      department: user.department,
      passport_number: user.passport_number
    };

    if (remember) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30;
    } else {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24;
    }

    console.log(`✅ User logged in: ${user.username} (${user.role})`);
    
    if (user.role === 'passenger') {
      res.redirect('/passenger');
    } else {
      res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', {
      title: 'Login - Airport Management System',
      error: 'An error occurred during login',
      success: null
    });
  }
});

// Register GET
app.get('/register', (req, res) => {
  res.render('register', {
    title: 'Register - Airport Management System',
    error: null,
    success: null
  });
});

// Register POST
app.post('/register', async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      confirm_password, 
      full_name,
      passport_number,
      phone_number,
      date_of_birth,
      nationality 
    } = req.body;

    // Validation
    if (!username || !email || !password || !full_name || !passport_number) {
      return res.render('register', {
        title: 'Register - Airport Management System',
        error: 'Please fill all required fields',
        success: null
      });
    }

    if (password !== confirm_password) {
      return res.render('register', {
        title: 'Register - Airport Management System',
        error: 'Passwords do not match',
        success: null
      });
    }

    if (password.length < 8) {
      return res.render('register', {
        title: 'Register - Airport Management System',
        error: 'Password must be at least 8 characters long',
        success: null
      });
    }

    const usersCollection = getCollection(collections.users);

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.render('register', {
        title: 'Register - Airport Management System',
        error: 'Username or email already exists',
        success: null
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create new passenger user
    const userId = generateId('USR-PASS-');
    await usersCollection.insertOne({
      user_id: userId,
      username: username,
      email: email,
      password_hash: password_hash,
      full_name: full_name,
      passport_number: passport_number,
      phone_number: phone_number || '',
      date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
      nationality: nationality || 'HKG',
      avatar: '👤',
      role: 'passenger',
      frequent_flyer_number: `FF${Date.now()}`,
      preferences: {
        seat_preference: 'any',
        meal_preference: 'regular',
        special_assistance: []
      },
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    });

    res.render('login', {
      title: 'Login - Airport Management System',
      error: null,
      success: 'Registration successful! Please login with your credentials.'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.render('register', {
      title: 'Register - Airport Management System',
      error: 'An error occurred during registration',
      success: null
    });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// ============================================
// ADMIN DASHBOARD
// ============================================
app.get('/dashboard', requireAuth, async (req, res) => {
  if (req.session.user.role === 'passenger') {
    return res.redirect('/passenger');
  }

  try {
    const flightsCollection = getCollection(collections.flights);
    const gatesCollection = getCollection(collections.gates);
    const aircraftCollection = getCollection(collections.aircraft);

    const flights = await flightsCollection.find({}).toArray();
    const gates = await gatesCollection.find({}).toArray();
    const aircraft = await aircraftCollection.find({}).toArray();

    const maintenanceStats = {
      inMaintenance: await aircraftCollection.countDocuments({ operational_status: 'maintenance' }),
      available: await aircraftCollection.countDocuments({ operational_status: 'available' }),
      inService: await aircraftCollection.countDocuments({ operational_status: 'assigned' })
    };

    const aircraftList = aircraft.map(ac => ({
      id: ac.aircraft_id,
      type: ac.aircraft_type,
      status: ac.operational_status,
      statusIcon: ac.operational_status === 'available' ? '✅' : 
                  ac.operational_status === 'maintenance' ? '🔧' : '🛫',
      statusText: ac.operational_status === 'available' ? 'Ready' : 
                  ac.operational_status === 'maintenance' ? 'Maintenance' : 'In Use'
    }));

    res.render('index', {
      title: 'Airport Management System',
      activeSection: 'passenger',
      currentSection: 'Passenger Services',
      user: req.session.user,
      airlineName: 'HKAP Airlines',
      passengerData: null,
      flights: flights.map(f => ({
        code: f.flight_code,
        route: f.route_display,
        gate: f.gate,
        departure: f.scheduled_departure,
        boarding: calculateBoardingTime(f.scheduled_departure),
        status: f.flight_status
      })),
      gates: gates.map(g => g.gate_id),
      aircraftList,
      maintenanceStats
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Server error');
  }
});

// ============================================
// PASSENGER PORTAL
// ============================================
app.get('/passenger', requirePassengerAuth, async (req, res) => {
  try {
    const bookingsCollection = getCollection(collections.bookings);
    const flightsCollection = getCollection(collections.flights);
    const boardingPassCollection = getCollection(collections.boardingPasses);
    const baggageCollection = getCollection(collections.baggage);

    // Get passenger's bookings
    const bookings = await bookingsCollection.find({ 
      passenger_id: req.session.user.id 
    }).sort({ booking_date: -1 }).toArray();

    // Get flight details for each booking
    const bookingsWithDetails = await Promise.all(bookings.map(async (booking) => {
      const flight = await flightsCollection.findOne({ flight_code: booking.flight_code });
      const boardingPass = await boardingPassCollection.findOne({ 
        booking_reference: booking.booking_reference 
      });
      const baggage = await baggageCollection.findOne({
        booking_reference: booking.booking_reference
      });

      
    return {
      ...booking,
      flight_details: flight,
      boarding_pass: boardingPass,
      baggage_details: {
        current_location: baggage?.current_location || 'N/A',
        ...baggage
      }
    };

    }));

    res.render('passenger', {
      title: 'Passenger Portal - HKAP Airlines',
      user: req.session.user,
      bookings: bookingsWithDetails,
      activeSection: 'dashboard',
      baggageItems: [] 
    });
  } catch (error) {
    console.error('Error loading passenger portal:', error);
    res.status(500).send('Server error');
  }
});

// ============================================
// CHECK-IN ROUTES
// ============================================
app.get('/checkin', requireAuth, (req, res) => {
  if (req.session.user.role === 'passenger') {
    res.render('checkin', { 
      title: 'Online Check-in',
      user: req.session.user,
      activeTab: 'checkin-page'  
    });
  } else {
    res.redirect('/dashboard');
  }
});

// ============================================
// API ROUTES FOR PASSENGER CHECK-IN
// ============================================

// Verify Passenger
app.post('/api/verify-passenger', async (req, res) => {
  try {
    const { name, flight, bookingRef, passport } = req.body;
    
    if (!name || !flight || !bookingRef || !passport) {
      return res.json({
        success: false,
        message: 'Please fill all required fields'
      });
    }

    const bookingsCollection = getCollection(collections.bookings);
    const usersCollection = getCollection(collections.users);
    const flightsCollection = getCollection(collections.flights);

    const booking = await bookingsCollection.findOne({ 
      booking_reference: bookingRef.toUpperCase() 
    });
    
    if (!booking) {
      return res.json({
        success: false,
        message: 'Booking not found'
      });
    }

    const passenger = await usersCollection.findOne({
      user_id: booking.passenger_id,
      role: 'passenger'
    });

    if (!passenger) {
      return res.json({
        success: false,
        message: 'Passenger not found'
      });
    }

    if (passenger.full_name.toLowerCase() !== name.toLowerCase()) {
      return res.json({
        success: false,
        message: 'Name does not match booking'
      });
    }

    if (passenger.passport_number !== passport) {
      return res.json({
        success: false,
        message: 'Passport number does not match'
      });
    }

    if (booking.flight_code !== flight) {
      return res.json({
        success: false,
        message: 'Flight number does not match'
      });
    }

    if (booking.booking_status === 'checked_in' || booking.booking_status === 'boarded') {
      return res.json({
        success: false,
        message: 'Already checked in for this flight'
      });
    }

    const flightData = await flightsCollection.findOne({ flight_code: flight });

    if (!flightData) {
      return res.json({
        success: false,
        message: 'Flight data not found'
      });
    }

    res.json({
      success: true,
      passenger: {
        name,
        flight,
        bookingRef,
        passport,
        flightDetails: {
          departure: flightData.scheduled_departure,
          boarding: calculateBoardingTime(flightData.scheduled_departure),
          gate: flightData.gate || 'TBA',
          destination: flightData.destination_airport,
          origin: flightData.origin_airport,
          flight_date: flightData.flight_date
        }
      }
    });
  } catch (error) {
    console.error('Error verifying passenger:', error);
    res.json({
      success: false,
      message: 'Error verifying passenger'
    });
  }
});

// Complete Check-in (FIXED VERSION with better name matching)
app.post('/api/complete-checkin', async (req, res) => {
  try {
    const { passenger, seat, baggage } = req.body;

    console.log('Complete check-in request received:', { passenger, seat, baggage });

    if (!passenger || !passenger.bookingRef || !seat || !seat.seat) {
      return res.json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const bookingsCollection = getCollection(collections.bookings);
    const flightsCollection = getCollection(collections.flights);
    const boardingPassCollection = getCollection(collections.boardingPasses);

    // Normalize booking reference and find booking
    const bookingRef = passenger.bookingRef.toUpperCase().trim();
    const booking = await bookingsCollection.findOne({
      booking_reference: bookingRef
    });

    if (!booking) {
      return res.json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify passenger name (case-insensitive)
    const bookingPassengerName = (booking.passenger_name || '').toLowerCase();
    const requestedPassengerName = (passenger.name || '').toLowerCase();

    if (bookingPassengerName !== requestedPassengerName) {
      return res.json({
        success: false,
        message: `Passenger name does not match booking. Booking is under: ${booking.passenger_name}`
      });
    }

    // Load flight data
    const flightData = await flightsCollection.findOne({ flight_code: booking.flight_code });
    if (!flightData) {
      return res.json({
        success: false,
        message: 'Flight data not found'
      });
    }

    // Calculate fees (simple policy - adjust as needed)
    let seatFee = 0;
    if (seat.isPremium) {
      seatFee = 75;
    } else if (seat.cabin && seat.cabin.toLowerCase() === 'business') {
      seatFee = 150;
    }

    const baggageWeight = Number(baggage?.weight) || 0;
    const includedWeight = 20; // kg free allowance
    let baggageFee = 0;
    if (baggageWeight > includedWeight) {
      baggageFee = Math.max(0, (baggageWeight - includedWeight) * 10); // $10 per extra kg
    }

    // Generate baggage tag if baggage present
    const baggageTag = baggage ? `BT${Date.now()}${Math.floor(Math.random() * 1000)}` : null;

    const departureTime = flightData.scheduled_departure || '';
    const boardingTime = calculateBoardingTime(departureTime);

    // Update booking record
    await bookingsCollection.updateOne(
      { booking_reference: bookingRef },
      {
        $set: {
          seat_number: seat.seat,
          cabin_class: seat.cabin || 'economy',
          is_premium_seat: !!seat.isPremium,
          seat_fee: seatFee,
          baggage_type: baggage?.type || 'none',
          baggage_weight: baggageWeight,
          baggage_fee: baggageFee,
          total_amount: (booking.base_fare || 0) + seatFee + baggageFee,
          booking_status: 'checked_in',
          check_in_time: new Date(),
          baggage_tag_number: baggageTag,
          updated_at: new Date()
        }
      }
    );

    // Create boarding pass
    const barcode = `BP${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const boardingPassId = `BP${Date.now()}${Math.floor(Math.random() * 1000)}`;

    await boardingPassCollection.insertOne({
      boarding_pass_id: boardingPassId,
      barcode: barcode,
      booking_reference: bookingRef,
      passenger_id: booking.passenger_id,
      flight_code: booking.flight_code,
      flight_date: flightData.flight_date || new Date(),
      departure_time: departureTime,
      gate: flightData.gate || 'TBA',
      boarding_time: boardingTime,
      passenger_name: passenger.name,
      passport_number: passenger.passport || booking.passport_number || '',
      seat_number: seat.seat,
      cabin_class: seat.cabin || 'economy',
      status: 'issued',
      baggage_tag_number: baggageTag,
      baggage_weight: baggageWeight,
      generated_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });

    // Increment flight checked-in counter
    await flightsCollection.updateOne(
      { flight_code: booking.flight_code },
      { $inc: { total_checked_in: 1 }, $set: { updated_at: new Date() } }
    );

    // Build response boarding pass payload (safe date formatting)
    const flightDate = flightData.flight_date ? new Date(flightData.flight_date) : null;
    const flightDateDisplay = flightDate ? flightDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'Not set';

    res.json({
  success: true,
  boardingPass: {
    passenger: passenger.name,
    passport: passenger.passport,
    flight: booking.flight_code,
    date: flightData.flight_date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    time: departureTime,
    seat: seat.seat,  
    gate: flightData.gate || 'TBA',
    boardingTime: boardingTime,
    baggage: baggage || null,
    barcode: barcode,
    origin: flightData.origin_airport,
    destination: flightData.destination_airport,
    cabinClass: seat.cabin  
  }
});
  } catch (error) {
    console.error('Error completing check-in:', error);
    res.json({
      success: false,
      message: 'Error completing check-in: ' + error.message
    });
  }
});

// Verify Booking (for check-in page) 
app.post('/api/verify-booking', async (req, res) => {
  try {
    const bookingsCollection = getCollection(collections.bookings);
    let { bookingRef, fullName } = req.body;

    if (!bookingRef || !fullName) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing booking reference or full name' 
      });
    }

    bookingRef = bookingRef.trim().toUpperCase();
    fullName = fullName.trim();

    console.log("Searching for booking:", bookingRef, "for passenger:", fullName);

    // Try to find booking by reference
    const booking = await bookingsCollection.findOne({
      booking_reference: bookingRef
    });

    console.log("Booking query result:", booking);

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found. Please check your booking reference.' 
      });
    }

    // Check if the name matches (case-insensitive)
    const bookingPassengerName = booking.passenger_name || '';
    const isNameMatch = bookingPassengerName.toLowerCase() === fullName.toLowerCase();
    
    // Also check last name separately
    const bookingLastName = booking.passenger_last_name || '';
    const isLastNameMatch = bookingLastName.toLowerCase() === fullName.toLowerCase();
    
    // Get all names from full name
    const nameParts = fullName.split(' ');
    const lastNameFromFullName = nameParts[nameParts.length - 1];
    const isLastNamePartialMatch = bookingLastName.toLowerCase() === lastNameFromFullName.toLowerCase();

    // If name doesn't match, return error
    if (!isNameMatch && !isLastNameMatch && !isLastNamePartialMatch) {
      console.log("Name mismatch. Booking name:", bookingPassengerName, "Input name:", fullName);
      return res.status(400).json({ 
        success: false,
        message: `Name does not match booking. Booking is under: ${bookingPassengerName}` 
      });
    }

    const flightsCollection = getCollection(collections.flights);
    const flight = await flightsCollection.findOne({ 
      flight_code: booking.flight_code 
    });

    if (!flight) {
      return res.status(404).json({ 
        success: false,
        message: 'Flight data not found for this booking.' 
      });
    }

    // Format the booking data for frontend
    const formattedBooking = {
      booking_reference: booking.booking_reference,
      passenger_id: booking.passenger_id,
      passenger_name: booking.passenger_name,
      passenger_last_name: booking.passenger_last_name,
      flight_code: booking.flight_code,
      flight_date: booking.flight_date,
      booking_status: booking.booking_status,
      origin: flight.origin_airport,
      destination: flight.destination_airport,
      flight_number: booking.flight_code,
      departure_time: flight.scheduled_departure,
      origin_name: getAirportName(flight.origin_airport),
      destination_name: getAirportName(flight.destination_airport),
      gate: flight.gate || 'TBA',
      flight_date_display: flight.flight_date ? 
        new Date(flight.flight_date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'Not set'
    };

    res.json({ 
      success: true,
      booking: formattedBooking,
      message: 'Booking verified successfully'
    });
  } catch (error) {
    console.error('Error verifying booking:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again later.',
      error: error.message 
    });
  }
});

function getAirportName(code) {
  const airports = {
    'HKG': 'Hong Kong International Airport',
    'TPE': 'Taiwan Taoyuan International Airport',
    'NRT': 'Tokyo Narita Airport',
    'ICN': 'Seoul Incheon Airport',
    'SIN': 'Singapore Changi Airport',
    'BKK': 'Bangkok Suvarnabhumi Airport'
  };
  return airports[code] || code;
}

// ============================================
// BOARDING MANAGEMENT ROUTE
// ============================================
app.get('/section/boarding', requireAdminAuth, async (req, res) => {
  try {
    const flightsCollection = getCollection(collections.flights);
    const gatesCollection = getCollection(collections.gates);
    
    // Get today's flights
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const flights = await flightsCollection.find({
      flight_date: { $gte: today, $lt: tomorrow }
    }).toArray();
    
    // Get all gates
    const gates = await gatesCollection.find({}).toArray();
    
    // Format flights for dropdown
    const formattedFlights = flights.map(flight => ({
      code: flight.flight_code,
      route: flight.route_display,
      gate: flight.gate,
      departure: flight.scheduled_departure,
      boarding: calculateBoardingTime(flight.scheduled_departure),
      status: flight.flight_status
    }));
    
    // Format gates for dropdown
    const formattedGates = gates.map(gate => gate.gate_id);
    
    res.render('section/boarding', { 
      title: 'Boarding Management - HKAP Airlines',
      user: req.session.user,
      flights: formattedFlights,
      gates: formattedGates
    });
  } catch (error) {
    console.error('Error loading boarding page:', error);
    res.status(500).send('Error loading boarding management page');
  }
});

// ============================================
// AIRCRAFT MANAGEMENT ROUTE
// ============================================
app.get('/section/aircraft', requireAdminAuth, async (req, res) => {
  try {
    const aircraftCollection = getCollection(collections.aircraft);
    const flightsCollection = getCollection(collections.flights);
    const crewCollection = getCollection(collections.crewMembers);
    
    // Get all aircraft with proper formatting
    const aircraft = await aircraftCollection.find({}).toArray();
    
    // Get ALL flights (remove date filter)
    const flights = await flightsCollection.find({
      flight_status: { $in: ['scheduled', 'boarding', 'delayed', 'gate_open'] }
    }).sort({ scheduled_departure: 1 }).toArray();
    
    // Get all crew (not just available)
    const crew = await crewCollection.find({}).toArray();
    
    // Format flights for dropdown - FIXED
    const formattedFlights = flights.map(flight => ({
      code: flight.flight_code,
      route: flight.route_display,
      gate: flight.gate || 'TBA',
      departure: flight.scheduled_departure,
      boarding: calculateBoardingTime(flight.scheduled_departure),
      status: flight.flight_status,
      aircraft_id: flight.aircraft_id
    }));
    
    // Format aircraft list for the template - FIXED
    const aircraftList = aircraft.map(ac => {
      let status, statusIcon, statusText;
      
      switch(ac.operational_status) {
        case 'available':
          status = 'available';
          statusIcon = '✅';
          statusText = 'Available';
          break;
        case 'assigned':
          status = 'assigned';
          statusIcon = '🛫';
          statusText = 'Assigned';
          break;
        case 'maintenance':
          status = 'maintenance';
          statusIcon = '🔧';
          statusText = 'Maintenance';
          break;
        default:
          status = 'available';
          statusIcon = '✅';
          statusText = 'Available';
      }
      
      return {
        id: ac.aircraft_id,
        type: ac.aircraft_type || `${ac.manufacturer} ${ac.model}`,
        status: status,
        statusIcon: statusIcon,
        statusText: statusText,
        registration: ac.registration_number,
        seats: ac.total_seats
      };
    });
    
    // Calculate maintenance stats
    const maintenanceStats = {
      inMaintenance: aircraft.filter(a => a.operational_status === 'maintenance').length,
      available: aircraft.filter(a => a.operational_status === 'available').length,
      inService: aircraft.filter(a => a.operational_status === 'assigned').length
    };
    
    // Format crew for the template
    const formattedCrew = crew.map(c => ({
      id: c.crew_id,
      name: c.full_name,
      type: c.crew_type,
      status: c.status,
      qualification: c.qualification
    }));
    
    res.render('section/aircraft', { 
      title: 'Aircraft Management - HKAP Airlines',
      user: req.session.user,
      flights: formattedFlights,
      aircraftList: aircraftList,
      maintenanceStats: maintenanceStats,
      crew: formattedCrew
    });
  } catch (error) {
    console.error('Error loading aircraft page:', error);
    res.status(500).send('Error loading aircraft management page');
  }
});
// ============================================
// API ROUTES FOR GROUND SERVICES
// ============================================

// Get all ground services
app.get('/api/ground-services', requireAdminAuth, async (req, res) => {
  try {
    const groundServicesCollection = getCollection(collections.groundServices);
    const services = await groundServicesCollection.find({}).sort({ scheduled_time: -1 }).toArray();
    
    res.json({
      success: true,
      services: services
    });
  } catch (error) {
    console.error('Error fetching ground services:', error);
    res.json({ success: false, message: 'Error fetching ground services' });
  }
});

// Create new ground service
app.post('/api/ground-services', requireAdminAuth, async (req, res) => {
  try {
    const { service_type, flight_code, scheduled_time, notes, priority, estimated_duration_minutes } = req.body;
    
    if (!service_type || !flight_code) {
      return res.json({ success: false, message: 'Service type and flight code are required' });
    }
    
    const groundServicesCollection = getCollection(collections.groundServices);
    
    const newService = {
      service_id: generateId('GS-'),
      service_type: service_type,
      flight_code: flight_code,
      status: 'pending',
      assigned_crew: null,
      scheduled_time: new Date(scheduled_time),
      completed_time: null,
      notes: notes || '',
      priority: priority || 'medium',
      estimated_duration_minutes: parseInt(estimated_duration_minutes) || 30,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    await groundServicesCollection.insertOne(newService);
    
    res.json({ success: true, message: 'Ground service created successfully', service: newService });
  } catch (error) {
    console.error('Error creating ground service:', error);
    res.json({ success: false, message: 'Error creating ground service' });
  }
});

// Update ground service
app.put('/api/ground-services/:id', requireAdminAuth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const groundServicesCollection = getCollection(collections.groundServices);
    
    const updateData = { updated_at: new Date() };
    
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (status === 'completed') updateData.completed_time = new Date();
    
    const result = await groundServicesCollection.updateOne(
      { service_id: req.params.id },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.json({ success: false, message: 'Service not found' });
    }
    
    res.json({ success: true, message: 'Ground service updated successfully' });
  } catch (error) {
    console.error('Error updating ground service:', error);
    res.json({ success: false, message: 'Error updating ground service' });
  }
});

// ============================================
// API ROUTES FOR CREW MANAGEMENT
// ============================================

// Get all crew members
app.get('/api/crew', requireAdminAuth, async (req, res) => {
  try {
    const crewCollection = getCollection(collections.crewMembers);
    const crew = await crewCollection.find({}).toArray();
    
    res.json({ success: true, crew: crew });
  } catch (error) {
    console.error('Error fetching crew:', error);
    res.json({ success: false, message: 'Error fetching crew' });
  }
});

// Create new crew member
app.post('/api/crew', requireAdminAuth, async (req, res) => {
  try {
    const { full_name, crew_type, qualification, contact_number, status } = req.body;
    
    if (!full_name || !crew_type || !qualification) {
      return res.json({ success: false, message: 'Name, crew type, and qualification are required' });
    }
    
    const crewCollection = getCollection(collections.crewMembers);
    
    const crewPrefix = crew_type === 'cleaning' ? 'CC' : 
                       crew_type === 'fueling' ? 'FC' : 
                       crew_type === 'catering' ? 'CT' : 
                       crew_type === 'maintenance' ? 'MC' :
                       crew_type === 'baggage' ? 'BC' :
                       crew_type === 'pushback' ? 'PC' : 'RA';
    
    const newCrew = {
      crew_id: generateId(`${crewPrefix}-`),
      crew_type: crew_type,
      full_name: full_name,
      employee_id: generateId('EMP-'),
      qualification: qualification,
      contact_number: contact_number || '',
      status: status || 'available',
      shift_start: '08:00',
      shift_end: '16:00',
      tasks_completed_today: 0,
      total_tasks_completed: 0,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    await crewCollection.insertOne(newCrew);
    
    res.json({ success: true, message: 'Crew member created successfully', crew: newCrew });
  } catch (error) {
    console.error('Error creating crew member:', error);
    res.json({ success: false, message: 'Error creating crew member' });
  }
});

// Update crew member
app.put('/api/crew/:id', requireAdminAuth, async (req, res) => {
  try {
    const { full_name, status, qualification, contact_number } = req.body;
    
    const crewCollection = getCollection(collections.crewMembers);
    
    const updateData = { updated_at: new Date() };
    
    if (full_name) updateData.full_name = full_name;
    if (status) updateData.status = status;
    if (qualification) updateData.qualification = qualification;
    if (contact_number !== undefined) updateData.contact_number = contact_number;
    
    const result = await crewCollection.updateOne(
      { crew_id: req.params.id },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.json({ success: false, message: 'Crew member not found' });
    }
    
    res.json({ success: true, message: 'Crew member updated successfully' });
  } catch (error) {
    console.error('Error updating crew member:', error);
    res.json({ success: false, message: 'Error updating crew member' });
  }
});

// ============================================
// CREW MANAGEMENT ROUTE
// ============================================
app.get('/section/crew', requireAdminAuth, async (req, res) => {
  try {
    const crewCollection = getCollection(collections.crewMembers);
    const groundServicesCollection = getCollection(collections.groundServices);
    
    const crew = await crewCollection.find({}).toArray();
    const services = await groundServicesCollection.find({}).toArray();
    
    // Calculate statistics
    const totalCrew = crew.length;
    const availableCount = crew.filter(c => c.status === 'available').length;
    const onTaskCount = crew.filter(c => c.status === 'on_task').length;
    const tasksToday = services.filter(s => {
      const today = new Date();
      const serviceDate = new Date(s.created_at);
      return serviceDate.toDateString() === today.toDateString();
    }).length;
    
    res.render('section/crew', { 
      title: 'Crew Management - HKAP Airlines',
      user: req.session.user,
      crew: crew,
      totalCrewCount: totalCrew,
      availableCount: availableCount,
      onTaskCount: onTaskCount,
      tasksToday: tasksToday
    });
  } catch (error) {
    console.error('Error loading crew page:', error);
    res.status(500).send('Error loading crew management page');
  }
});

// ============================================
// GROUND OPERATIONS DASHBOARD
// ============================================
app.get('/ground', requireAdminAuth, async (req, res) => {
  try {
    const groundServicesCollection = getCollection(collections.groundServices);
    const crewCollection = getCollection(collections.crewMembers);
    
    // Get ground services
    const services = await groundServicesCollection.find({}).sort({ scheduled_time: -1 }).toArray();
    const crew = await crewCollection.find({}).toArray();
    
    // Calculate statistics
    const pendingCount = services.filter(s => s.status === 'pending').length;
    const inProgressCount = services.filter(s => s.status === 'in-progress').length;
    const completedCount = services.filter(s => s.status === 'completed').length;
    const totalCount = services.length;
    
    res.render('section/ground', {
      title: 'Ground Operations Dashboard',
      user: req.session.user,
      services: services,
      pendingCount: pendingCount,
      inProgressCount: inProgressCount,
      completedCount: completedCount,
      totalCount: totalCount,
      crew: crew
    });
  } catch (error) {
    console.error('Error loading ground operations:', error);
    res.status(500).send('Error loading ground operations');
  }
});

// ============================================
// AIRCRAFT MANAGEMENT APIs
// ============================================

// Get all aircraft
app.get('/api/aircraft', requireAdminAuth, async (req, res) => {
  try {
    const aircraftCollection = getCollection(collections.aircraft);
    const aircraft = await aircraftCollection.find({}).toArray();
    
    res.json({ success: true, aircraft: aircraft });
  } catch (error) {
    console.error('Error fetching aircraft:', error);
    res.json({ success: false, message: 'Error fetching aircraft' });
  }
});

// Assign aircraft to flight
app.post('/api/aircraft/assign', requireAdminAuth, async (req, res) => {
  try {
    const { aircraft_id, flight_code } = req.body;
    
    if (!aircraft_id || !flight_code) {
      return res.json({ success: false, message: 'Aircraft ID and flight code are required' });
    }
    
    const aircraftCollection = getCollection(collections.aircraft);
    const flightsCollection = getCollection(collections.flights);
    
    // Update aircraft status
    await aircraftCollection.updateOne(
      { aircraft_id: aircraft_id },
      { $set: { operational_status: 'assigned', updated_at: new Date() } }
    );
    
    // Update flight with aircraft assignment
    await flightsCollection.updateOne(
      { flight_code: flight_code },
      { $set: { aircraft_id: aircraft_id, updated_at: new Date() } }
    );
    
    res.json({ success: true, message: 'Aircraft assigned to flight successfully' });
  } catch (error) {
    console.error('Error assigning aircraft:', error);
    res.json({ success: false, message: 'Error assigning aircraft' });
  }
});

// Update aircraft status
app.put('/api/aircraft/:id/status', requireAdminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.json({ success: false, message: 'Status is required' });
    }
    
    const aircraftCollection = getCollection(collections.aircraft);
    
    await aircraftCollection.updateOne(
      { aircraft_id: req.params.id },
      { $set: { operational_status: status, updated_at: new Date() } }
    );
    
    res.json({ success: true, message: 'Aircraft status updated successfully' });
  } catch (error) {
    console.error('Error updating aircraft status:', error);
    res.json({ success: false, message: 'Error updating aircraft status' });
  }
});

// ============================================
// STATIC FILE ROUTES
// ============================================
app.get('/css/airport-system.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'css', 'airport-system.css'));
});

app.get('/js/airport-system.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'js', 'airport-system.js'));
});

app.get('/js/:filename', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'js', req.params.filename));
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log('✈  AIRPORT MANAGEMENT SYSTEM');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
    });
  });
  app.get('/js/aircraft-fixed.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'js', 'aircraft-fixed.js'));
});

// ============================================
// PASSENGER PORTAL TAB ROUTES
// ============================================

app.get('/passenger/dashboard', requirePassengerAuth, async (req, res) => {
  try {
    const bookingsCollection = getCollection(collections.bookings);
    const flightsCollection = getCollection(collections.flights);
    const boardingPassCollection = getCollection(collections.boardingPasses);
    const baggageCollection = getCollection(collections.baggage);

    const bookings = await bookingsCollection.find({ 
      passenger_id: req.session.user.id 
    }).sort({ booking_date: -1 }).toArray();

    const cleanedBookings = bookings.map(booking => {
      if (!booking.booking_status) {
        booking.booking_status = 'confirmed';
      }
      
      booking.seat_number = booking.seat_number || 'Not assigned';
      booking.cabin_class = booking.cabin_class || 'Economy';
      booking.booking_reference = booking.booking_reference || `REF-${Math.random().toString(36).substr(2, 9)}`;
      booking.flight_date = booking.flight_date || new Date();
      booking.baggage_type = booking.baggage_type || 'none';
      booking.baggage_weight = booking.baggage_weight || 0;
      
      return booking;
    });

    const now = new Date();

    const bookingsWithDetails = await Promise.all(cleanedBookings.map(async (booking) => {
      const flight = await flightsCollection.findOne({ flight_code: booking.flight_code });
      const boardingPass = await boardingPassCollection.findOne({ 
        booking_reference: booking.booking_reference 
      });
      const baggage = await baggageCollection.findOne({
        booking_reference: booking.booking_reference
      });

      const flightDate = booking.flight_date ? new Date(booking.flight_date) : null;
      const bookingDate = booking.booking_date ? new Date(booking.booking_date) : null;

      return {
        ...booking,
        flight_details: flight || {
          flight_code: booking.flight_code || 'N/A',
          route_display: 'Unknown Route',
          scheduled_departure: 'N/A',
          gate: 'TBA'
        },
        boarding_pass: boardingPass || null,
        baggage_details: baggage || null,
        flight_date_formatted: flightDate ? flightDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'Not set',
        booking_date_formatted: bookingDate ? bookingDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }) : 'Not set',
        is_upcoming: flightDate && flightDate > now
      };
    }));

    const upcomingBookings = bookingsWithDetails.filter(b => b.is_upcoming);
    const pastBookings = bookingsWithDetails.filter(b => !b.is_upcoming).slice(0, 5);

    const stats = {
      total_bookings: bookings.length,
      upcoming_flights: upcomingBookings.length,
      checked_in: bookings.filter(b => b.booking_status === 'checked_in' || b.booking_status === 'boarded').length,
      miles_earned: bookings.reduce((total, b) => total + (b.total_amount || 0) * 5, 0)
    };

    res.render('passenger', {
      title: 'Passenger Portal - HKAP Airlines',
      user: req.session.user,
      bookings: bookingsWithDetails,
      upcomingBookings,
      pastBookings,
      stats,
      activeTab: 'dashboard'
    });
  } catch (error) {
    console.error('Error loading passenger dashboard:', error);
    res.status(500).send('Server error');
  }
});

// My Bookings route
app.get('/passenger/bookings', requirePassengerAuth, async (req, res) => {
  try {
    const bookingsCollection = getCollection(collections.bookings);
    const flightsCollection = getCollection(collections.flights);
    const boardingPassCollection = getCollection(collections.boardingPasses);

    // Get all bookings for passenger
    const bookings = await bookingsCollection.find({ 
      passenger_id: req.session.user.id 
    }).sort({ booking_date: -1 }).toArray();

    // Get flight details for each booking
    const bookingsWithDetails = await Promise.all(bookings.map(async (booking) => {
      const flight = await flightsCollection.findOne({ flight_code: booking.flight_code });
      const boardingPass = await boardingPassCollection.findOne({ 
        booking_reference: booking.booking_reference 
      });

      // Format dates
      const flightDate = booking.flight_date ? new Date(booking.flight_date) : null;
      const bookingDate = booking.booking_date ? new Date(booking.booking_date) : null;

      return {
        ...booking,
        flight_details: flight,
        boarding_pass: boardingPass,
        flight_date_formatted: flightDate ? flightDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'Not set',
        booking_date_formatted: bookingDate ? bookingDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }) : 'Not set'
      };
    }));

    res.render('passenger', {
      title: 'My Bookings - HKAP Airlines',
      user: req.session.user,
      bookings: bookingsWithDetails,
      activeTab: 'bookings'
    });
  } catch (error) {
    console.error('Error loading bookings:', error);
    res.status(500).send('Server error');
  }
});

// Boarding Passes route
app.get('/passenger/boarding-passes', requirePassengerAuth, async (req, res) => {
  try {
    const boardingPassCollection = getCollection(collections.boardingPasses);
    const flightsCollection = getCollection(collections.flights);
    const bookingsCollection = getCollection(collections.bookings);

    // Get all boarding passes for passenger
    const boardingPasses = await boardingPassCollection.find({ 
      passenger_id: req.session.user.id 
    }).sort({ flight_date: -1 }).toArray();

    // Get flight and booking details for each boarding pass
    const passesWithDetails = await Promise.all(boardingPasses.map(async (pass) => {
      const flight = await flightsCollection.findOne({ flight_code: pass.flight_code });
      const booking = await bookingsCollection.findOne({ 
        booking_reference: pass.booking_reference 
      });

      // Format dates and times
      const flightDate = pass.flight_date ? new Date(pass.flight_date) : null;
      const boardingTime = pass.boarding_time || calculateBoardingTime(pass.departure_time);

      return {
        ...pass,
        flight_details: flight,
        booking_details: booking,
        flight_date_formatted: flightDate ? flightDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'Not set',
        departure_time_formatted: pass.departure_time || 'TBA',
        boarding_time_formatted: boardingTime,
        generated_at_formatted: pass.generated_at ? 
          new Date(pass.generated_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : 'Not set'
      };
    }));

    res.render('passenger', {
  title: `Boarding Pass - ${bookingRef}`,
  user: req.session.user,
  userDetails: userDetails,
  boardingPasses: [formattedBoardingPass], // Single item array
  activeTab: 'boarding-passes',
  stats: stats
});
  } catch (error) {
    console.error('Error loading boarding passes:', error);
    res.status(500).send('Server error');
  }
});

// Baggage Tracking route
app.get('/passenger/baggage', requirePassengerAuth, async (req, res) => {
  try {
    const baggageCollection = getCollection(collections.baggage);
    const bookingsCollection = getCollection(collections.bookings);
    const flightsCollection = getCollection(collections.flights);

    // Get all baggage items for passenger
    const baggageItems = await baggageCollection.find({ 
      passenger_id: req.session.user.id 
    }).sort({ checked_in_at: -1 }).toArray();

    // Get booking and flight details for each baggage item
    const baggageWithDetails = await Promise.all(baggageItems.map(async (item) => {
      const booking = await bookingsCollection.findOne({ 
        booking_reference: item.booking_reference 
      });
      const flight = await flightsCollection.findOne({ 
        flight_code: booking?.flight_code 
      });

      // Format dates and add status info
      const checkedInAt = item.checked_in_at ? new Date(item.checked_in_at) : null;
      
      let statusText, statusColor;
      switch(item.status) {
        case 'checked_in':
          statusText = 'Checked In';
          statusColor = '#3b82f6';
          break;
        case 'loaded':
          statusText = 'Loaded to Aircraft';
          statusColor = '#10b981';
          break;
        case 'arrived':
          statusText = 'Arrived at Destination';
          statusColor = '#059669';
          break;
        default:
          statusText = item.status || 'Unknown';
          statusColor = '#6b7280';
      }

      return {
        ...item,
        booking_details: booking,
        flight_details: flight,
        checked_in_at_formatted: checkedInAt ? 
          checkedInAt.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : 'Not set',
        flight_date_formatted: booking?.flight_date ? 
          new Date(booking.flight_date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }) : 'Not set',
        status_text: statusText,
        status_color: statusColor
      };
    }));

    res.render('passenger', {
      title: 'Baggage Tracking - HKAP Airlines',
      user: req.session.user,
      baggageItems: baggageWithDetails,
      activeTab: 'baggage'
    });
  } catch (error) {
    console.error('Error loading baggage tracking:', error);
    res.status(500).send('Server error');
  }
});

// Profile Settings route
app.get('/passenger/profile', requirePassengerAuth, async (req, res) => {
  try {
    const usersCollection = getCollection(collections.users);
    
    // Get user details with preferences
    const userDetails = await usersCollection.findOne({ 
      user_id: req.session.user.id 
    });

    // Get user's bookings for stats
    const bookingsCollection = getCollection(collections.bookings);
    const bookings = await bookingsCollection.find({ 
      passenger_id: req.session.user.id 
    }).toArray();

    const stats = {
      total_bookings: bookings.length,
      flights_taken: bookings.filter(b => {
        const flightDate = b.flight_date ? new Date(b.flight_date) : null;
        return flightDate && flightDate < new Date();
      }).length,
      upcoming_flights: bookings.filter(b => {
        const flightDate = b.flight_date ? new Date(b.flight_date) : null;
        return flightDate && flightDate >= new Date();
      }).length,
      miles_earned: bookings.reduce((total, b) => total + (b.total_amount || 0) * 5, 0)
    };

    res.render('passenger', {
      title: 'Profile Settings - HKAP Airlines',
      user: req.session.user,
      userDetails: userDetails,
      stats: stats,
      activeTab: 'profile'
    });
  } catch (error) {
    console.error('Error loading profile:', error);
    res.status(500).send('Server error');
  }
});

// Update Profile API
app.post('/api/passenger/update-profile', requirePassengerAuth, async (req, res) => {
  try {
    const usersCollection = getCollection(collections.users);
    const userId = req.session.user.id;
    const updateData = req.body;

    // Prepare update fields
    const updates = {
      full_name: updateData.full_name,
      email: updateData.email,
      phone_number: updateData.phone_number,
      passport_number: updateData.passport_number,
      date_of_birth: updateData.date_of_birth ? new Date(updateData.date_of_birth) : null,
      nationality: updateData.nationality,
      updated_at: new Date()
    };

    // Handle preferences
    if (updateData.seat_preference || updateData.meal_preference) {
      updates['preferences.seat_preference'] = updateData.seat_preference || 'any';
      updates['preferences.meal_preference'] = updateData.meal_preference || 'regular';
    }

    // Handle special assistance
    const specialAssistance = [];
    if (updateData.wheelchair === 'on') specialAssistance.push('wheelchair');
    if (updateData.extra_legroom === 'on') specialAssistance.push('extra_legroom');
    if (updateData.priority_boarding === 'on') specialAssistance.push('priority_boarding');
    
    if (specialAssistance.length > 0) {
      updates['preferences.special_assistance'] = specialAssistance;
    }

    // Update user in database
    const result = await usersCollection.updateOne(
      { user_id: userId },
      { $set: updates }
    );

    // Update session data
    if (result.modifiedCount > 0) {
      req.session.user.full_name = updateData.full_name;
      req.session.user.email = updateData.email;
      req.session.user.passport_number = updateData.passport_number;
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: req.session.user
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.json({
      success: false,
      message: 'Error updating profile: ' + error.message
    });
  }
});

// Change Password API
app.post('/api/passenger/change-password', requirePassengerAuth, async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;
    
    if (!current_password || !new_password || !confirm_password) {
      return res.json({
        success: false,
        message: 'All password fields are required'
      });
    }

    if (new_password !== confirm_password) {
      return res.json({
        success: false,
        message: 'New passwords do not match'
      });
    }

    if (new_password.length < 8) {
      return res.json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    const usersCollection = getCollection(collections.users);
    const user = await usersCollection.findOne({ user_id: req.session.user.id });

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
    
    if (!isValidPassword) {
      return res.json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // Update password
    await usersCollection.updateOne(
      { user_id: req.session.user.id },
      { $set: { password_hash: newPasswordHash, updated_at: new Date() } }
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.json({
      success: false,
      message: 'Error changing password: ' + error.message
    });
  }
});

// Cancel Booking API
app.post('/api/passenger/cancel-booking', requirePassengerAuth, async (req, res) => {
  try {
    const { booking_id } = req.body;
    
    const bookingsCollection = getCollection(collections.bookings);
    const flightsCollection = getCollection(collections.flights);
    const boardingPassCollection = getCollection(collections.boardingPasses);

    // Get booking to verify ownership
    const booking = await bookingsCollection.findOne({
      booking_id: booking_id,
      passenger_id: req.session.user.id
    });

    if (!booking) {
      return res.json({
        success: false,
        message: 'Booking not found or access denied'
      });
    }

    // Check if booking can be cancelled
    const flightDate = new Date(booking.flight_date);
    const now = new Date();
    const hoursUntilFlight = (flightDate - now) / (1000 * 60 * 60);

    if (hoursUntilFlight < 24) {
      return res.json({
        success: false,
        message: 'Bookings can only be cancelled at least 24 hours before departure'
      });
    }

    if (booking.booking_status === 'cancelled') {
      return res.json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    // Update booking status
    await bookingsCollection.updateOne(
      { booking_id: booking_id },
      { 
        $set: { 
          booking_status: 'cancelled',
          updated_at: new Date() 
        } 
      }
    );

    // Update flight checked-in count
    await flightsCollection.updateOne(
      { flight_code: booking.flight_code },
      { $inc: { total_checked_in: -1 } }
    );

    // Remove boarding pass if exists
    await boardingPassCollection.deleteOne({
      booking_reference: booking.booking_reference
    });

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.json({
      success: false,
      message: 'Error cancelling booking: ' + error.message
    });
  }
});

// Export Passenger Data API
app.get('/api/passenger/export-data', requirePassengerAuth, async (req, res) => {
  try {
    const usersCollection = getCollection(collections.users);
    const bookingsCollection = getCollection(collections.bookings);
    const boardingPassCollection = getCollection(collections.boardingPasses);
    const baggageCollection = getCollection(collections.baggage);

    // Get all user data
    const user = await usersCollection.findOne({ user_id: req.session.user.id });
    const bookings = await bookingsCollection.find({ passenger_id: req.session.user.id }).toArray();
    const boardingPasses = await boardingPassCollection.find({ passenger_id: req.session.user.id }).toArray();
    const baggage = await baggageCollection.find({ passenger_id: req.session.user.id }).toArray();

    // Prepare data for export (exclude sensitive information)
    const exportData = {
      profile: {
        full_name: user.full_name,
        email: user.email,
        passport_number: user.passport_number,
        nationality: user.nationality,
        date_of_birth: user.date_of_birth,
        frequent_flyer_number: user.frequent_flyer_number,
        preferences: user.preferences
      },
      bookings: bookings.map(b => ({
        booking_reference: b.booking_reference,
        flight_code: b.flight_code,
        flight_date: b.flight_date,
        seat_number: b.seat_number,
        cabin_class: b.cabin_class,
        booking_status: b.booking_status,
        booking_date: b.booking_date,
        total_amount: b.total_amount
      })),
      boarding_passes: boardingPasses.map(bp => ({
        flight_code: bp.flight_code,
        flight_date: bp.flight_date,
        seat_number: bp.seat_number,
        cabin_class: bp.cabin_class,
        gate: bp.gate,
        boarding_time: bp.boarding_time,
        status: bp.status
      })),
      baggage: baggage.map(bg => ({
        baggage_tag: bg.baggage_tag,
        flight_code: bg.flight_code,
        baggage_type: bg.baggage_type,
        weight: bg.weight,
        status: bg.status,
        checked_in_at: bg.checked_in_at
      })),
      exported_at: new Date(),
      exported_by: req.session.user.email
    };

    res.json({
      success: true,
      data: exportData,
      message: 'Data exported successfully'
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.json({
      success: false,
      message: 'Error exporting data: ' + error.message
    });
  }
});

// ============================================
// PASSENGER PORTAL - Redirect to dashboard
// ============================================
app.get('/passenger', requirePassengerAuth, (req, res) => {
  res.redirect('/passenger/dashboard');
});
/// ============================================
// VIEW SINGLE BOARDING PASS BY REFERENCE 
// ============================================
app.get('/passenger/boarding-pass/:bookingRef', requirePassengerAuth, async (req, res) => {
  try {
    const bookingRef = req.params.bookingRef;
    const passengerId = req.session.user.id;
    
    console.log('Fetching boarding pass for booking reference:', bookingRef);
    
    const boardingPassCollection = getCollection(collections.boardingPasses);
    const bookingsCollection = getCollection(collections.bookings);
    const flightsCollection = getCollection(collections.flights);
    const usersCollection = getCollection(collections.users);

    // First, verify the booking belongs to this passenger
    const booking = await bookingsCollection.findOne({
      booking_reference: bookingRef,
      passenger_id: passengerId
    });

    if (!booking) {
      return res.status(404).send('Boarding pass not found or you do not have permission to view it.');
    }

    // Get the boarding pass
    const boardingPass = await boardingPassCollection.findOne({
      booking_reference: bookingRef
    });

    if (!boardingPass) {
      return res.status(404).send('No boarding pass found for this booking. Please complete check-in first.');
    }

    // Get flight details
    const flight = await flightsCollection.findOne({
      flight_code: boardingPass.flight_code
    });

    // Get user details
    const userDetails = await usersCollection.findOne({
      user_id: passengerId
    });

    // Get bookings for the passenger (to satisfy the template requirement)
    const bookings = await bookingsCollection.find({ 
      passenger_id: passengerId 
    }).sort({ booking_date: -1 }).toArray();

    // Format dates and times
    const flightDate = boardingPass.flight_date ? new Date(boardingPass.flight_date) : null;
    const boardingTime = boardingPass.boarding_time || calculateBoardingTime(boardingPass.departure_time);
    const generatedAt = boardingPass.generated_at ? new Date(boardingPass.generated_at) : null;

    const formattedBoardingPass = {
      ...boardingPass,
      flight_details: flight || { flight_code: boardingPass.flight_code, route_display: 'Unknown Route' },
      booking_details: booking,
      flight_date_formatted: flightDate ? flightDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'Not set',
      departure_time_formatted: boardingPass.departure_time || 'TBA',
      boarding_time_formatted: boardingTime,
      generated_at_formatted: generatedAt ?
        generatedAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'Not set',
      barcode_display: boardingPass.barcode ? `|| ${boardingPass.barcode} ||` : `|| ${bookingRef} ||`
    };

    // Calculate stats for the passenger
    const now = new Date();
    const stats = {
      total_bookings: bookings.length,
      upcoming_flights: bookings.filter(b => {
        const flightDate = b.flight_date ? new Date(b.flight_date) : null;
        return flightDate && flightDate > now;
      }).length,
      checked_in: bookings.filter(b => b.booking_status === 'checked_in' || b.booking_status === 'boarded').length,
      miles_earned: bookings.reduce((total, b) => total + (b.total_amount || 0) * 5, 0)
    };

   // In your route, change the render call to:
res.render('boarding-pass-single', {
    title: `Boarding Pass - ${bookingRef}`,
    user: req.session.user,
    boardingPasses: [formattedBoardingPass],
    bookingRef: bookingRef
});
  } catch (error) {
    console.error('Error loading boarding pass:', error);
    res.status(500).send('An error occurred while loading the boarding pass.');
  }
});
