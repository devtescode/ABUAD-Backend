
const express = require("express");

const {
    getAllReviews, hideReview, unhideReview
} = require("../Controllers/adminreviews.controllers");
const { adminAuth } = require("../middleware/adminauth");
const router = express.Router();

router.get(
    "/allreviews",
    adminAuth,
    getAllReviews
);

router.patch(
    "/:id/hide",
    adminAuth,
    hideReview
);
router.patch(
    "/:id/unhide",
    adminAuth,
    unhideReview
);


module.exports = router;

