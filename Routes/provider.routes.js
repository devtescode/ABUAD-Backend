const express = require("express")
const { providerservice, getProviderServices, updateProviderService, deleteProviderService, getApprovedServices, getProviderProfile } = require("../Controllers/provider.service")
const router = express.Router()
const upload = require("../middleware/upload");
const { verifyToken } = require("../middleware/auth");



router.post("/services",
verifyToken, 
upload.single('image'), 
providerservice)

router.get("/services", 
verifyToken, 
getProviderServices);

router.put( "/services/:id", 
verifyToken, 
upload.single("image"), 
updateProviderService);

router.delete( "/services/:id", 
verifyToken, 
deleteProviderService);

router.get( "/approved-services",
verifyToken,
getApprovedServices );

// Customer views provider profile 
router.get( "/profile/:id", 
verifyToken, 
getProviderProfile );

module.exports = router