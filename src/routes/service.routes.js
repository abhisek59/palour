import { Router } from "express";   
import { verifyAdmin, verifyJWT } from "../middleware/auth.middleware.js";
import { createService } from "../controller/service.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const serviceRouter = Router();

serviceRouter.route("/createService")
    .post(
        verifyJWT,
        verifyAdmin,
        upload.fields([{ name: 'image', maxCount: 1 }]),
        createService
    );

export default serviceRouter;