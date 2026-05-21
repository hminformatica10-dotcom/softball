const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://serraty1013:J1013.@softball.6ji6lku.mongodb.net/?appName=softball';

// Schemas copied from server.js to test directly
const gameSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  teamId: { type: String },
  opponent: { type: String, required: true },
  eventDate: { type: Date, required: true },
  time: { type: String, default: '' },
  location: { type: String, default: '' },
  result: { type: String, default: 'Pendiente' },
  feePerPerson: { type: Number, default: 0 },
  fieldPayment: { type: Number, default: 0 },
  collectedTotal: { type: Number, default: 0 },
  surplus: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
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
  conceptId: { type: String, default: null },
  gameId: { type: String, default: null },
  fieldPayment: { type: Number, default: null }
});

const Game = mongoose.models.Game || mongoose.model('Game', gameSchema);
const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

async function runTests() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  const testUserId = 'test_user_' + Date.now();
  const testTeamId = 'test_team_' + Date.now();

  try {
    // 1. Create a game with feePerPerson and fieldPayment
    console.log('\n--- Test 1: Creating Game ---');
    const newGame = new Game({
      userId: testUserId,
      teamId: testTeamId,
      opponent: 'Test Opponent',
      eventDate: new Date(),
      feePerPerson: 15,
      fieldPayment: 100,
      result: 'Pendiente'
    });

    const savedGame = await newGame.save();
    console.log('Game saved successfully:', savedGame);
    
    if (savedGame.feePerPerson !== 15 || savedGame.fieldPayment !== 100) {
      throw new Error(`Fee or field payment mismatch! fee=${savedGame.feePerPerson}, field=${savedGame.fieldPayment}`);
    }
    console.log('✅ Test 1 Passed: Game created with fee and field payment.');

    // 2. Create a Payment linked to the Game
    console.log('\n--- Test 2: Creating Payment ---');
    const newPayment = new Payment({
      userId: testUserId,
      teamId: testTeamId,
      playerId: 'test_player_123',
      playerName: 'Test Player',
      amount: 15,
      description: 'Pago de Play',
      notes: `Juego Vs Test Opponent`,
      eventDate: new Date(),
      gameId: savedGame._id.toString(),
      fieldPayment: savedGame.fieldPayment
    });

    const savedPayment = await newPayment.save();
    console.log('Payment saved successfully:', savedPayment);

    if (savedPayment.gameId !== savedGame._id.toString() || savedPayment.fieldPayment !== 100) {
      throw new Error(`Payment fields mismatch! gameId=${savedPayment.gameId}, fieldPayment=${savedPayment.fieldPayment}`);
    }
    console.log('✅ Test 2 Passed: Payment stored with gameId and fieldPayment.');

    // 3. Calculate and update game totals
    console.log('\n--- Test 3: Updating Game Totals ---');
    const paymentsForGame = await Payment.find({
      userId: testUserId,
      teamId: testTeamId,
      gameId: savedGame._id.toString()
    });

    const total = paymentsForGame.reduce((sum, p) => sum + (p.amount || 0), 0);
    const surplus = total - savedGame.fieldPayment;

    console.log(`Calculated collectedTotal = ${total}, surplus = ${surplus}`);

    savedGame.collectedTotal = total;
    savedGame.surplus = surplus;
    const updatedGame = await savedGame.save();
    console.log('Updated Game in DB:', updatedGame);

    if (updatedGame.collectedTotal !== 15 || updatedGame.surplus !== -85) {
      throw new Error(`Updated totals mismatch! collectedTotal=${updatedGame.collectedTotal}, surplus=${updatedGame.surplus}`);
    }
    console.log('✅ Test 3 Passed: Game totals recalculated and saved.');

  } catch (error) {
    console.error('❌ Test Failed:', error);
  } finally {
    // Cleanup
    console.log('\nCleaning up test records...');
    await Game.deleteMany({ userId: testUserId });
    await Payment.deleteMany({ userId: testUserId });
    console.log('Cleanup finished.');
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

runTests();
