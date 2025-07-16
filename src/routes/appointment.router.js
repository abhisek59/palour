import { Router } from "express";
import { createAppointment } from "../controller/appointment.js";

const appointmentRouter = Router();

appointmentRouter.route('/create').post(createAppointment)


export default appointmentRouter;