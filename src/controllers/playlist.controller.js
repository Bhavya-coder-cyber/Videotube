import mongoose, { isValidObjectId, mongo } from "mongoose"
import { Playlist } from "../models/playlist.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body

    if (!name || name.trim() === "") {
        throw new ApiError(400, "Name is required")
    }

    if (!description || description.trim() === "") {
        description = ""
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req?.user?._id
    })

    if (!playlist) {
        throw new ApiError(500, "Something went wrong while creating playlist")
    }

    return res.status(200).json(new ApiResponse(200, "Playlist created successfully", playlist))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "User ID is required")
    }

    const userPlaylist = await Playlist.find({ owner: userId }).populate("videos", "title thumbnail")

    if (videos.length === 0) {
        throw new ApiError(400, "User has no playlists")
    }

    return res.status(200).json(new ApiResponse(200, "Playlists fetched successfully", userPlaylist))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Playlist ID is required")
    }
    const userPlaylist = await Playlist.findById(playlistId).populate("videos", "title thumbnail")

    if (!userPlaylist) {
        throw new ApiError(400, "Playlist not found")
    }

    return res.status(200).json(new ApiResponse(200, "Playlist fetched successfully", userPlaylist))

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Playlist ID and Video ID is required")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(400, "Playlist not found")
    }
    if (req?.user?._id.toString() !== playlist.owner.toString()) {
        throw new ApiError(403, "User is not owner of the playlist. Hence you are not allowed to update the playlist")
    }
    const videoExists = await Videos.exists({ _id: videoId })

    if (!videoExists) {
        throw new ApiError(400, "Video not found")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        { _id: playlistId, owner: req?.user?._id },
        { $addToSet: { videos: videoId } },
        { new: true }
    )
    if (!updatePlaylist) {
        throw new ApiError(500, "Something went wrong while adding video to playlist")
    }

    return res.status(200).json(new ApiResponse(200, "Video added to playlist successfully", updatedPlaylist))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Playlist ID and Video ID is required")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(400, "Playlist not found")
    }
    if (req?.user?._id.toString() !== playlist.owner.toString()) {
        throw new ApiError(403, "User is not owner of the playlist. Hence you are not allowed to update the playlist")
    }

    if (!playlist.videos.includes(videoId)) {
        throw new ApiError(400, "Video not found in playlist")
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        { _id: playlistId, owner: req?.user?._id },
        { $pull: { videos: videoId } },
        { new: true }
    )
    if (!updatePlaylist) {
        throw new ApiError(500, "Something went wrong while removing video from playlist")
    }

    return res.status(200).json(new ApiResponse(200, "Video removed from playlist successfully", updatedPlaylist))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Playlist ID is required")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(400, "Playlist not found")
    }
    if (req?.user?._id.toString() !== playlist.owner.toString()) {
        throw new ApiError(403, "User is not owner of the playlist. Hence you are not allowed to delete the playlist")
    }

    await Playlist.findByIdAndDelete(playlistId)

    return res.status(200).json(new ApiResponse(200, "Playlist deleted successfully", {}))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Playlist ID is required")
    }
    if (!name || name.trim() === "") {
        throw new ApiError(400, "Name is required")
    }
    if (!description || description.trim() === "") {
        description = ""
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(400, "Playlist not found")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        { _id: playlistId, owner: req?.user?._id },
        {
            $set: {
                name,
                description
            }
        },
        { new: true }
    )
    if (!updatePlaylist) {
        throw new ApiError(500, "Something went wrong while updating playlist")
    }

    return res.status(200).json(new ApiResponse(200, "Playlist updated successfully", updatedPlaylist))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}