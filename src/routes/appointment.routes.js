import { Router } from "express";
import { cancelAppointment, createAppointment, getAllAppointments, myAppointments, staffAppointments } from "../controller/appointment.js";
import { verifyAdmin, verifyJWT } from "../middleware/auth.middleware.js";

const appointmentRouter = Router();

appointmentRouter.route('/create').post( verifyJWT,createAppointment)
appointmentRouter.route('/cancel/:appointmentId').delete(verifyJWT,cancelAppointment)
appointmentRouter.route('/getMyAppointments').get(verifyJWT, myAppointments);
appointmentRouter.route('/getAllAppointments').get(verifyJWT,verifyAdmin,getAllAppointments)
// In appointment.routes.js
appointmentRouter.route('/staff/:staffId').get(staffAppointments);


export default appointmentRouter;