import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from "dotenv"
import { console } from 'inspector';

dotenv.config()

//configure cloudinary
cloudinary.config({
  cloud_name: 'dhp6zvfcs',
  api_key: '279122264224116',
  api_secret: 'OD275KEY4Dvikt7ZvU2ANqOqaps'
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(
            localFilePath, {
                resource_type: "auto"
            }
        )
        console.log("File uploaded on cloudinary. File src: " + response.url)
        //once the file is uploaded, we would like to delete from our server
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        console.log("Error on Cloudinary ", error)
        fs.unlinkSync(localFilePath) //Removes our file from the cloudinary
        return null
    }
}

const deleteOnCloudinary = async (public_id) => {
    try {
        await cloudinary.uploader.destroy(public_id);
        console.log("File deleted on cloudinary.") 
    } catch (error) {
        console.log("Error on Cloudinary ", error)
        return null
    }
}

export {uploadOnCloudinary, deleteOnCloudinary}