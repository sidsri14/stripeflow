import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import monitorRoutes from './routes/monitor.routes';
import { errorHandler } from './middleware/error.middleware';
import './worker';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/monitors', monitorRoutes);

// Health check route
app.get('/', (req, res) => {
  res.send('API Monitoring SaaS Backend is running.');
});

// Error handling middleware
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
