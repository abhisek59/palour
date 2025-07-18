import { Router } from 'express';
import { verifyAdmin, verifyJWT } from '../middleware/auth.middleware.js';
import {
    createDailySales,
    updateDailySales,
    getMonthlySales,
    createExpenses,
    getProfiltOrLoss,
    getDailySales
} from '../controller/dailySales.controller.js';

const salesRouter = Router();

salesRouter.route('/dailySales').post(verifyJWT,verifyAdmin,createDailySales);
salesRouter.route('/getMonthlySales').get(verifyJWT, verifyAdmin, getMonthlySales);
salesRouter.route('/expenses').post(verifyJWT, verifyAdmin, createExpenses);
salesRouter.route('/profitOrLoss').get(verifyJWT,verifyAdmin,getProfiltOrLoss)


export default salesRouter;
