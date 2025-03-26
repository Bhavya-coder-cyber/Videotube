import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.models.js"
import { Subscription } from "../models/subscriptions.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Channel ID is required")
    }
    if (channelId.toString() === req?.user?._id) {
        throw new ApiError(400, "You cannot subscribe to yourself")
    }
    const subscriberCheck = await Subscription.findOne({
        subscriber: req?.usr?._id,
        channel: channelId
    });

    if (!subscriberCheck) {
        try {
            const newSubscriber = await Subscription.create({
                subscriber: req?.user?._id,
                channel: channelId
            })
            return res.status(200).json(new ApiResponse(200, "Subscribed successfully", newSubscriber))
        } catch (error) {
            throw new ApiError(500, "Error subscribing to channel")
        }
    } 
    try {
        await Subscription.findbyIdAndDelete(subscriberCheck?._id)
        return res.status(200).json(new ApiResponse(200, "Unsubscribed successfully"))
    } catch (error) {
        throw new ApiError(500, "Error unsubscribing from channel")
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Channel ID is required")
    }
    if (channelId.toString() !== req?.user?._id) {
        throw new ApiError(400, "You are not authorized to view subscribers of this channel")
    }

    const channel = await User.findById(channelId)
    if (!channel) {
        throw new ApiError(400, "Channel not found")
    }

    const subscribers = await Subscription.find({channel: channelId}).populate("subscriber", "_id username email avatar").select("_id subscriber")

    if (subscribers.length === 0) {
        return res.status(200).json(new ApiResponse(200, "No subscribers found", subscribers))
    }

    const subscriberList = subscribers.map(subscriber => subscriber.subscriber) //The map method returns a new array containing the values of the subscriber property from each object in subscriberList.

    return res.status(200).json(new ApiResponse(200, "Subscribers fetched successfully", subscriberList))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
        throw new ApiError(400, "Subscriber ID is required")
    }

    if (subscriberId.toString() !== req?.user?._id) {
        throw new ApiError(400, "You are not authorized to view subscribed channels")
    }

    const subscriber = await User.findById(subscriberId)

    if (!subscriber) {
        throw new ApiError(400, "Subscriber not found")
    }

    const channelList = await Subscription.find({
        subscriber: subscriberId
    }).populate("channel", "_id username avatar").select("_id channel")

    if (channelList.length === 0) {
        return res.status(200).json(new ApiResponse(200, "No channels found", channelList))
    }

    const channels = channelList.map(channel => channel.channel)

    return res.status(200).json(new ApiResponse(200, "Subscribed channels fetched successfully", channels))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}