import { Router } from "express";
import serviceRouter from "./service.routes.js";
import userRouter from "./user.routes.js";
import appointmentRouter from "./appointment.routes.js";

const mainRouter = Router();

mainRouter.use("/services", serviceRouter);
mainRouter.use("/users", userRouter);
mainRouter.use("/appointments", appointmentRouter);

export default mainRouter;
