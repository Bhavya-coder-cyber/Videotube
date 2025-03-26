import mongoose from "mongoose"
import { Video } from "../models/video.models.js"
import { Subscription } from "../models/subscriptions.models.js"
import { Like } from "../models/like.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const channel = req.user

    if (!channel) {
        throw new ApiError(400, "User should be logged in")
    }

    const videoStats = await Video.aggregate([
        {
            $match: { owner: new mongoose.Types.ObjectId(channel._id) }
        }, {
            $group: {
                _id: null,
                totalViews: { $sum: "$views" },
                totalVideos: { $sum: 1 }
            }
        }
    ])
    const { totalVideos, totalViews } = videoStats[0] || { totalVideos: 0, totalViews: 0 }

    const subscriberStats = await Subscription.aggregate([
        {
            $match: { channel: new mongoose.Types.ObjectId(channel._id) }
        }, {
            $group: {
                _id: null,
                total: { $sum: 1 }
            }
        }
    ])
    const { subscriberCount: totalSubscribers } = subscriberStats[0] || { subscriberCount: 0 }

    const likeStats = await Like.aggregate([
        {
            $match: { video: { $ne: null } }
        }, {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video"
            }
        }, {
            $addFields: {
                videoOwner: {
                    $first: "$video.owner"
                }
            }
        }, {
            $match: {
                "videoOwner": new mongoose.Types.ObjectId(channel._id)
            }
        }, {
            $count: "totalLikes"
        }
    ])

    const { totalLikes } = likeStats[0] || { totalLikes: 0 }

    const channelStats = {
        totalViews,
        totalVideos,
        totalSubscribers,
        totalLikes
    }

    return res.status(200).json(new ApiResponse(200, "Channel stats fetched successfully", channelStats))
})

const getChannelVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc" } = req.query
    page = parseInt(page)
    limit = parseInt(limit)

    if (NaN(page) || page < 1) page = 1;
    if (NaN(limit) || limit < 10) limit = 10;

    const matchstage = {};
    if (query) {
        matchstage.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
        ]
    }

    if (req?.user?._id && mongoose.Types.ObjectId.isValid(req?.user?._id)) {
        matchstage.owner = mongoose.Types.ObjectId(req?.user?._id)
    }

    const sortStage = {};
    sortStage[sortBy] = "asc" ? 1 : -1

    const videos = await Video.aggregate([
        {
            $match: matchstage
        }, {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        }, {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        }, {
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
        }, {
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

export {
    getChannelStats,
    getChannelVideos
}