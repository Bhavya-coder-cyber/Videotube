import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middlewares.js"
import { getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus } from "../controllers/video.controller.js"
import {upload} from "../middlewares/multer.middlewares.js"

const router = Router()

router.use(verifyJWT)

router.route("/").post(upload.fields([
    {
        name: "video", 
        maxCount: 1
    },{
        name: "thumbnail",
        maxCount: 1
    }
]), publishAVideo).get(getAllVideos)

router.route("/:videoId").get(getVideoById).patch(upload.single("thumbnail"),updateVideo).delete(deleteVideo)
router.route("/toggle/:videoId").patch(togglePublishStatus)

export default router