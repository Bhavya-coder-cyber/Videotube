import express from 'express';
import cors from "cors" //We can mention who can talk to backend application or handling middlewares
import cookieParser from 'cookie-parser';

const app = express()

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true
    })
)

//Common Middleware
app.use(express.json({limit: "16kb"})) //fetch data from the website upto limit of 16kb
app.use(express.urlencoded({ extended: true, limit: "16kb"})) //fetch urlencoded data 
app.use(express.static("public")) //fetch all the images in public folder
app.use(cookieParser())

//import routes 
import healthcheckRouter from "./routes/healthcheck.routes.js"
import userRouter from "./routes/user.routes.js"
import { errorHandler } from "./middlewares/error.middlewares.js"
import commentRouter from "./routes/comment.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import videoRouter from "./routes/video.routes.js"
import likeRouter from "./routes/like.routes.js"

// routes
app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/likes", likeRouter)

app.use(errorHandler)


export { app }