import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middlewares.js"
import { getVideoComments, addComment, updateComment, deleteComment } from "../controllers/comment.controller.js"
import {upload} from "../middlewares/multer.middlewares.js"

const router = Router()

router.use(verifyJWT)
router.use(upload.none()) //To avoid file input in the comments

router.route("/getComments").get(getVideoComments)
router.route("/addComment").post(addComment)
router.route("/updateComment").patch(updateComment)
router.route("/deleteComment").delete(deleteComment)

export default router