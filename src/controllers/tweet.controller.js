import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body
    if (!content || content.value.trim() === "") {
        throw new ApiError(400, "Content is required")
    }
    if (!req?.user?._id) {
        throw new ApiError(400, "Please login to create a tweet")
    }

    const tweet = await Tweet.create({
        owner: req.user._id,
        content
    })

    if (!tweet) {
        throw new ApiError(500, "Something went wrong while creating tweet")
    }

    return res.status(200).json(new ApiResponse(200, "Tweet created successfully", tweet))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { username } = req.params
    if (!username || username.trim() === "") {
        throw new ApiError(400, "Username is required")
    }

    const user = await User.findOne({ username })

    if (!user) {
        throw new ApiError(400, "User not found")
    }

    const tweets = await Tweet.find({ owner: user._id }).populate("owner", "avatar username")
    
    if (!tweets || tweets.length === 0) {
        throw new ApiError(400, "User has no tweets")
    }

    return res.status(200).json(new ApiResponse(200, "Tweets fetched successfully", tweets))
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { content } = req.body

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Tweet ID is required")
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Tweet cannot be empty")
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(400, "Tweet not found")
    }
    if (req?.user?._id.toString() !== tweet.owner.toString()) {
        throw new ApiError(403, "User is not owner of the tweet")
    }

    tweet.content = content
    const updated = await tweet.save({ validateBeforeSave: false })

    return res.status(200).json(new ApiResponse(200, "Tweet updated successfully", updated))
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Tweet ID is required")
    }
    
    const tweet = await Tweet.findById(tweetId)
    if (req?.user?._id.toString() !== tweet.owner.toString()) {
        throw new ApiError(403, "User is not owner of the tweet")
    }

    await Tweet.findByIdAndDelete(tweetId)

    return res.status(200).json(new ApiResponse(200, "Tweet deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}