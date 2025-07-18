import { User } from "../models/user.models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendEmail } from "../utils/sendMail.js"; // Changed from sendEmail.js to sendMail.js
import { OAuth2Client } from 'google-auth-library';



const forgetPassword = asyncHandler(async(req, res) => {
    const { email } = req.body;
    let user;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    try {
        // Find user and select OTP fields
        user = await User.findOne({ email })
            .select("+resetPasswordOTP +resetPasswordOTPExpires");
        
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Generate OTP and save
        const resetOTP = user.generateResetOTP();
        await user.save({ validateBeforeSave: false });

        // Send OTP via email
        await sendEmail({
            email: user.email,
            subject: "Password Reset OTP",
            message: `Your OTP for password reset is: ${resetOTP}\nValid for 10 minutes.`,
            html: `
                <h1>Password Reset</h1>
                <p>Your OTP for password reset is: <strong>${resetOTP}</strong></p>
                <p>This OTP is valid for 10 minutes.</p>
            `
        });

        return res.status(200).json(
            new ApiResponse(
                200,
                { email: user.email },
                "Password reset OTP sent successfully"
            )
        );
    } catch (error) {
        // Reset OTP fields if anything fails
        if (user) {
            user.resetPasswordOTP = undefined;
            user.resetPasswordOTPExpires = undefined;
            await user.save({ validateBeforeSave: false });
        }

        console.error("Forget password error:", error);
        throw new ApiError(
            error.statusCode || 500, 
            error.message || "Failed to process password reset request"
        );
    }
});

const resetPassword = asyncHandler(async(req, res) => {
    const { email, resetOTP, newPassword } = req.body;  
    if (!email || !resetOTP || !newPassword) {
        throw new ApiError(400, "Email, OTP, and new password are required");
    }
    let user;
    try {
        // Find user and select OTP fields
        user = await User.findOne({ email })
            .select("+resetPasswordOTP +resetPasswordOTPExpires");  
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Check if OTP is valid
        if (!user.resetPasswordOTP || !user.resetPasswordOTPExpires) {
            throw new ApiError(400, "OTP not generated or expired");
        }
        if (user.resetPasswordOTP !== resetOTP) {
            throw new ApiError(400, "Invalid OTP");
        }

        if (user.resetPasswordOTPExpires < Date.now()) {
            // Reset OTP fields if expired
            user.resetPasswordOTP = undefined;  
            user.resetPasswordOTPExpires = undefined;
            await user.save({ validateBeforeSave: false });
            throw new ApiError(400, "OTP has expired");
        }
        // Update password
        user.password = newPassword;

        // Clear OTP fields after successful reset
        user.resetPasswordOTP = undefined;
        user.resetPasswordOTPExpires = undefined;
        await user.save({ validateBeforeSave: true });

        return res.status(200).json(
            new ApiResponse(
                200,
                { email: user.email },
                "Password reset successfully"
            )
        );
    } catch (error) {
        // Reset OTP fields if anything fails
        if (user) {
            user.resetPasswordOTP = undefined;      
            user.resetPasswordOTPExpires = undefined;
            await user.save({ validateBeforeSave: false });
        }   
        console.error("Reset password error:", error);
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Failed to reset password"
        );
    }
});



const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLogin = asyncHandler(async(req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        throw new ApiError(400, "Google token is required");
    }

    try {
        // Verify the token
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        // Check if user exists
        let user = await User.findOne({ email: payload.email });

        if (!user) {
            // Create new user
            user = await User.create({
                firstname: payload.given_name,
                lastname: payload.family_name,
                email: payload.email,
                googleId: payload.sub,
                isEmailVerified: payload.email_verified,
                password: crypto.randomBytes(16).toString('hex') // Random password for Google users
            });
        }

        // Generate tokens
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Update user's refresh token
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        // Set cookies
        const options = {
            httpOnly: true,
            secure: true
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(200, {
                    user: {
                        _id: user._id,
                        email: user.email,
                        firstname: user.firstname,
                        lastname: user.lastname
                    },
                    accessToken
                }, "Google login successful")
            );

    } catch (error) {
        throw new ApiError(401, "Invalid Google token");
    }
});

export { googleLogin,forgetPassword, resetPassword };