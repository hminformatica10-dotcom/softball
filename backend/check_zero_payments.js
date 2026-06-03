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

  const totalPayments = await Payment.countDocuments({});
  const zeroPayments = await Payment.countDocuments({ amount: 0 });
  const zeroPlayPayments = await Payment.countDocuments({ description: 'Pago de Play', amount: 0 });
  const nonZeroPlayPayments = await Payment.countDocuments({ description: 'Pago de Play', amount: { $gt: 0 } });

  console.log(`Total payments: ${totalPayments}`);
  console.log(`Payments with amount = 0: ${zeroPayments}`);
  console.log(`'Pago de Play' payments with amount = 0: ${zeroPlayPayments}`);
  console.log(`'Pago de Play' payments with amount > 0: ${nonZeroPlayPayments}`);

  if (zeroPlayPayments > 0) {
    const samples = await Payment.find({ description: 'Pago de Play', amount: 0 }).limit(10);
    console.log('Samples of zero Play payments:');
    samples.forEach(s => {
      console.log(`ID: ${s._id}, Player: ${s.playerName}, Notes: ${s.notes}, eventDate: ${s.eventDate}`);
    });
  }

  await mongoose.connection.close();
}

run().catch(console.error);
