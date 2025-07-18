import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { DailySales } from '../models/dailySalesSchema.model.js';

// Create a new daily sales record
const createDailySales = asyncHandler(async (req, res) => {
    const { date, salesByPaymentMethod } = req.body;

    if (!date || !salesByPaymentMethod) {
        throw new ApiError(400, "Date and salesByPaymentMethod are required");
    }

    const totalSales = Object.values(salesByPaymentMethod).reduce(
        (sum, val) => sum + (typeof val === 'number' ? val : 0),
        0
    );

    const dailySales = await DailySales.create({
        date,
        totalSales,
        salesByPaymentMethod
    });

    res.status(201).json({
        success: true,
        message: "Daily sales record created successfully",
        data: dailySales
    });
});

// Update an existing daily sales record
const updateDailySales = asyncHandler(async (req, res) => {
    const { date, totalSales, salesByPaymentMethod, transactions } = req.body;

    if (!date) {
        throw new ApiError(400, "Date is required");
    }

    const updateObj = {};
    if (typeof totalSales === 'number') updateObj.totalSales = totalSales;
    if (salesByPaymentMethod) updateObj.salesByPaymentMethod = salesByPaymentMethod;
    if (transactions && Array.isArray(transactions)) {
        updateObj.$push = { transactions: { $each: transactions } };
    }

    const dailySales = await DailySales.findOneAndUpdate(
        { date },
        updateObj,
        { new: true, upsert: true }
    );

    res.status(200).json({
        success: true,
        message: "Daily sales record updated successfully",
        data: dailySales
    });
});

// Fetch monthly sales records and calculate total
const getMonthlySales = asyncHandler(async (req, res) => {
    const { month, year } = req.body;

    if (!month || !year) {
        throw new ApiError(400, "Month and year are required");
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const dailySales = await DailySales.find({
        date: { $gte: startDate, $lte: endDate }
    });

    const totalMonthlySales = dailySales.reduce(
        (sum, record) => sum + record.totalSales,
        0
    );

    res.status(200).json({
        success: true,
        message: "Monthly sales record fetched successfully",
        totalMonthlySales,
        records: dailySales
    });
});

// Add a new expense to a daily sales record
const createExpenses = asyncHandler(async (req, res) => {
    const { date, name, amount } = req.body;

    if (!date || !name || typeof amount !== 'number') {
        throw new ApiError(400, "Date, name, and amount are required");
    }

    const dailySales = await DailySales.findOneAndUpdate(
        { date },
        { $push: { expenses: { name, amount } } },
        { new: true, upsert: true }
    );

    res.status(200).json({
        success: true,
        message: "Expense added successfully",
        data: dailySales
    });
});

// Calculate profit or loss for a month
const getProfiltOrLoss = asyncHandler(async (req, res) => {
    const { month, year } = req.query;

    if (!month || !year) {
        throw new ApiError(400, "Month and year are required");
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const dailySales = await DailySales.find({
        date: { $gte: startDate, $lte: endDate }
    });

    const totalSales = dailySales.reduce((sum, record) => sum + record.totalSales, 0);

    const totalExpenses = dailySales.reduce((sum, record) => {
        return sum + record.expenses.reduce((expSum, expense) => expSum + expense.amount, 0);
    }, 0);

    const profitOrLoss = totalSales - totalExpenses;

    res.status(200).json({
        success: true,
        totalSales,
        totalExpenses,
        profitOrLoss,
        records: dailySales
    });
});

// Get daily sales for a specific date
const getDailySales = asyncHandler(async (req, res) => {
    const { date } = req.query;

    if (!date) {
        throw new ApiError(400, "Date is required");
    }

    const dailySales = await DailySales.findOne({ date });

    if (!dailySales) {
        throw new ApiError(404, "Daily sales record not found for the specified date");
    }

    res.status(200).json({
        success: true,
        data: dailySales
    });
});

// Export all controllers
export {
    createDailySales,
    updateDailySales,
    getMonthlySales,
    createExpenses,
    getProfiltOrLoss,
    getDailySales
};
