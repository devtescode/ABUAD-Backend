const Portfolio = require("../Models/portfolio.models");
const User = require("../Models/user.models");
const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");


// ========================================================
// GET MY PORTFOLIO
//
// GET /provider/portfolio
// ========================================================

module.exports.getMyPortfolio = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const providerId = req.user.id;

    const provider = await User.findOne({
      _id: providerId,
      role: "provider",
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider account not found.",
      });
    }

    const portfolio = await Portfolio.find({
      provider: providerId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: portfolio.length,
      portfolio,
    });
  } catch (error) {
    console.error(
      "Get provider portfolio error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch portfolio.",
    });
  }
};


// ========================================================
// ADD PORTFOLIO WORK
//
// POST /provider/portfolio
//
// Content-Type: multipart/form-data
//
// Fields:
// title
// category
// description
// image
// ========================================================

module.exports.addPortfolio = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const providerId = req.user.id;

    const provider = await User.findOne({
      _id: providerId,
      role: "provider",
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider account not found.",
      });
    }

    // Provider must be active before posting portfolio work
    if (provider.status === "pending") {
      return res.status(403).json({
        success: false,
        code: "PROVIDER_PENDING",
        message:
          "Your provider account is still pending verification. You cannot post portfolio work until your account is approved.",
      });
    }

    if (provider.status === "rejected") {
      return res.status(403).json({
        success: false,
        code: "PROVIDER_REJECTED",
        message:
          "Your provider account has been rejected. You cannot post portfolio work.",
      });
    }

    if (provider.status === "suspended") {
      return res.status(403).json({
        success: false,
        code: "PROVIDER_SUSPENDED",
        message:
          "Your provider account is suspended. You cannot post portfolio work.",
      });
    }

    if (provider.status !== "active") {
      return res.status(403).json({
        success: false,
        code: "PROVIDER_NOT_ACTIVE",
        message:
          "Your provider account is not active. You cannot post portfolio work.",
      });
    }

    const {
      title,
      category,
      description,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Portfolio title is required.",
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: "Portfolio category is required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Portfolio image is required.",
      });
    }

    // ====================================================
    // CLOUDINARY UPLOAD
    // ====================================================

    const uploadedImage = await new Promise(
      (resolve, reject) => {
        const stream =
          cloudinary.uploader.upload_stream(
            {
              folder: "servicely/portfolio",
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
      }
    );

    const portfolio = await Portfolio.create({
      provider: providerId,
      title: title.trim(),
      category: category.trim(),
      description: description
        ? description.trim()
        : "",
      image: uploadedImage.secure_url,
      imagePublicId: uploadedImage.public_id,
    });

    return res.status(201).json({
      success: true,
      message: "Portfolio work added successfully.",
      portfolio,
    });
  } catch (error) {
    console.error(
      "Add portfolio error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to add portfolio work.",
      error: error.message,
    });
  }
};


// ========================================================
// DELETE PORTFOLIO WORK
//
// DELETE /provider/portfolio/:id
// ========================================================

module.exports.deletePortfolio = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid portfolio ID.",
      });
    }

    const portfolio =
      await Portfolio.findOne({
        _id: id,
        provider: req.user.id,
      });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message:
          "Portfolio work not found or does not belong to you.",
      });
    }

    // ====================================================
    // DELETE IMAGE FROM CLOUDINARY
    // ====================================================

    if (portfolio.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(
          portfolio.imagePublicId,
          {
            resource_type: "image",
          }
        );
      } catch (cloudinaryError) {
        console.error(
          "Cloudinary delete error:",
          cloudinaryError
        );
      }
    }

    await Portfolio.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message:
        "Portfolio work deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete portfolio error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete portfolio work.",
    });
  }
};


module.exports.getProviderPortfolio = async (req, res) => {
  try {
    const { providerId } = req.params;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Provider ID is required.",
      });
    }

    const provider = await User.findOne({
      _id: providerId,
      role: "provider",
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found.",
      });
    }

    const portfolio = await Portfolio.find({
      provider: providerId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: portfolio.length,
      portfolio,
    });
  } catch (error) {
    console.error(
      "Get provider portfolio error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider portfolio.",
    });
  }
};