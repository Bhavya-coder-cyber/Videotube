import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middlewares.js"
import {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
} from "../controllers/playlist.controller.js"

import { upload } from "../middlewares/multer.middlewares.js"

const router = Router()

router.use(verifyJWT)
router.use(upload.none())

router.route("/").post(createPlaylist)
router.route("/:playlistId").get(getPlaylistById).patch(updatePlaylist).delete(deletePlaylist)
router.route("/add/:playlistId/:videoId").post(addVideoToPlaylist)
router.route("/remove/:playlistId/:videoId").delete(removeVideoFromPlaylist)
router.route("/user/:userId").get(getUserPlaylists)

export default router