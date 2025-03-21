import mongoose from "mongoose"
import { Comment } from "../models/comment.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!videoId) {
        throw new ApiError(400, "Video ID is rquired")
    }

    page = parseInt(page)
    limit = parseInt(limit)

    const comments = await Comment.aggregate(
        [
            {
                $match: {
                    video: mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner"
                }
            },
            {
                $addFields: {
                    owner: {
                        $first: "$owner"
                    }
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $project: {
                    video: 1,
                    content: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    owner: {
                        _id: 1,
                        username: 1,
                        avatar: 1
                    }
                }
            }
        ]
    )
    const options = {
        page,
        limit
    }

    const paginateComments = await Comment.aggregatePaginate(comments, options) //Pagination in MongoDB is a technique used to divide a large dataset into smaller, more manageable pieces that can be displayed or processed efficiently. The basic idea behind pagination is to retrieve a limited number of records from a dataset at a time instead of retrieving the entire dataset at once.

    return res.status(200).json(new ApiResponse(200, "Comments fetched successfully", paginateComments))

})

const addComment = asyncHandler(async (req, res) => {
    const { video } = req.params
    const user = req.user
    const { comment } = req.body

    if (!video) {
        throw new ApiError(400, "Video ID is required")
    }
    if (!user) {
        throw new ApiError(400, "User is required")
    }

    const createComment = await Comment.create(
        {
            video,
            owner: new mongoose.Types.ObjectId(user._id),
            comment
        }
    )

    return res.status(200).json(new ApiResponse(200, "Comment added successfully", createComment))


})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { content } = req.body

    if (!commentId) {
        throw new ApiError(400, "Comment ID is required")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(400, "Comment not found")
    }
    if (!comment.owner.equals(req.user._id)) {
        throw new ApiError(403, "User is not owner of the comment")
    }

    if (content?.value.trim() === "") {
        throw new ApiError(400, "Comment cannot be empty")
    }

    const updateComment = await Comment.findByIdAndUpdate(req.user?._id, {
        $set: {
            comment: content.value
        }
    },
        { new: true }
    )

    return res.status(200).json(new ApiResponse(200, "Comment updated successfully", updateComment))
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!commentId) {
        throw new ApiError(400, "Comment ID is required")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(400, "Comment not found")
    }
    if (!comment.owner.equals(req.user._id)) {
        throw new ApiError(403, "User is not owner of the comment")
    }

    await Comment.findByIdAndDelete(commentId)

    return res.status(200).json(new ApiResponse(200, "Comment deleted successfully"))
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}