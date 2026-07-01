const router = require('express').Router();
const { chat } = require('../../controllers/client/aiController');

router.post('/chat', chat);

module.exports = router;