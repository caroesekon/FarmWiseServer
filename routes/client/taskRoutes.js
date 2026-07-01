const router = require('express').Router();
const { getTasks, createTask, updateTask } = require('../../controllers/client/taskController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', getTasks);
router.post('/', roleCheck('farmAdmin', 'manager'), createTask);
router.put('/:id', updateTask);

module.exports = router;