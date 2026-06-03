const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://serraty1013:J1013.@softball.6ji6lku.mongodb.net/?appName=softball';

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

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

async function run() {
  console.log('Connecting...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  console.log('Fetching payments...');
  const payments = await Payment.find({}).limit(20);
  console.log(`Found ${payments.length} payments.`);
  payments.forEach((p, i) => {
    console.log(`[${i}] ID: ${p._id}, Player: ${p.playerName}, Description: ${p.description}, Amount: ${p.amount} (Type: ${typeof p.amount}), eventDate: ${p.eventDate}`);
  });

  await mongoose.connection.close();
  console.log('Disconnected.');
}

run().catch(console.error);
