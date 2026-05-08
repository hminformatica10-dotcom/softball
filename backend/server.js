require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      console.log('[CORS] Request sin Origin header (permitido)');
      return callback(null, true);
    }
    
    const isAllowed = allowedOrigins.length === 0 || allowedOrigins.includes(origin);
    
    if (isAllowed) {
      console.log(`[CORS] ✅ Origin permitido: ${origin}`);
      return callback(null, true);
    }

    console.warn(`[CORS] ❌ Origin bloqueado: ${origin}`);
    console.warn(`[CORS] Origins permitidos: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'TODOS (lista vacía)'}`);
    return callback(new Error(`CORS policy blocked origin: ${origin}`), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Team-Id'],
  credentials: true,
  optionsSuccessStatus: 204
};

console.log('--- Softball Backend Cloud Run ---');
console.log('Node Version:', process.version);
console.log('Environment:', process.env.NODE_ENV || 'production');
console.log('PORT:', PORT);
console.log('MONGO_URI:', MONGO_URI ? 'configured' : 'MISSING');
console.log('JWT_SECRET:', JWT_SECRET ? 'configured' : 'NOT CONFIGURED');
console.log('Allowed CORS origins:', allowedOrigins.length > 0 ? allowedOrigins : 'not defined');
console.log('----------------------------------');

mongoose.set('strictQuery', true);

app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware para logging detallado de requests
app.use((req, res, next) => {
  const method = req.method;
  const path = req.path;
  const ip = req.ip || req.connection.remoteAddress;
  const timestamp = new Date().toISOString();
  const userId = req.headers['x-user-id'] || 'SIN USER-ID';
  const teamId = req.headers['x-team-id'] || 'SIN TEAM-ID';
  
  if (path.startsWith('/api')) {\n    console.log(`[${timestamp}] ${method.padEnd(6)} ${path.padEnd(30)} | IP: ${ip} | User: ${userId} | Team: ${teamId}`);\n  }\n  next();\n});

// Health check for connectivity detection
app.get('/api/health', (req, res) => {
  const timestamp = new Date().toISOString();
  const clientIp = req.ip || req.connection.remoteAddress || 'DESCONOCIDA';
  const userAgent = req.headers['user-agent'] || 'NO ESPECIFICADO';
  const origin = req.headers['origin'] || 'NO ESPECIFICADA';
  
  console.log('\n' + '='.repeat(60));
  console.log(`[HEALTH CHECK] ${timestamp}`);
  console.log(`  IP Cliente: ${clientIp}`);
  console.log(`  Origin: ${origin}`);
  console.log(`  User-Agent: ${userAgent}`);
  console.log(`  Método: ${req.method}`);
  console.log(`  URL: ${req.originalUrl}`);
  console.log('='.repeat(60) + '\n');
  
  res.status(200).json({
    status: 'OK',
    timestamp: timestamp,
    message: 'Backend conectado correctamente'
  });
});

// --- Schemas ---

const teamSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  primaryColor: { type: String, default: '#38bdf8' },
  adminPassword: { type: String, default: 'admin123' },
  createdAt: { type: Date, default: Date.now }
});

teamSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

const playerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  teamId: { type: String }, // Optional para mantener compatibilidad antes de la migración
  name: { type: String, required: true },
  jerseyNumber: { type: String, required: true },
  position: { type: String, required: true },
  battingHand: { type: String, required: true },
  photo: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

playerSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

const paymentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  teamId: { type: String },
  playerId: { type: String, required: true },
  playerName: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  notes: { type: String, default: '' },
  eventDate: { type: Date, default: Date.now, required: true },
  registrationDate: { type: Date, default: Date.now },
  conceptId: { type: String, default: null }
});

paymentSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

const expenseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  teamId: { type: String },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  receipt: { type: String, default: '' },
  eventDate: { type: Date, default: Date.now, required: true },
  registrationDate: { type: Date, default: Date.now }
});

expenseSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

const gameSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  teamId: { type: String },
  opponent: { type: String, required: true },
  eventDate: { type: Date, required: true },
  time: { type: String, default: '' },
  location: { type: String, default: '' },
  result: { type: String, default: 'Pendiente' },
  createdAt: { type: Date, default: Date.now }
});

gameSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

const paymentConceptSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  teamId: { type: String, required: true },
  name: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

paymentConceptSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

const Team = mongoose.model('Team', teamSchema);
const Player = mongoose.model('Player', playerSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Expense = mongoose.model('Expense', expenseSchema);
const Game = mongoose.model('Game', gameSchema);
const PaymentConcept = mongoose.model('PaymentConcept', paymentConceptSchema);


// --- Rutas Base ---

// Ruta raíz para Health Checks de AWS y validación de vida del servidor
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'Softball Backend API está funcionando correctamente.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Migración global: Asegurar que todos los registros usen eventDate como fuente de verdad
(async () => {
  try {
    const migrateCollection = async (Model, name) => {
      const count = await Model.countDocuments({ date: { $exists: true }, eventDate: { $exists: false } });
      if (count > 0) {
        console.log(`Migrando ${count} registros en ${name}...`);
        const docs = await Model.find({ date: { $exists: true }, eventDate: { $exists: false } });
        for (const doc of docs) {
          doc.eventDate = doc.date;
          // Desactivar validación temporalmente para migración si es necesario
          await doc.save({ validateBeforeSave: false });
        }
      }
    };

    await migrateCollection(Payment, 'Payments');
    await migrateCollection(Expense, 'Expenses');
    await migrateCollection(Game, 'Games');

    console.log('Verificación/Migración de fechas completada.');
  } catch (e) {
    console.error('Error durante la migración de datos:', e.message);
  }
})();

// --- Middleware to extract userId & teamId ---
const getUserId = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing User ID' });
  }
  req.userId = userId;
  req.teamId = req.headers['x-team-id'];
  next();
};

const requireTeam = (req, res, next) => {
  if (!req.teamId || req.teamId === 'undefined' || req.teamId === '') {
    return res.status(400).json({ error: 'Operación denegada: ID de Equipo no válido. Selecciona un equipo en la app.' });
  }
  next();
};

// --- Teams Routes ---

app.get('/api/teams', getUserId, async (req, res) => {
  try {
    console.log(`\n📥 [GET /api/teams] Obteniendo equipos del usuario`);
    console.log(`   User ID: ${req.userId}`);
    const teams = await Team.find({ userId: req.userId }).sort({ createdAt: 1 });
    console.log(`   ✅ Equipos encontrados: ${teams.length}`);
    res.json(teams);
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teams', getUserId, async (req, res) => {
  try {
    const teamCount = await Team.countDocuments({ userId: req.userId });
    const newTeam = new Team({
      userId: req.userId,
      name: req.body.name || 'Nuevo Equipo',
      primaryColor: req.body.primaryColor || '#38bdf8'
    });
    const savedTeam = await newTeam.save();

    // Migración automática del primer equipo
    if (teamCount === 0) {
      await Player.updateMany({ userId: req.userId, teamId: { $exists: false } }, { teamId: savedTeam._id });
      await Payment.updateMany({ userId: req.userId, teamId: { $exists: false } }, { teamId: savedTeam._id });
      await Expense.updateMany({ userId: req.userId, teamId: { $exists: false } }, { teamId: savedTeam._id });
      await Game.updateMany({ userId: req.userId, teamId: { $exists: false } }, { teamId: savedTeam._id });
    }
    
    res.status(201).json(savedTeam);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/teams/:id', getUserId, async (req, res) => {
  try {
    const updatedTeam = await Team.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId }, 
      { 
        name: req.body.name, 
        primaryColor: req.body.primaryColor, 
        adminPassword: req.body.adminPassword
      },
      { new: true }
    );
    if (!updatedTeam) return res.status(404).json({ error: 'Team not found' });
    res.json(updatedTeam);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/teams/:id', getUserId, async (req, res) => {
  try {
    const teamId = req.params.id;
    // Check if team has records
    const pCount = await Player.countDocuments({ teamId, userId: req.userId });
    if (pCount > 0) {
      return res.status(400).json({ error: 'No se puede eliminar un equipo con jugadores registrados.' });
    }
    
    const deletedTeam = await Team.findOneAndDelete({ _id: teamId, userId: req.userId });
    if (!deletedTeam) return res.status(404).json({ error: 'Team not found' });
    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- Players Routes ---

app.get('/api/players', getUserId, requireTeam, async (req, res) => {
  try {
    console.log(`\n📥 [GET /api/players] Obteniendo jugadores`);
    console.log(`   User ID: ${req.userId}`);
    console.log(`   Team ID: ${req.teamId}`);
    const players = await Player.find({ userId: req.userId, teamId: req.teamId }).sort({ createdAt: -1 });
    console.log(`   Jugadores encontrados: ${players.length}`);
    res.json(players);
  } catch (err) {
    console.error(`   Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/players', getUserId, requireTeam, async (req, res) => {
  try {
    console.log(`\n📥 [POST /api/players] Creando nuevo jugador`);
    console.log(`   User ID: ${req.userId}`);
    console.log(`   Team ID: ${req.teamId}`);
    console.log(`   Datos:`, { name: req.body.name, position: req.body.position, jerseyNumber: req.body.jerseyNumber });
    
    const newPlayer = new Player({
      userId: req.userId,
      teamId: req.teamId,
      name: req.body.name,
      jerseyNumber: req.body.jerseyNumber,
      position: req.body.position,
      battingHand: req.body.battingHand,
      photo: req.body.photo || '',
    });
    const savedPlayer = await newPlayer.save();
    console.log(`   Jugador creado: ${savedPlayer._id}`);
    res.status(201).json(savedPlayer);
  } catch (err) {
    console.error(`   Error: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/players/:id', getUserId, requireTeam, async (req, res) => {
  try {
    console.log(`\n📥 [PUT /api/players/:id] Actualizando jugador`);
    console.log(`   Player ID: ${req.params.id}`);
    console.log(`   User ID: ${req.userId}`);
    console.log(`   Team ID: ${req.teamId}`);
    console.log(`   Nuevos datos:`, { name: req.body.name, position: req.body.position });
    
    const updatedPlayer = await Player.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId, teamId: req.teamId }, 
      {
        name: req.body.name,
        jerseyNumber: req.body.jerseyNumber,
        position: req.body.position,
        battingHand: req.body.battingHand,
        photo: req.body.photo || '',
      },
      { new: true }
    );
    if (!updatedPlayer) {
      console.warn(`   Jugador no encontrado`);
      return res.status(404).json({ error: 'Player not found or unauthorized' });
    }
    console.log(`   Jugador actualizado`);
    res.json(updatedPlayer);
  } catch (err) {
    console.error(`   Error: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/players/:id', getUserId, requireTeam, async (req, res) => {
  try {
    const deletedPlayer = await Player.findOneAndDelete({ _id: req.params.id, userId: req.userId, teamId: req.teamId });
    if (!deletedPlayer) return res.status(404).json({ error: 'Player not found or unauthorized' });
    res.json({ message: 'Player deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Payments Routes ---

app.get('/api/payments', getUserId, requireTeam, async (req, res) => {
  try {
    console.log(`\n📥 [GET /api/payments] Obteniendo pagos`);
    console.log(`   User ID: ${req.userId}`);
    console.log(`   Team ID: ${req.teamId}`);
    
    const { playerId, startDate, endDate } = req.query;
    const query = { userId: req.userId, teamId: req.teamId };

    if (playerId) {
      query.playerId = playerId;
      console.log(`   Filtro: Player ID = ${playerId}`);
    }
    if (startDate || endDate) {
      query.eventDate = {};
      if (startDate) {
        query.eventDate.$gte = new Date(startDate);
        console.log(`   Filtro: Desde ${startDate}`);
      }
      if (endDate) {
        query.eventDate.$lte = new Date(endDate);
        console.log(`   Filtro: Hasta ${endDate}`);
      }
    }

    const payments = await Payment.find(query).sort({ eventDate: -1 });
    console.log(`   Pagos encontrados: ${payments.length}`);
    res.json(payments);
  } catch (err) {
    console.error(`   Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments', getUserId, requireTeam, async (req, res) => {
  try {
    console.log(`\n📥 [POST /api/payments] Registrando pago`);
    console.log(`   User ID: ${req.userId}`);
    console.log(`   Team ID: ${req.teamId}`);
    console.log(`   Datos:`, { playerName: req.body.playerName, amount: req.body.amount, description: req.body.description });
    
    const rawDate = req.body.eventDate || req.body.date;
    let finalDate = Date.now();
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) finalDate = parsed;
    }

    if (!req.body.description || req.body.description.trim() === '') {
       console.warn(`   Descripción de pago vacía`);
       return res.status(400).json({ error: 'El concepto/descripción del pago es obligatorio.' });
    }

    const newPayment = new Payment({
      userId: req.userId,
      teamId: req.teamId,
      playerId: req.body.playerId,
      playerName: req.body.playerName,
      amount: req.body.amount,
      description: req.body.description,
      notes: req.body.notes,
      eventDate: finalDate,
      registrationDate: Date.now(),
      conceptId: req.body.conceptId || null
    });
    const savedPayment = await newPayment.save();
    console.log(`   Pago registrado: ${savedPayment._id}`);

    res.status(201).json(savedPayment);
  } catch (err) {
    console.error(`   Error: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/payments/:id', getUserId, requireTeam, async (req, res) => {
  try {
    const updatedPayment = await Payment.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId, teamId: req.teamId },
      {
        playerId: req.body.playerId,
        playerName: req.body.playerName,
        amount: req.body.amount,
        description: req.body.description,
        notes: req.body.notes,
        eventDate: req.body.eventDate ? new Date(req.body.eventDate) : undefined
      },
      { new: true }
    );
    if (!updatedPayment) return res.status(404).json({ error: 'Payment not found or unauthorized' });
    res.json(updatedPayment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/payments/:id', getUserId, requireTeam, async (req, res) => {
  try {
    const deletedPayment = await Payment.findOneAndDelete({ _id: req.params.id, userId: req.userId, teamId: req.teamId });
    if (!deletedPayment) return res.status(404).json({ error: 'Payment not found or unauthorized' });
    res.json({ message: 'Payment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Payment Concepts Routes ---

app.get('/api/payment-concepts', getUserId, requireTeam, async (req, res) => {
  try {
    const concepts = await PaymentConcept.find({ userId: req.userId, teamId: req.teamId }).sort({ createdAt: -1 });
    res.json(concepts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payment-concepts', getUserId, requireTeam, async (req, res) => {
  try {
    const newConcept = new PaymentConcept({
      userId: req.userId,
      teamId: req.teamId,
      name: req.body.name,
      totalAmount: req.body.totalAmount
    });
    const savedConcept = await newConcept.save();
    res.status(201).json(savedConcept);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/payment-concepts/:id', getUserId, requireTeam, async (req, res) => {
  try {
    const deletedConcept = await PaymentConcept.findOneAndDelete({ _id: req.params.id, userId: req.userId, teamId: req.teamId });
    if (!deletedConcept) return res.status(404).json({ error: 'Concept not found or unauthorized' });
    
    // Optional: Clean up payments associated with this concept? 
    // The user didn't ask for it, but it might be good. For now, let's just delete the concept.
    
    res.json({ message: 'Concept deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Expenses Routes ---

app.get('/api/expenses', getUserId, requireTeam, async (req, res) => {
  try {
    console.log(`\n📥 [GET /api/expenses] Obteniendo gastos`);
    console.log(`   User ID: ${req.userId}`);
    console.log(`   Team ID: ${req.teamId}`);
    
    const { startDate, endDate } = req.query;
    const query = { userId: req.userId, teamId: req.teamId };

    if (startDate || endDate) {
      query.eventDate = {};
      if (startDate) {
        query.eventDate.$gte = new Date(startDate);
        console.log(`   Filtro: Desde ${startDate}`);
      }
      if (endDate) {
        query.eventDate.$lte = new Date(endDate);
        console.log(`   Filtro: Hasta ${endDate}`);
      }
    }

    const expenses = await Expense.find(query).sort({ eventDate: -1 });
    console.log(`   Gastos encontrados: ${expenses.length}`);
    res.json(expenses);
  } catch (err) {
    console.error(`   Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', getUserId, requireTeam, async (req, res) => {
  try {
    console.log(`\n📥 [POST /api/expenses] Registrando gasto`);
    console.log(`   User ID: ${req.userId}`);
    console.log(`   Team ID: ${req.teamId}`);
    console.log(`   Datos:`, { category: req.body.category, amount: req.body.amount, description: req.body.description });
    
    const rawDate = req.body.eventDate || req.body.date;
    let finalDate = Date.now();
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) finalDate = parsed;
    }

    const newExpense = new Expense({
      userId: req.userId,
      teamId: req.teamId,
      category: req.body.category,
      amount: req.body.amount,
      description: req.body.description,
      receipt: req.body.receipt || '',
      eventDate: finalDate,
      registrationDate: Date.now()
    });
    const savedExpense = await newExpense.save();
    console.log(`   Gasto registrado: ${savedExpense._id}`);
    res.status(201).json(savedExpense);
  } catch (err) {
    console.error(`   Error: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/expenses/:id', getUserId, requireTeam, async (req, res) => {
  try {
    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId, teamId: req.teamId },
      {
        category: req.body.category,
        amount: req.body.amount,
        description: req.body.description,
        receipt: req.body.receipt,
        ...(req.body.eventDate && { eventDate: new Date(req.body.eventDate) }),
        ...(req.body.date && !req.body.eventDate && { eventDate: new Date(req.body.date) })
      },
      { new: true }
    );
    if (!updatedExpense) return res.status(404).json({ error: 'Expense not found or unauthorized' });
    res.json(updatedExpense);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', getUserId, requireTeam, async (req, res) => {
  try {
    const deletedExpense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.userId, teamId: req.teamId });
    if (!deletedExpense) return res.status(404).json({ error: 'Expense not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GAMES ROUTES ---

app.get('/api/games', getUserId, requireTeam, async (req, res) => {
  try {
    console.log(`\n📥 [GET /api/games] Obteniendo juegos`);
    console.log(`   User ID: ${req.userId}`);
    console.log(`   Team ID: ${req.teamId}`);
    
    const games = await Game.find({ userId: req.userId, teamId: req.teamId }).sort({ eventDate: 1 });
    console.log(`   Juegos encontrados: ${games.length}`);
    res.json(games.map(g => ({
      id: g._id.toString(),
      opponent: g.opponent,
      eventDate: g.eventDate,
      time: g.time,
      location: g.location,
      result: g.result
    })));
  } catch (err) {
    console.error(`   Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/games', getUserId, requireTeam, async (req, res) => {
  try {
    console.log(`\n📥 [POST /api/games] Registrando juego`);
    console.log(`   User ID: ${req.userId}`);
    console.log(`   Team ID: ${req.teamId}`);
    console.log(`   Datos:`, { opponent: req.body.opponent, date: req.body.eventDate || req.body.date, time: req.body.time, location: req.body.location });
    
    const rawDate = req.body.eventDate || req.body.date;
    const parsedDate = new Date(rawDate);
    
    if (!rawDate || isNaN(parsedDate.getTime())) {
      console.warn(`   Fecha de juego inválida: ${rawDate}`);
      return res.status(400).json({ error: 'La fecha del juego es obligatoria y debe ser válida.' });
    }

    const newGame = new Game({
      userId: req.userId,
      teamId: req.teamId,
      opponent: req.body.opponent,
      eventDate: parsedDate,
      time: req.body.time || '',
      location: req.body.location || '',
      result: req.body.result || 'Pendiente'
    });
    
    const savedGame = await newGame.save();
    console.log(`   Juego registrado: ${savedGame._id}`);

    res.status(201).json({
      id: savedGame._id.toString(),
      opponent: savedGame.opponent,
      eventDate: savedGame.eventDate,
      time: savedGame.time,
      location: savedGame.location,
      result: savedGame.result
    });
  } catch (err) {
    console.error(`   ERROR CRÍTICO AL GUARDAR JUEGO: ${err.message}`);
    res.status(500).json({ 
      error: 'Error interno al guardar el juego',
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

app.put('/api/games/:id', getUserId, requireTeam, async (req, res) => {
  try {
    console.log(`\n📥 [PUT /api/games/:id] Actualizando juego`);
    console.log(`   Game ID: ${req.params.id}`);
    console.log(`   User ID: ${req.userId}`);
    console.log(`   Team ID: ${req.teamId}`);
    console.log(`   Nuevos datos:`, { opponent: req.body.opponent, result: req.body.result });
    
    const gameDateString = req.body.eventDate || req.body.date;
    const updateData = {
      opponent: req.body.opponent,
      time: req.body.time,
      location: req.body.location,
      result: req.body.result
    };
    
    if (gameDateString) {
      updateData.eventDate = new Date(gameDateString);
    }

    const updatedGame = await Game.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId, teamId: req.teamId },
      updateData,
      { new: true }
    );
    
    if (!updatedGame) {
      console.warn(`   Juego no encontrado`);
      return res.status(404).json({ error: 'Juego no encontrado o no autorizado' });
    }
    console.log(`   Juego actualizado`);
    res.json({
      id: updatedGame._id.toString(),
      opponent: updatedGame.opponent,
      eventDate: updatedGame.eventDate,
      time: updatedGame.time,
      location: updatedGame.location,
      result: updatedGame.result
    });
  } catch (err) {
    console.error(`   Error: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/games/:id', getUserId, requireTeam, async (req, res) => {
  try {
    const deletedGame = await Game.findOneAndDelete({ _id: req.params.id, userId: req.userId, teamId: req.teamId });
    if (!deletedGame) return res.status(404).json({ error: 'Game not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- BACKUP & RESTORE ROUTES ---

app.get('/api/backup', getUserId, async (req, res) => {
  try {
    const teams = await Team.find({ userId: req.userId });
    const players = await Player.find({ userId: req.userId });
    const payments = await Payment.find({ userId: req.userId });
    const expenses = await Expense.find({ userId: req.userId });
    const games = await Game.find({ userId: req.userId });

    res.json({
      timestamp: new Date().toISOString(),
      data: { teams, players, payments, expenses, games }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate backup' });
  }
});

app.post('/api/restore', getUserId, async (req, res) => {
  try {
    const backupData = req.body.data;
    if (!backupData) return res.status(400).json({ error: 'Formato de Backup Inválido' });

    // Preprocesar los datos para forzar userId y reconciliar _id
    const formatItems = (items) => (items || []).map(item => {
      const formatted = { ...item, userId: req.userId };
      if (formatted.id) {
        formatted._id = formatted.id;
        delete formatted.id;
      }
      return formatted;
    });

    const teams = formatItems(backupData.teams);
    const players = formatItems(backupData.players);
    const payments = formatItems(backupData.payments);
    const expenses = formatItems(backupData.expenses);
    const games = formatItems(backupData.games);

    // Wipe current user data
    await Team.deleteMany({ userId: req.userId });
    await Player.deleteMany({ userId: req.userId });
    await Payment.deleteMany({ userId: req.userId });
    await Expense.deleteMany({ userId: req.userId });
    await Game.deleteMany({ userId: req.userId });

    // Restore new data
    if (teams.length > 0) await Team.insertMany(teams);
    if (players.length > 0) await Player.insertMany(players);
    if (payments.length > 0) await Payment.insertMany(payments);
    if (expenses.length > 0) await Expense.insertMany(expenses);
    if (games.length > 0) await Game.insertMany(games);

    res.json({ message: 'Backup restaurado correctamente.' });
  } catch (err) {
    console.error('RESTORE ERROR:', err);
    res.status(500).json({ error: 'Fallo al restaurar Backup' });
  }
});

// --- Servir Frontend Estático (Opcional) ---
const frontendPath = path.join(__dirname, 'public');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
}

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexHtml = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  return res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: 'Internal server error' });
});

const connectDatabase = async () => {
  if (!MONGO_URI) {
    console.warn('MONGO_URI is not set. Database functionality will be disabled.');
    return;
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Backend: Conectado exitosamente a MongoDB Atlas');
  } catch (err) {
    console.error('Backend: Falló la conexión a MongoDB:', err);
  }
};

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

const startServer = async () => {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`Backend: Servidor corriendo en puerto ${PORT}`);
    console.log(`Backend: Health check disponible en http://localhost:${PORT}/api/health`);
  });
};

startServer().catch((err) => {
  console.error('Server failed to start:', err);
});
