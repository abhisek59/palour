import { Router } from "express";
import { changePassword, login, logout, signup, updateAccountDetails, addExperience, updateExperience, removeExperience } from "../controller/user.controllers.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { forgetPassword, googleLogin } from "../controller/auth.controllers.js";
// import { verifyJWT } from "../middleware/auth.middleware.js";

const userRouter = Router();

userRouter.route('/signup').post(signup);
userRouter.route('/login').post(login);
userRouter.route('/logout').post(verifyJWT,logout)
userRouter.route('/changePassword').patch(verifyJWT,changePassword)
userRouter.route('/updateAccountDetails').patch(verifyJWT,updateAccountDetails);
userRouter.route('/forgetPassword').post(forgetPassword)
userRouter.route("/google").post(googleLogin);

// Staff experience management
userRouter.route('/experiences').post(verifyJWT, addExperience); // Add experience
userRouter.route('/experiences/:expIndex').patch(verifyJWT, updateExperience); // Update experience by index
userRouter.route('/experiences/:expIndex').delete(verifyJWT, removeExperience); // Remove experience by index

export default userRouter;