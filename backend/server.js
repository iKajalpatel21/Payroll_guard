require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { startScheduler } = require('./config/scheduler');

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  startScheduler();   // ← kicks off automatic payroll cron job
  app.listen(PORT, () => {
    console.log(`🛡️  PayrollGuard API running on http://localhost:${PORT}`);
  });
};

start();

