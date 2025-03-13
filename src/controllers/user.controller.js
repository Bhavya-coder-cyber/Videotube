import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        if (!user) {
            throw new ApiError(400, "Please enter a user")
        }
    
        const accessToken = user.generateAccessToken() 
        const refreshToken = user.generateRefreshToken()
    
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    const {fullname, email, username, password} = req.body

    //validation
    if ([fullname, username, email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }
    const existedUser = await User.findOne({
        $or: [{username}, {email}] //Call for mongoDB
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    console.warn(req.files)

    //"?" is the function to check whether this element exists or not.
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverLocalPath = req.files?.coverImage?.[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    // const avatar = await uploadOnCloudinary(avatarLocalPath)
    // let coverImage = ""
    // if (coverLocalPath) {
    //     coverImage = await uploadOnCloudinary(coverImage)
    // }

    let avatar;
    try {
        avatar = await uploadOnCloudinary(avatarLocalPath)
        console.log("Uploaded avatar", avatar)
    } catch (error) {
        console.log("Error uploading avatar", error)
        throw new ApiError(500, "Error uploading Avatar")
    } 
    let coverImage;
    try {
        coverImage = await uploadOnCloudinary(coverLocalPath)
        console.log("Uploaded coverImage", avatar)
    } catch (error) {
        console.log("Error uploading coverImage", error)
        throw new ApiError(500, "Error uploading CoverImage")
    }

    //In every database operation make sure to use await 
    try {
        const user = await User.create({
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password, 
            username: username.toLowerCase()
        })
    
        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken" //Spelling should be correct in this field
        )
    
        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering a User");
            
        }
        return res
        .status(201)
        .json(new ApiResponse(201, "User registered successfully", createdUser))
    } catch (error) {
        console.log("User Creation failed")
        if (avatar) {
            await deleteFromCloudinary(avatar.public_id)
        }
        if (coverImage) {
            await deleteFromCloudinary(coverImage.public_id)
        }
        throw new ApiError(500, "Something went wrong while registering a User and Images were deleted");
    }
})

const loginUser = asyncHandler( async (req, res) => {
    const {email, username, password} = req.body

    if (!email) {
        throw new ApiError(400, "Email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}] //Call for mongoDB
    })
    if (!user) {
        throw new ApiError(404, "User not found")
    }

    //Validate password
    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect password")
    }

    //Generate access and refresh tokens
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    if (!loggedInUser) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
    }

    const options = {
        httpOnly: true, //this makes the cookie non modifiable on the client side
        secure: process.env.NODE_ENV === "production", 

    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully"))

})

const logoutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndUpdate(
        //we don't know the info of the user
        req.user._id,
        {
            $set: { //sets in the new field
                refreshToken: undefined
            }
        },
        {new: true}
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, "User logged out successfully"))
})  

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invaid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Invaid refresh token")
        }

        const options = {
           httpOnly: true,
           secure: process.env.NODE_ENV === "production" 
        }

        const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(200, {accessToken, refreshToken: newRefreshToken }, "User access token refreshed successfully")
            )

    } catch (error) {
        console.log("Error refreshing access token", error)
        throw new ApiError(500, "Something went wrong while refreshing access token")
    }
})

const changeCurrentPassword = asyncHandler(async (res, req) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordValid = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })
    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (res, req) => {
    return res.status(200).json(new ApiResponse(200, req.user, "Current user details")) 
})

const updateAccountDetails = asyncHandler(async (res, req) => {
    const {fullname, email} = req.body
    if (!fullname || !email) {
        throw new ApiError(400, "Fullname and email are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email: email
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    return res.status(200).json( new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (res, req) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar =  await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError(500, "Something went wrong uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler(async (res, req) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    } 

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage.url) {
        throw new ApiError(500, "Something went wrong uploading cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    res.status(200).json(new ApiResponse(200, user, "Cover image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params
    if (!username?.trim()) {
        throw new ApiError(400, "Username is required")
    }

    const channel = await User.aggregate(
        [
            {
                $match: {
                    username: username?.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscriptions"
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },
            {
                $addFields: {
                    subscriberCount: {
                        $size: "$subscriptions"
                    },
                    channelsSubscriberCount: {
                        $size: "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: {$in: [req.user?._id, "$subscriptions.subscriber"]},
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                    subscriberCount: 1,
                    chanelsSubscriberCount: 1,
                    isSubscribed: 1,
                    coverImage: 1,
                    email: 1
                } 
            }
        ]
    )

    if (!channel?.length) {
        throw new ApiError(404, "Channel not found")
    }

    return res.status(200).json( new ApiResponse(200, channel[0], "Channel profile fetched successfully"))

})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate(
        [
            {
                $match: {
                    // _id: req.user?._id
                    // We can't use this since mongoose required object id and this is a string
                    _id: new mongoose.Types.ObjectId(req.user?._id)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            fullname: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                owner: {
                                    $arrayElemAt: ["$owner", 0]
                                }
                            }
                        }
                    ]
                }
            }
        ]
    )

    return res.status(200).json(new ApiResponse(200, user[0]?.watchHistory, "Watch History fetched successfully"))
})

export {registerUser, loginUser, refreshAccessToken, logoutUser, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory} 