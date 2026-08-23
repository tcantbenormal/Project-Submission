const express = require('express');
const router = express.Router();
const geodataController = require('../controllers/geodataController');
const auth = require('../middleware/auth');

// All geodata routes are protected
router.get('/cities', auth, geodataController.getCities);
router.get('/boundaries', auth, geodataController.getBoundaries);
router.get('/buildings', auth, geodataController.getBuildings);
router.get('/solarpv', auth, geodataController.getSolarPV);
router.get('/extent', auth, geodataController.getExtent);

module.exports = router;
