import mongoose, { Schema } from "mongoose";


const dailySalesSchema = new Schema({
    date: { type: Date, required: true, unique: true, index: true },
    totalSales: { type: Number, required: true, default: 0 },
    salesByPaymentMethod: {
        cash: { type: Number, default: 0 },
        card: { type: Number, default: 0 },
        online: { type: Number, default: 0 },
    },
    expenses: [{
        name: { type: String, required: true },
        amount: { type: Number, required: true }
    }],
}, { timestamps: true });


 export const DailySales = mongoose.model('DailySales', dailySalesSchema);

