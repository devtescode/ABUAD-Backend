const express = require("express");
const router = express.Router();
const {
  getMyPortfolio,
  addPortfolio,
  deletePortfolio,
  getProviderPortfolio
} = require("../Controllers/provider.portfolio");
const upload = require("../middleware/upload");
const { verifyToken } = require("../middleware/auth");


// ========================================================
// GET MY PORTFOLIO
// ========================================================

router.get(
  "/allportfolio",
  verifyToken,
  getMyPortfolio
);

// router.get(
//   "/getproviderportfolio/:id",
//   verifyToken,
//   getProviderPortfolio
// );

router.get(
  "/provider/:providerId",
  verifyToken,
  getProviderPortfolio
);

// ========================================================
// ADD PORTFOLIO WORK
// ========================================================

router.post(
  "/allportfolio",
  verifyToken,
  upload.single("image"),
  addPortfolio
);

// ========================================================
// DELETE PORTFOLIO WORK
// ========================================================

router.delete(
  "/allportfolio/:id",
  verifyToken,
  deletePortfolio
);

module.exports = router;