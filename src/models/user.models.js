import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new Schema({
    firstname: {
        type: String,
        required: [true, "First name is required"],
        trim: true,
    },
    lastname: {
        type: String,
        required: [true, "Last name is required"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function(value) {
                return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value);
            },
            message: "Please enter a valid email"
        }
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [6, "Password must be at least 6 characters"],
        validate: {
            validator: function(value) {
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(value);
            },
            message: "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
        },
        select: false
    },
    phone: {
        type: String,
        required: [true, "Phone number is required"],
        unique: true,
        trim: true,
        validate: {
            validator: function(value) {
                return /^\+?[\d\s-]{10,}$/.test(value);
            },
            message: "Please enter a valid phone number"
        }
    },
    role: {
        type: String,
        enum: ["staff", "admin", "customer"],
        default: "customer",
    },
    // New fields for Google Auth and enhanced features
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    refreshToken: {
        type: String,
        select: false
    },
    resetPasswordOTP: {
        type: String,
        select: false
    },
    resetPasswordOTPExpires: {
        type: Date,
        select: false
    },
    lastLogin: {
        type: Date
    },
    status: {
        type: String,
        enum: ["active", "inactive", "blocked"],
        default: "active"
    },
    experiences: [
        {
            title: { type: String, required: true },
            description: { type: String },
            startDate: { type: Date },
            endDate: { type: Date },
            salon: { type: String },
        }
    ], // Only relevant for staff
}, { 
    timestamps: true 
});

// 🔐 Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// 🔑 Compare passwords
userSchema.methods.isPasswordCorrect = async function (password) {
    if (!password) {
        throw new Error("Password is required for comparison");
    }
    
    try {
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        throw new Error("Password comparison failed");
    }
};

// 🔐 Generate access token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign({
        _id: this._id,
        username: this.username,
        email: this.email,
        fullname: this.fullname,
    }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
    });
};

// 🔐 Generate refresh token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign({
        _id: this._id,
    }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
    });
};


// Generate OTP method
userSchema.methods.generateResetOTP = function () {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    this.resetPasswordOTP = hashedOTP;
    this.resetPasswordOTPExpires = Date.now() + 10 * 60 * 1000; // Valid for 10 mins

    return otp;
};

// New method for Google Auth
userSchema.methods.createGoogleUser = async function(googleData) {
    this.googleId = googleData.sub;
    this.firstname = googleData.given_name || '';
    this.lastname = googleData.family_name || '';
    this.email = googleData.email;
    this.avatar = googleData.picture;
    this.isEmailVerified = googleData.email_verified;
    this.lastLogin = new Date();
    return this;
};



export const User = mongoose.model("User", userSchema);
