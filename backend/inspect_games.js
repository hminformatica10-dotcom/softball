const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://serraty1013:J1013.@softball.6ji6lku.mongodb.net/?appName=softball';

const gameSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  teamId: { type: String },
  opponent: { type: String, required: true },
  eventDate: { type: Date, required: true },
  time: { type: String, default: '' },
  location: { type: String, default: '' },
  result: { type: String, default: 'Pendiente' },
  feePerPerson: { type: mongoose.Schema.Types.Mixed, default: 0 },
  fieldPayment: { type: mongoose.Schema.Types.Mixed, default: 0 },
  collectedTotal: { type: Number, default: 0 },
  surplus: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Game = mongoose.models.Game || mongoose.model('Game', gameSchema);

async function run() {
  console.log('Connecting...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  console.log('Fetching games...');
  const games = await Game.find({}).limit(20);
  console.log(`Found ${games.length} games.`);
  games.forEach((g, i) => {
    console.log(`[${i}] ID: ${g._id}, Opponent: ${g.opponent}, feePerPerson: ${g.feePerPerson} (Type: ${typeof g.feePerPerson}), fieldPayment: ${g.fieldPayment}`);
  });

  await mongoose.connection.close();
  console.log('Disconnected.');
}

run().catch(console.error);
