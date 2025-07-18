import { User } from "../models/user.models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefereshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const signup = asyncHandler(async(req, res) => {
    const {firstname, lastname, email, password, phone, role} = req.body; // Added role to destructuring
    
    if(!firstname || !lastname || !email || !password || !phone) {
        throw new ApiError(400, "Please provide all the required fields");
    }
    
    // Check if user already exists with email or phone
    const existedUser = await User.findOne({
        $or: [{ email }, { phone }]
    });
    
    if(existedUser) {
        throw new ApiError(409, "User already exists with this email or phone");
    }
    
    // Create new user with proper role handling
    const user = await User.create({
        firstname,
        lastname,
        email,
        password,
        phone,
        role: role || "customer" // Default to customer if role not provided
    });
    
    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User created successfully")
    );
});

const login = asyncHandler(async(req, res) => {
    const {email, password} = req.body;
    
    if(!email || !password) {
        throw new ApiError(400, "Email and password are required")
    }
    
    // Changed findById to findOne since we're searching by email
    const user = await User.findOne({ email }).select("+password");
    
    if(!user) {
        throw new ApiError(404, "User not found")
    }
    
    // Changed User.isPasswordCorrect to user.isPasswordCorrect
    const isPasswordCorrect = await user.isPasswordCorrect(password)
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid credentials")
    }
    
    const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }
    
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
        )
    )
})


const logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
    $unset: { refreshToken: 1 }        
    }, 
    {
         new: true
         })    
           const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})  
const accessRefreshToken = asyncHandler(async(req,res)=>{
   const incomingRefreshToken= req.cookie.refreshToken||req.body.refreshToken
   if(!incomingRefreshToken){
    throw new ApiError(400, "Refresh token is required")
   }
  try {
     const decodedToken=   jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
     const user =User.findById(decodedToken?._id)
  if(!user){
      throw new ApiError(404, "User not found")   
  }
  if(incomingRefreshToken !== user.refreshToken){
      throw new ApiError(401, "Refresh token is expired or used")    
  }
  
  const options = {
      httpOnly: true,
      secure: true    
  }
  const {accessToken,newRefreshToken}= await generateAccessAndRefereshTokens(user._id)
   return res 
   .status(200)
   .cookie("accessToken", accessToken,options)
   .cookie("refreshToken",newRefreshToken, options)
   .json (new ApiResponse(200, {
      accessToken,
      refreshToken: newRefreshToken}, "Access and Refresh tokens generated successfully") )
  
  
  } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh token")    
    
  }

   
})
const changePassword = asyncHandler(async(req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new ApiError(400, "Both current and new password are required");
    }

    // Explicitly select password field
    const user = await User.findById(req.user?._id).select("+password");
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    try {
        const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);
        if (!isPasswordCorrect) {
            throw new ApiError(401, "Current password is incorrect");
        }

        user.password = newPassword;
        await user.save({ validateBeforeSave: true });

        return res.status(200)
            .json(new ApiResponse(200, {}, "Password changed successfully"));
    } catch (error) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Error while changing password"
        );
    }
});
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { firstname, lastname, email, phone } = req.body;
    
    // Check if at least one field is provided
    if (!Object.keys(req.body).length) {
        throw new ApiError(400, "At least one field is required for update");
    }

    const user = await User.findById(req.user._id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Check if email is being updated and is unique
    if (email && email !== user.email) {
        const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
        if (emailExists) {
            throw new ApiError(409, "Email already in use");
        }
        user.email = email;
    }

    // Check if phone is being updated and is unique
    if (phone && phone !== user.phone) {
        const phoneExists = await User.findOne({ phone, _id: { $ne: user._id } });
        if (phoneExists) {
            throw new ApiError(409, "Phone number already in use");
        }
        user.phone = phone;
    }

    // Update other fields if provided
    if (firstname) user.firstname = firstname;
    if (lastname) user.lastname = lastname;

    await user.save({ validateBeforeSave: true });

    const updatedUser = await User.findById(user._id).select("-password -refreshToken");
    
    return res.status(200).json(
        new ApiResponse(200, updatedUser, "Account details updated successfully")
    );
});

// Add a new experience to staff
const addExperience = asyncHandler(async (req, res) => {
    const { title, description, startDate, endDate, salon } = req.body;
    if (!title) {
        throw new ApiError(400, "Experience title is required");
    }
    const user = await User.findById(req.user._id);
    if (!user) throw new ApiError(404, "User not found");
    if (user.role !== "staff") throw new ApiError(403, "Only staff can add experiences");
    user.experiences.push({ title, description, startDate, endDate, salon });
    await user.save();
    return res.status(201).json(new ApiResponse(201, user.experiences, "Experience added successfully"));
});

// Update an experience by index
const updateExperience = asyncHandler(async (req, res) => {
    const { expIndex } = req.params;
    const { title, description, startDate, endDate, salon } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) throw new ApiError(404, "User not found");
    if (user.role !== "staff") throw new ApiError(403, "Only staff can update experiences");
    if (!user.experiences[expIndex]) throw new ApiError(404, "Experience not found");
    if (title !== undefined) user.experiences[expIndex].title = title;
    if (description !== undefined) user.experiences[expIndex].description = description;
    if (startDate !== undefined) user.experiences[expIndex].startDate = startDate;
    if (endDate !== undefined) user.experiences[expIndex].endDate = endDate;
    if (salon !== undefined) user.experiences[expIndex].salon = salon;
    await user.save();
    return res.status(200).json(new ApiResponse(200, user.experiences, "Experience updated successfully"));
});

// Remove an experience by index
const removeExperience = asyncHandler(async (req, res) => {
    const { expIndex } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) throw new ApiError(404, "User not found");
    if (user.role !== "staff") throw new ApiError(403, "Only staff can remove experiences");
    if (!user.experiences[expIndex]) throw new ApiError(404, "Experience not found");
    user.experiences.splice(expIndex, 1);
    await user.save();
    return res.status(200).json(new ApiResponse(200, user.experiences, "Experience removed successfully"));
});

export {
    signup,
    login,
    logout,
    accessRefreshToken,
    changePassword,
    updateAccountDetails,
    addExperience,
    updateExperience,
    removeExperience
}