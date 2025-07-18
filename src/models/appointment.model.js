import mongoose, { Schema } from "mongoose";


const appointmentSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    serviceId: {
        type: Schema.Types.ObjectId,
        ref: "Service",
        required: true
    },
    appointmentDate: {
        type: Date,
        required: true
    },
    appointmentTime: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "cancelled"],
        default: "pending"
    },
    notes: {
        type: String,
        default: ""
    },
    staffId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "refunded", "failed"],
        default: "pending"
    },
    price: {
        type: Number,
        required: false
    },
    duration: {
        type: Number, // duration in minutes
        required: false
    },
    cancellationReason: {
        type: String,
        default: ""
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    review: {
        type: String,
        default: ""
    }
}, { timestamps: true });

export const Appointment = mongoose.model("Appointment", appointmentSchema);