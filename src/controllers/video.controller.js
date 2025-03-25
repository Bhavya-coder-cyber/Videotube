import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteOnCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"
import fs from 'fs';

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy="createdAt", sortType="desc", userId } = req.query
    page = parseInt(page)
    limit = parseInt(limit)

    if (NaN(page) || page < 1) page = 1;
    if (NaN(limit) || limit < 10) limit = 10;

    if (!userId) {
        throw new ApiError(400, "User ID is required")
    }


    const matchstage = {};
    if (query) {
        matchstage.$or = [
            { title: {$regex: query, $options: "i"} },
            { description: {$regex: query, $options: "i"} },
        ]
    }

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        matchstage.owner = mongoose.Types.ObjectId(userId)
    }

    const sortStage = {};
    sortStage[sortBy] = "asc" ? 1 : -1

    const videos = await Video.aggregate([
        {
            $match: matchstage
        },{
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },{
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        },{
            $project: {
                title: 1,
                description: 1,
                thumbnail: 1,
                views: 1,
                videoFile: 1,
                createdAt: 1,
                owner: {
                    _id: 1,
                    username: 1,
                    avatar: 1
                }
            }
        },{
            $sort: sortStage
        }
    ])

    const options = {
        page,
        limit
    }
    const paginateVideo = await Video.aggregatePaginate(videos, options)

    return res.status(200).json(new ApiResponse(200, "Videos fetched successfully", paginateVideo))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body

    const videoFilePath = req.files?.video[0]?.path
    const thumbnailFilePath = req.files?.thumbnail[0]?.path

    try {
        if (!videoFilePath) {
            throw new ApiError(400, "Video file is required")
        }
        if (!thumbnailFilePath) {
            throw new ApiError(400, "Thumbnail file is required")
        }
        if (!title || title.value.trim() === "") {
            throw new ApiError(400, "Title is required")
        }
        if (!description || description.value.trim() === "") {
            throw new ApiError(400, "Description is required")
        }
    
        let video;
        let thumbnail;
        try {
            video = await uploadOnCloudinary(videoFilePath)
            thumbnail = await uploadOnCloudinary(thumbnailFilePath)
    
            if (!video || !thumbnail) {
                throw new ApiError(500, "Error uploading video or thumbnail")
            }
        } catch (error) {
            throw new ApiError(500, "Error in the cloudinary upload")
        }
    
        try {
            const createVideo = await Video.create({
                videoFile: video?.url,
                owner: req?.user?._id,
                thumbnail: thumbnail?.url,
                title,
                description,
                duration: video?.duration
            })
    
            const publishVideo = await Video.findById(createVideo?._id).populate("owner", "username avatar")
            if (!publishVideo) {
                throw new ApiError(500, "Error publishing video")
            }
    
            return res.status(200).json(new ApiResponse(200, "Video published successfully", publishVideo))
    
        } catch (error) {
            await deleteOnCloudinary(video.public_id)
            await deleteOnCloudinary(thumbnail.public_id)
    
            throw new ApiError(500, "Error publishing video in videotube")
        }
    } catch (error) {
        fs.unlinkSync(videoFilePath)
        fs.unlinkSync(thumbnailFilePath)
        throw new ApiError(500, "Error publishing video in videotube")
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Video ID is required")
    }
    const video = await Video.findById(videoId).populate("owner", "username avatar")

    if (!video) {
        throw new ApiError(404, "No video found")
    }

    return res.status(200).json(new ApiResponse(200, "Video fetched successfully", video))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Video ID is required")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "Video not found")
    }
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "User is not owner of the video. Hence you are not allowed to update the video")
    }

    if (!title || title.trim() === "") {
        title = video.title
    }
    if (!description || description.trim() === "") {
        description = video.description
    }
    video.title = title
    video.description = description
    let thumbnail;
    if (thumbnailLocalPath) {
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        if (!thumbnail) {
            throw new ApiError(500, "Error uploading thumbnail")
        }
    }
    try {
        const updatedVideo = await Video.findByIdAndUpdate(videoId, {
            $set: {
                title,
                description,
                thumbnail: thumbnail?.url
            }
        },{new: true})
        if (!updatedVideo) {
            await deleteOnCloudinary(thumbnail.public_id)
            throw new ApiError(500, "Error updating video")
        }

        return res.status(200).json(new ApiResponse(200, "Video updated successfully", updatedVideo))
    } catch (error) {
        if (thumbnail) {
            await deleteOnCloudinary(thumbnail.public_id)
            throw new ApiError(500, "Error updating video in videotube")
        }
    }
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Video ID is required")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "Video not found")
    }
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "User is not owner of the video. Hence you are not allowed to delete the video")
    }

    try {
        if (video.videoFile) {
            await deleteOnCloudinary(video.videoFile)
        }
        if (video.thumbnail) {
            await deleteOnCloudinary(video.thumbnail)
        }
    } catch (error) {
        throw new ApiError(500, "Error deleting video from cloudinary")
    }

    await Comment.deleteMany({ video: video?._id })
    await Like.deleteMany({ video: video?._id })

    await Video.findByIdAndDelete(videoId)

    return res.status(200).json(new ApiResponse(200, "Video deleted successfully", {}))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Video ID is required")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "Video not found")
    }
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "User is not owner of the video. Hence you are not allowed to update the video")
    }

    video.isPublished = !video?.isPublished
    await video.save()

    return res.status(200).json(new ApiResponse(200, "Video published status updated successfully", video))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}