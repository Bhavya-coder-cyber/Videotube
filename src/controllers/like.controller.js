import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Video ID is required")
    }
    if (!req?.user?._id) {
        throw new ApiError(400, "User is not logged in")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "Video not found")
    }

    const likeVerifier = await Like.findOne({
        likedBy: req?.user?._id,
        video: videoId
    })

    if (!likeVerifier) {
        const newLike = await Like.create({
            likedBy: req?.user?._id,
            video: videoId  
        })
        return res.status(200).json(new ApiResponse(200, "Video liked successfully", newLike))
    }
    else {
        await Like.findByIdAndDelete(likeVerifier?._id)
        return res.status(200).json(new ApiResponse(200, "Video disliked successfully", deletedLike))
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Comment ID is required")
    }
    if (!req?.user?._id) {
        throw new ApiError(400, "User is not logged in")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(400, "Comment not found")
    }

    const likeVerifier = await Like.findOne({
        likedBy: req?.user?._id,
        comment: commentId
    })

    if (!likeVerifier) {
        const newLike = await Like.create({
            likedBy: req?.user?._id,
            comment: commentId  
        })
        return res.status(200).json(new ApiResponse(200, "Comment liked successfully", newLike))
    }
    else {
        await Like.findByIdAndDelete(likeVerifier?._id)
        return res.status(200).json(new ApiResponse(200, "Comment disliked successfully", deletedLike))
    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Tweet ID is required")
    }
    if (!req?.user?._id) {
        throw new ApiError(400, "User is not logged in")
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(400, "Tweet not found")
    }

    const likeVerifier = await Like.findOne({
        likedBy: req?.user?._id,
        tweet: tweetId
    })

    if (!likeVerifier) {
        const newLike = await Like.create({
            likedBy: req?.user?._id,
            tweet: tweetId  
        })
        return res.status(200).json(new ApiResponse(200, "Tweet liked successfully", newLike))
    }
    else {
        await Like.findByIdAndDelete(likeVerifier?._id)
        return res.status(200).json(new ApiResponse(200, "Tweet disliked successfully", deletedLike))
    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    if (!req?.user?._id) {
        throw new ApiError(400, "User is not logged in")
    }

    const likedVideos = await Like.find({
        likedBy: req?.user?._id,
        video: { $ne: null }
    }).populate("video")

    return res.status(200).json(new ApiResponse(200, "Liked videos fetched successfully", likedVideos))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}