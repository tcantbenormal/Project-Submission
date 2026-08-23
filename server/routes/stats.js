const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const auth = require('../middleware/auth');

// All stats routes are protected
router.get('/summary', auth, statsController.getSummary);
router.post('/selection', auth, statsController.getSelectionStats);
router.post('/spatial-select', auth, statsController.spatialSelect);
router.post('/zonal', auth, statsController.getZonalStats);

module.exports = router;
