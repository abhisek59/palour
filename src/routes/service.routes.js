import { Router } from "express";   
import { verifyAdmin, verifyJWT } from "../middleware/auth.middleware.js";
import { createService, deleteService, getServiceById, updateService, toggleServiceStatus, getActiveServices, getInactiveServices, searchServices } from "../controller/service.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const serviceRouter = Router();

serviceRouter.route("/createService")
    .post(
        verifyJWT,
        verifyAdmin,
        upload.fields([{ name: 'imageFile', maxCount: 1 }]),
        createService
    );
serviceRouter.route("/getServiceById/:serviceId").get(getServiceById);

serviceRouter.route('/getActiveServices').get(getActiveServices);

serviceRouter.route('/getInactiveServices').get(getInactiveServices)

serviceRouter.route('/updateService/:serviceId').patch(
    verifyJWT,
    verifyAdmin,
    upload.fields([{ name: 'imageFile', maxCount: 1 }]),
    updateService);
serviceRouter.route('deleteService/:serviceId').delete(
    verifyJWT,
    verifyAdmin,
    deleteService
    );
serviceRouter.route('/toggleServiceStatus/:serviceId').patch(
    verifyJWT,
    verifyAdmin,
    toggleServiceStatus
);
serviceRouter.route('/searchServices').get(searchServices);

export default serviceRouter;