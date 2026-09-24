const express = require("express")
const { getProviderAvailability, updateProviderAvailability, } = require("../Controllers/provider.avaliability");
const router = express.Router()
const { verifyToken } = require("../middleware/auth");


router.get(
    "/getavailability",
    verifyToken,
    getProviderAvailability
);

router.put(
    "/postavailability",
    verifyToken,
    updateProviderAvailability
);



module.exports = router