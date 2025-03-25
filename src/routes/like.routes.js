import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middlewares.js"
import { toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos } from "../controllers/like.controller.js"

const router = Router()

router.use(verifyJWT)

router.route("/toggleV/:videoId").patch(toggleVideoLike)
router.route("/toggleT/:tweetId").patch(toggleTweetLike)
router.route("/toggleC/:commentId").patch(toggleCommentLike)
router.route("/videos").get(getLikedVideos)

export default router