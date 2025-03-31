const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const uploadMediaController = require('../controllers/uploadMediaController');
const { authenticate } = require('../../../middleware/authMiddleware');


router.post('/', authenticate, upload.array('files'), uploadMediaController.uploadMedia);

module.exports = router;