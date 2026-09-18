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

    // Suspended providers cannot create services
    if (provider.status === "suspended") {
      return res.status(403).json({
        success: false,
        message:
          "Your provider account is suspended. You cannot create a service.",
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

    /*
     * Provider has been approved if their account status
     * is active, so every new service is automatically approved.
     */
    const service = await Service.create({
      provider: providerId,
      title: title.trim(),
      category,
      price: Number(price),
      duration: duration.trim(),
      description: description.trim(),

      // Save Cloudinary URL
      image: uploadedImage.secure_url,

      // Automatically approve services from active providers
      status: "approved",
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





// ==========================================
// GET PROVIDER SERVICES
// ==========================================

module.exports.getProviderServices = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const providerId = req.user.id;

    const services = await Service.find({
      provider: providerId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      services,
    });
  } catch (error) {
    console.error("Get provider services error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch services.",
    });
  }
};




module.exports.updateProviderService = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const providerId = req.user.id;
    const serviceId = req.params.id;

    // Find service
    const service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    // Make sure this service belongs to the logged-in provider
    if (service.provider.toString() !== providerId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to edit this service.",
      });
    }

    const {
      title,
      category,
      price,
      duration,
      description,
    } = req.body;

    // Update normal fields
    if (title !== undefined) {
      service.title = title.trim();
    }

    if (category !== undefined) {
      service.category = category;
    }

    if (price !== undefined) {
      const numericPrice = Number(price);

      if (isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid price.",
        });
      }

      service.price = numericPrice;
    }

    if (duration !== undefined) {
      service.duration = duration.trim();
    }

    if (description !== undefined) {
      service.description = description.trim();
    }

    // ==========================================
    // UPDATE IMAGE IF NEW IMAGE WAS PROVIDED
    // ==========================================

    if (req.file) {
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

      service.image = uploadedImage.secure_url;
    }

    // Save changes
    await service.save();

    return res.status(200).json({
      success: true,
      message: "Service updated successfully.",
      service,
    });
  } catch (error) {
    console.error("Update service error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update service.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};


// ==========================================
// DELETE PROVIDER SERVICE
// ==========================================

module.exports.deleteProviderService = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const providerId = req.user.id;
    const serviceId = req.params.id;

    // Find service
    const service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    // Make sure the service belongs to the logged-in provider
    if (service.provider.toString() !== providerId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this service.",
      });
    }

    // Delete service from database
    await Service.findByIdAndDelete(serviceId);

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully.",
    });
  } catch (error) {
    console.error("Delete service error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete service.",
    });
  }
};



// Get all services for customers
module.exports.getApprovedServices = async (req, res) => {
  try {
    const services = await Service.find({})
      .populate(
        "provider",
        "fullName name avatar profileImage categories"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      services,
    });
  } catch (error) {
    console.error("Get all services error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch services.",
    });
  }
};

// Get provider profile
module.exports.getProviderProfile = async (req, res) => {
  console.log(
    "Fetching provider profile for ID:",
    req.params.id
  );

  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Provider ID is required.",
      });
    }

    const provider = await User.findOne({
      _id: id,
      role: "provider",
    }).select(
      "-password -resetPasswordToken -resetPasswordExpires"
    );

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found.",
      });
    }

    if (provider.status === "suspended") {
      return res.status(403).json({
        success: false,
        message:
          "This provider is currently unavailable.",
      });
    }

    // TEMPORARY: remove status filtering
    const services = await Service.find({
      provider: id,
    }).sort({
      createdAt: -1,
    });

    console.log("=================================");
    console.log("PROVIDER ID:", id);
    console.log("PROVIDER:", provider._id);
    console.log("SERVICES FOUND:", services.length);
    console.log("SERVICES:", services);
    console.log("=================================");

    return res.status(200).json({
      success: true,
      provider,
      services,
      reviews: [],
    });
  } catch (error) {
    console.error(
      "Get provider profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider profile.",
    });
  }
};