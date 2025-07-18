import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Service } from "../models/service.models.js";
import { uploadOnCloudinary } from "../utils/cloudnary.js";


const createService = asyncHandler(async(req, res) => {
   try {
    console.log("hahahah")
     // Check if user is authenticated
        if (!req.user) {
            throw new ApiError(401, "Authentication required");
        }
        console.log("Authenticated user:", req.user);

        // Check if user has admin rights
        if (req.user.role!=="admin") {
            throw new ApiError(403, "Only administrators can create services");
        }
        console.log("Admin user:", req.user);
     const { 
            name,
            description,
            price,
            category,
            duration,
            prerequisites,
            aftercare,
            availableFor,
            staffRequired,
            availableSlots,
            tags
        } = req.body;
 
     // [422] Validation - Required Fields
     if (!name?.trim() || !description?.trim() || !price || !category || !duration) {
         throw new ApiError(408, "Required fields are missing or invalid"); 
     }
 
     // [409] Conflict - Duplicate Check
     const existingService = await Service.findOne({
         name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
     });
 
     if (existingService) {
         throw new ApiError(402, "Service with this name already exists");
     }
 
     // [422] Validation - Numeric Values
     if (price < 0 || duration < 0) {
         throw new ApiError(405, "Price and duration must be positive numbers");
     }
     console.log("this is req body",req.body);

     // Check for image file in req.files
     const imagepath = req.files?.imageFile?.[0]?.path;
     if(!imagepath){
         throw new ApiError(407, "Service image is required");
     }

     // Log file info for debugging
     console.log("Uploaded file:", {
         path: imagepath,
         mimetype: req.files?.imageFile?.[0]?.mimetype,
         size: req.files?.imageFile?.[0]?.size
     });

     const uploadImage = await uploadOnCloudinary(imagepath);
     if(!uploadImage?.url){
         throw new ApiError(503, "Image upload service unavailable");
     }    
 
 
     // [201] Created - Service Creation
     const service = await Service.create({
         name: name.trim(),
         description: description.trim(),
         price: Number(price),
         category,
         duration: Number(duration),
         prerequisites: prerequisites?.trim(),
         aftercare: aftercare?.trim(),
         image: uploadImage.url,
         availableFor: availableFor || "all",
         staffRequired: Number(staffRequired) || 1,
         availableSlots: Number(availableSlots) || 1,
         tags: tags?.split(',').map(tag => tag.trim()) || [],
         isActive: true
     });
 
     // [201] Created - Success Response
     return res.status(201).json(
         new ApiResponse(201, service, "Service created successfully")
     );
   } catch (error) {
     console.error("Service creation error:", error);
        throw error;
   }
});
const getAllServices = asyncHandler(async (req, res) => {
    const { 
        category, 
        availableFor, 
        minPrice, 
        maxPrice,
        isActive ,page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    const filter = {};
    
    if (category) filter.category = category;
    if (availableFor) filter.availableFor = availableFor;
    if (isActive !== undefined) filter.isActive = isActive;
    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = minPrice;
        if (maxPrice) filter.price.$lte = maxPrice;
    }
    
   const skip = (page - 1) * limit;
    
    const services = await Service.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit);
    
    const totalServices = await Service.countDocuments(filter);
    const totalPages = Math.ceil(totalServices / limit);

    return res.status(200).json(
        new ApiResponse(200, {
            services,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalServices,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }, "Services retrieved successfully")
    );
});
const getServiceById = asyncHandler(async (req, res) => {
    const { serviceId } = req.params;

    if (!serviceId) {
        throw new ApiError(400, "Service ID is required");
    }

    const service = await Service.findById(serviceId);
    
    if (!service) {
        throw new ApiError(404, "Service not found");
    }

    return res.status(200).json(
        new ApiResponse(200, service, "Service retrieved successfully")
    );
});
const updateService = asyncHandler(async (req, res) => {
    const { serviceId } = req.params;
    if (!serviceId) {
        throw new ApiError(400, "Service ID is required");
    }
    // Check if service exists
    const service = await Service.findById(serviceId);
    if (!service) {
        throw new ApiError(404, "Service not found");
    }
    // Build update object only with provided fields
    const updateObj = {};
    const fields = [
        "name", "description", "price", "category", "duration", "prerequisites", "aftercare", "availableFor", "staffRequired", "availableSlots", "tags", "isActive"
    ];
    fields.forEach(field => {
        if (req.body[field] !== undefined) {
            if (["name", "description", "prerequisites", "aftercare"].includes(field)) {
                updateObj[field] = req.body[field]?.trim();
            } else if (["price", "duration", "staffRequired", "availableSlots"].includes(field)) {
                updateObj[field] = Number(req.body[field]);
            } else if (field === "tags") {
                updateObj[field] = req.body.tags?.split(',').map(tag => tag.trim()) || [];
            } else {
                updateObj[field] = req.body[field];
            }
        }
    });
    // Validate price and duration if provided
    if (updateObj.price !== undefined && updateObj.price < 0) {
        throw new ApiError(400, "Price must be a positive number");
    }
    if (updateObj.duration !== undefined && updateObj.duration < 0) {
        throw new ApiError(400, "Duration must be a positive number");
    }
    // Handle image upload if provided
    let uploadedImageUrl = service.image;
    if (req.files?.image && req.files.image.length > 0) {
        const postImage = req.files.image[0].path;
        if (!postImage) {
            throw new ApiError(400, "Service image is required");
        }
        const uploadedImage = await uploadOnCloudinary(postImage);
        if (!uploadedImage?.url) {
            throw new ApiError(500, "Error uploading image");
        }
        uploadedImageUrl = uploadedImage.url;
        updateObj.image = uploadedImageUrl;
    }
    // Update service with provided fields only
    const updatedService = await Service.findByIdAndUpdate(
        serviceId,
        updateObj,
        { new: true, runValidators: true }
    );
    if (!updatedService) {
        throw new ApiError(404, "Service not found");
    }
    return res.status(200).json(
        new ApiResponse(200, updatedService, "Service updated successfully")
    );
});
const deleteService = asyncHandler(async (req, res) => {
    const { serviceId } = req.params;   
    if (!serviceId) {
        throw new ApiError(400, "Service ID is required");
    }
    await Service.findByIdAndDelete(serviceId);
    return res.status(200).json(
        new ApiResponse(200, {}, "Service deleted successfully")
    );
}); 
const toggleServiceStatus = asyncHandler(async (req, res) => {
    const { serviceId } = req.params;   
    if (!serviceId) {
        throw new ApiError(400, "Service ID is required");
    }
    const service = await Service.findById(serviceId);
    if (!service) {
        throw new ApiError(404, "Service not found");
    }
    service.isActive = !service.isActive; // Toggle status
    await service.save();
    return res.status(200).json(
        new ApiResponse(200, service, `Service ${service.isActive ? 'activated' : 'deactivated'} successfully`)
    );
});
const getActiveServices = asyncHandler(async (req, res) => {
    const services = await Service.find({ isActive: true });
    return res.status(200).json(
        new ApiResponse(200, services, "Active services retrieved successfully")
    );
});
const getInactiveServices = asyncHandler(async (req, res) => {
    const services = await Service.find({ isActive: false });
    return res.status(200).json(
        new ApiResponse(200, services, "Inactive services retrieved successfully")
    );
});
const getPopularService = asyncHandler(async (req, res) => {
    // Get services with their appointment counts and ratings
    const popularServices = await Service.aggregate([
        // Match only active services
        { $match: { isActive: true } },
        
        // Lookup appointments for each service
        {
            $lookup: {
                from: "appointments",
                localField: "_id",
                foreignField: "service",
                as: "appointments"
            }
        },

        // Calculate popularity metrics
        {
            $addFields: {
                appointmentCount: { $size: "$appointments" },
                averageRating: {
                    $cond: [
                        { $eq: [{ $size: "$ratings" }, 0] },
                        0,
                        { $avg: "$ratings.rating" }
                    ]
                },
                // Calculate booking frequency (appointments per day)
                bookingFrequency: {
                    $divide: [
                        { $size: "$appointments" },
                        {
                            $add: [
                                1,
                                {
                                    $divide: [
                                        { $subtract: [new Date(), "$createdAt"] },
                                        1000 * 60 * 60 * 24 // Convert ms to days
                                    ]
                                }
                            ]
                        }
                    ]
                }
            }
        },

        // Calculate popularity score
        {
            $addFields: {
                popularityScore: {
                    $add: [
                        { $multiply: ["$appointmentCount", 0.5] }, // 50% weight to booking count
                        { $multiply: ["$averageRating", 0.3] },    // 30% weight to ratings
                        { $multiply: ["$bookingFrequency", 0.2] }  // 20% weight to booking frequency
                    ]
                }
            }
        },

        // Sort by popularity score
        { $sort: { popularityScore: -1 } },

        // Limit to top 10 services
        { $limit: 10 },

        // Remove unnecessary fields
        {
            $project: {
                appointments: 0,
                popularityScore: 0,
                bookingFrequency: 0
            }
        }
    ]);

    if (!popularServices.length) {
        throw new ApiError(404, "No popular services found");
    }

    return res.status(200).json(
        new ApiResponse(
            200, 
            {
                services: popularServices,
                totalCount: popularServices.length
            },
            "Popular services retrieved successfully"
        )
    );
});
const searchServices = asyncHandler(async (req, res) => {
    const { query, category, name } = req.query;

    let filter = { isActive: true };

    // Handle exact category search
    if (category) {
        filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    // Handle exact name search
    if (name) {
        filter.name = { $regex: new RegExp(`^${name}$`, 'i') };
    }

    // Handle general search query
    if (query) {
        filter.$or = [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } },
            { tags: { $in: [new RegExp(query, 'i')] } }
        ];
    }

    const services = await Service.find(filter);

    if (services.length === 0) {
        throw new ApiError(
            404, 
            `No services found${category ? ` in category ${category}` : ''}${name ? ` with name ${name}` : ''}`
        );
    }

    return res.status(200).json(
        new ApiResponse(
            200, 
            services, 
            "Services retrieved successfully"
        )
    );
});
const checkServiceAvailability = asyncHandler(async (req, res) => {
    const { serviceId, date } = req.query;

    if (!serviceId || !date) {
        throw new ApiError(400, "Service ID and date are required");
    }

    const service = await Service.findById(serviceId);
    if (!service) {
        throw new ApiError(404, "Service not found");
    }

    // Check if service is active
    if (!service.isActive) {
        return res.status(200).json(
            new ApiResponse(200, {
                available: false,
                reason: "Service is currently inactive"
            })
        );
    }

    // Check available slots for the date
    const bookedAppointments = await Appointment.countDocuments({
        service: serviceId,
        appointmentDate: {
            $gte: new Date(date),
            $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
        },
        status: { $nin: ['cancelled', 'rejected'] }
    });

    const available = bookedAppointments < service.availableSlots;

    return res.status(200).json(
        new ApiResponse(200, {
            available,
            availableSlots: service.availableSlots - bookedAppointments,
            totalSlots: service.availableSlots
        }, "Service availability checked successfully")
    );
});


export { 
    createService,
    getAllServices,
    getServiceById,
    updateService ,
    deleteService,
    toggleServiceStatus,
    getActiveServices,
    getInactiveServices,
    getPopularService,
    searchServices,
    checkServiceAvailability
 };


