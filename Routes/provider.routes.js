const express = require("express")
const { providerservice, getProviderServices, updateProviderService, deleteProviderService } = require("../Controllers/provider.service")
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

module.exports = router