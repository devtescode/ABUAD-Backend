
const express = require("express");

const {
  getAllReviews
} = require("../Controllers/adminreviews.controllers");
const { adminAuth } = require("../middleware/adminauth");
const router = express.Router();

router.get(
  "/allreviews",
  adminAuth,
  getAllReviews
);


module.exports = router;

