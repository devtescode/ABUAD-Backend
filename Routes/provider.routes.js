const express = require("express")
const { providerservice } = require("../Controllers/provider.service")
const router = express.Router()
const upload = require("../middleware/upload");
const { verifyToken } = require("../middleware/auth");



router.post("/services",
verifyToken, 
upload.single('image'), 
providerservice)



module.exports = router