import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middlewares.js"
import { createTweet, getUserTweets, updateTweet, deleteTweet } from "../controllers/tweet.controller.js"
import {upload} from "../middlewares/multer.middlewares.js"

const router = Router()

router.use(verifyJWT)
router.use(upload.none())

router.route("/createTweet").post(createTweet)
router.route("/getUserTweets/:username").get(getUserTweets)
router.route("/updateTweet/:tweetId").patch(updateTweet)
router.route("/deleteTweet/:tweetId").delete(deleteTweet)

export default router