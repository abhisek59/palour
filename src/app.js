import cors from 'cors'
import cookieParser from 'cookie-parser';
import express from "express";
import mainRouter from './routes/router.js';

const app = express();

// CORS middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files and cookies
app.use(express.static('public'));
app.use(cookieParser());


// Logging middleware
app.use((req, res, next) => {
    console.log(`Request Method: ${req.method}, Request URL: ${req.url}`);
    next();
});

app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));
app.use('/temp', express.static('public/temp'));


// Routes
app.use('/api/v1', mainRouter);


export default app;