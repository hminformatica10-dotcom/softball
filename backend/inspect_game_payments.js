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
  await mongoose.connect(MONGO_URI);

  const payments = await Payment.find({});
  payments.forEach((p, i) => {
    console.log(`[${i}] Player: ${p.playerName}, Description: ${p.description}, Amount: ${p.amount}, gameId: ${p.gameId}, notes: "${p.notes}"`);
  });

  await mongoose.connection.close();
}

run().catch(console.error);
