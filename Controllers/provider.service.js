const dotenv = require("dotenv");
const User = require("../Models/user.models");
const Service = require("../Models/service.models");
const cloudinary = require("../config/cloudinary");
dotenv.config();

module.exports.providerservice = async (req, res) => {
  try {
    const {
      title,
      category,
      price,
      duration,
      description,
    } = req.body;

    // verifyToken should attach the decoded user to req.user
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const providerId = req.user.id;

    // Find the logged-in provider
    const provider = await User.findById(providerId);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider account not found.",
      });
    }

    // Make sure the user is actually a provider
    if (provider.role !== "provider") {
      return res.status(403).json({
        success: false,
        message: "Only providers can create services.",
      });
    }

    // Validate required fields
    if (
      !title?.trim() ||
      !category ||
      !price ||
      !duration?.trim() ||
      !description?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }

    // Make sure an image was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a service image.",
      });
    }

    /*
     * Upload the image stored in Multer memory
     * directly to Cloudinary.
     */
    const uploadImage = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "servicely/services",
            resource_type: "image",
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        stream.end(req.file.buffer);
      });
    };

    const uploadedImage = await uploadImage();

    // Save the service in MongoDB
    const service = await Service.create({
      provider: providerId,
      title: title.trim(),
      category,
      price: Number(price),
      duration: duration.trim(),
      description: description.trim(),

      // Save Cloudinary URL
      image: uploadedImage.secure_url,

      // New services require admin approval
      status: "pending",
    });
    console.log("Service created:", service);

    return res.status(201).json({
      success: true,
      message: "Service created successfully.",
      service,
    });
  } catch (error) {
    console.error("Create service error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create service.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

