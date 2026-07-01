const router = require('express').Router();
const { getTeam, addMember, removeMember } = require('../../controllers/client/teamController');
const roleCheck = require('../../middleware/client/roleCheck');

router.get('/', roleCheck('farmAdmin', 'manager'), getTeam);
router.post('/', roleCheck('farmAdmin'), addMember);
router.delete('/:id', roleCheck('farmAdmin'), removeMember);

module.exports = router;