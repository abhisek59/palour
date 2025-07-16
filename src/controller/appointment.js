import { asyncHandler } from "../utils/asyncHandler.js";
import { Appointment } from "../models/appointment.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.models.js";
import { Service } from "../models/service.models.js";

const createAppointment = asyncHandler(async (req, res) => {
    const { userId, guestName, guestPhone, serviceId, appointmentDate, appointmentTime, staffId, notes, price, duration, rating, review } = req.body;

    // Validate required fields for guest or logged-in user
    if ((!userId && !guestName) || !serviceId || !appointmentDate || !appointmentTime) {
        throw new ApiError(400, "User ID or guest name, Service ID, Appointment Date, and Appointment Time are required");
    }

    // 2. Service existence check
    const service = await Service.findById(serviceId);
    if (!service) {
        throw new ApiError(404, "Service not found");
    }

    // 3. Staff existence check (if provided)
    let staff = null;
    if (staffId) {
        staff = await User.findById(staffId);
        if (!staff) {
            throw new ApiError(404, "Staff not found");
        }
    }

    // 1. Double booking prevention (user or staff at same date/time)
    const conflict = await Appointment.findOne({
        $or: [
            userId ? { userId, appointmentDate, appointmentTime } : null,
            staffId ? { staffId, appointmentDate, appointmentTime } : null
        ].filter(Boolean)
    });
    if (conflict) {
        throw new ApiError(409, "User or staff already has an appointment at this time");
    }

    // Calculate queue number for this slot
    const filter = {
        serviceId,
        appointmentDate,
        appointmentTime,
        status: { $ne: "cancelled" }
    };
    const queueCount = await Appointment.countDocuments(filter);
    const queueNumber = queueCount + 1;

    // 4. Role-based access: Only allow users to create their own appointments
    if (userId && req.user && req.user.role !== 'admin' && req.user._id.toString() !== userId) {
        throw new ApiError(403, "You are not allowed to create appointments for other users");
    }

    // Create the appointment
    const appointment = await Appointment.create({
        userId: userId || undefined,
        guestName: guestName || undefined,
        guestPhone: guestPhone || undefined,
        serviceId,
        appointmentDate,
        appointmentTime,
        staffId,
        notes,
        price,
        duration,
        rating,
        review,
        queueNumber
    });

    return res.status(201)
        .json(new ApiResponse(201, { appointment, queueNumber }, "Appointment created successfully"));
});

const cancelAppointment = asyncHandler(async (req, res) => {
    const { appointmentId, cancellationReason } = req.body; 
    if (!appointmentId) {
        throw new ApiError(400, "Appointment ID is required");
    }
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        throw new ApiError(404, "Appointment not found");
    }   
    appointment.status = "cancelled";
    appointment.cancellationReason = cancellationReason || "No reason provided";
    await appointment.save();   
    return res.status(200)
        .json(new ApiResponse(200, appointment, "Appointment cancelled successfully"));
});

const myAppointments = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const appointments = await Appointment.find({ userId }).populate("serviceId").populate("staffId");
    return res.status(200)
        .json(new ApiResponse(200, appointments, "Appointments retrieved successfully"));
}); 

const getAllAppointments = asyncHandler(async (req, res) => {
    // 7. Pagination support
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const total = await Appointment.countDocuments();
    const appointments = await Appointment.find()
        .populate("userId")
        .populate("serviceId")
        .populate("staffId")
        .skip(skip)
        .limit(limit);
    return res.status(200)
        .json(new ApiResponse(200, {
            appointments,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }, "All appointments retrieved successfully"));
}); 

const getAppointmentById = asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findById(appointmentId).populate("userId").populate("serviceId").populate("staffId");
    if (!appointment) {
        throw new ApiError(404, "Appointment not found");
    }
    return res.status(200)
        .json(new ApiResponse(200, appointment, "Appointment retrieved successfully"));
});

const updateAppointment = asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const { status, notes, staffId, price, duration, rating, review } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        throw new ApiError(404, "Appointment not found");
    }

    // 4. Role-based access: Only allow users to update their own appointments unless admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== appointment.userId.toString()) {
        throw new ApiError(403, "You are not allowed to update this appointment");
    }

    if (status) {
        appointment.status = status;
    }
    if (notes) {
        appointment.notes = notes;
    }
    if (staffId) {
        // 3. Staff existence check
        const staff = await User.findById(staffId);
        if (!staff) {
            throw new ApiError(404, "Staff not found");
        }
        appointment.staffId = staffId;
    }
    if (price) {
        appointment.price = price;
    }
    if (duration) {
        appointment.duration = duration;
    }
    // 8. Only allow feedback if appointment is completed
    if (rating || review) {
        if (appointment.status !== 'completed') {
            throw new ApiError(400, "Feedback can only be given after appointment is completed");
        }
        if (rating) appointment.rating = rating;
        if (review) appointment.review = review;
    }

    await appointment.save();

    return res.status(200)
        .json(new ApiResponse(200, appointment, "Appointment updated successfully"));
});

export { 
    createAppointment,
    cancelAppointment,
    myAppointments,
    getAllAppointments,
    getAppointmentById,
    updateAppointment
};