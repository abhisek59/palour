import mongo from 'mongoose';
import { DB_NAME } from '../constant.js';

const connectDB = async () => {
    try {
        const dbUrl = process.env.MONGO_URL || `mongodb://localhost:27017/${DB_NAME}`;
        await mongo.connect(dbUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`Connected to database: ${DB_NAME}`);
    } catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
}
export default connectDB;