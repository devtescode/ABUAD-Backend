const express = require("express")
const { adminExists, registerAdmin, loginAdmin } = require("../Controllers/admin.controllers")
// const upload = require("../middleware/upload");
const router = express.Router()



router.get("/exists", adminExists)
router.post("/register", registerAdmin)
router.post("/login", loginAdmin)



module.exports = router