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

    // ========================================================
    // CHECK AUTHENTICATION
    // ========================================================

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const providerId = req.user.id;

    // ========================================================
    // FIND LOGGED-IN USER
    // ========================================================

    const provider = await User.findById(providerId);
    // console.log("Logged-in provider:", provider);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider account not found.",
      });
    }

    // ========================================================
    // CHECK USER ROLE
    // ========================================================

    if (provider.role !== "provider") {
      return res.status(403).json({
        success: false,
        message: "Only providers can create services.",
      });
    }

    // ========================================================
    // CHECK PROVIDER ACCOUNT STATUS
    // ========================================================

    // Pending provider
    if (provider.status === "pending") {
      console.log("Provider status pending:", provider.status);
      return res.status(403).json({
        success: false,
        code: "PROVIDER_PENDING",
        message:
          "Your provider account is still pending verification. You cannot add services until an administrator approves your account.",
      });
    }

    // Rejected provider
    if (provider.status === "rejected") {
      console.log("Provider status rejected:", provider.status);
      return res.status(403).json({
        success: false,
        code: "PROVIDER_REJECTED",
        message:
          "Your provider application was rejected. You cannot add services. Please contact the administrator for more information.",
      });
    }

    // Suspended provider
    if (provider.status === "suspended") {
      return res.status(403).json({
        success: false,
        code: "PROVIDER_SUSPENDED",
        message:
          "Your provider account is suspended. You cannot create a service.",
      });
    }

    // Only approved providers can create services
    if (provider.status !== "active") {
      return res.status(403).json({
        success: false,
        code: "PROVIDER_NOT_APPROVED",
        message:
          "Your provider account has not been approved yet. You cannot create services.",
      });
    }

    // ========================================================
    // VALIDATE REQUIRED FIELDS
    // ========================================================

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

    // ========================================================
    // VALIDATE PRICE
    // ========================================================

    const servicePrice = Number(price);

    if (Number.isNaN(servicePrice) || servicePrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid service price.",
        field: "price",
      });
    }

    // ========================================================
    // CHECK SERVICE IMAGE
    // ========================================================

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a service image.",
      });
    }

    // ========================================================
    // UPLOAD IMAGE TO CLOUDINARY
    // ========================================================

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

    // ========================================================
    // CREATE SERVICE
    // ========================================================

    const service = await Service.create({
      provider: providerId,

      title: title.trim(),

      category,

      price: servicePrice,

      duration: duration.trim(),

      description: description.trim(),

      // Cloudinary image URL
      image: uploadedImage.secure_url,

      // Approved providers' services are automatically approved
      status: "approved",
    });

    console.log("Service created:", service._id);

    // ========================================================
    // SUCCESS RESPONSE
    // ========================================================

    return res.status(201).json({
      success: true,
      message: "Service created successfully.",
      service,
    });

  } catch (error) {
    console.error(
      "Create service error:",
      error
    );

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