const express = require('express');
const router = express.Router();
const multer = require('multer');
const importController = require('../controllers/importController');

const upload = multer({ dest: 'uploads/' });

router.post('/import', upload.single('file'), importController.importCSV);

// Dummy endpoints for completeness
router.get('/groups', (req, res) => res.json([]));
router.get('/expenses', (req, res) => res.json([]));
router.get('/balances', (req, res) => res.json([]));

module.exports = router;
