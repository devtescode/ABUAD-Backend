const express = require("express")
const { usersignup, login } = require("../Controllers/user.controllers")
const { updateProviderProfile } = require("../Controllers/provider.profile")
const { toggleSavedProvider, getSavedProviders } = require("../Controllers/savedprovider.controller")
const router = express.Router()
const upload = require("../middleware/upload");
const { verifyToken } = require("../middleware/auth");



router.post("/signup", usersignup)
router.post("/login", login)
// router.post("/providerprofile", updateProviderProfile)
router.put(
    "/provider/profile",
    verifyToken,
    upload.single("avatar"),
    updateProviderProfile
);

router.put(
    "/providers/:providerId/save",
    verifyToken,
    toggleSavedProvider
);

router.get(
    "/providers/saved",
    verifyToken,
    getSavedProviders
);




module.exports = router