import mongoose, { Schema } from "mongoose";

const serviceSchema = new Schema({
    name: {
        type: String,
        required: [true, "Service name is required"],
        trim: true,
        unique: true
    },
    description: {
        type: String,
        required: [true, "Service description is required"],
        trim: true,
    },
    price: {
        type: Number,
        required: [true, "Service price is required"],
        min: [0, "Price cannot be negative"],
    },
    duration: {
        type: Number,
        required: [true, "Service duration is required"],
        min: [1, "Duration must be at least 1 minute"],
    },
    category: {
        type: String,
        required: [true, "Service category is required"],
        enum: ["eyelashes", "waxing", "facial", "massage", "threading, "],
    },
    image: {
        type: String, // Cloudinary URL
        required: true,
    },
    // New fields
    isActive: {
        type: Boolean,
        default: true
    },
    staffRequired: {
        type: Number,
        default: 1,
       
    },
    availableSlots: {
        type: Number,
   
    },
    prerequisites: {
        type: String,
        trim: true
    },
    aftercare: {
        type: String,
        trim: true
    },
    availableFor: {
        type: String,
        enum: ["all", "men", "women"],
        default: "all"
    },
    
    loyaltyProgram: {
        isEnabled: {
            type: Boolean,
            default: true
        },
        requiredVisits: {
            type: Number,
            default: 5  
        },
        discountType: {
            type: String,
            enum: ['free-service', 'percentage-discount'],
            default: 'free-service'
        },
        discountValue: {
            type: Number,
            default: 100, // 100% for free service
            min: 0,
            max: 100
        }
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});



// Index for better search performance
serviceSchema.index({ name: 1, category: 1 });

// Method to check if service is available
serviceSchema.methods.isAvailable = function() {
    return this.isActive && this.availableSlots > 0;
};

export const Service = mongoose.model("Service", serviceSchema);