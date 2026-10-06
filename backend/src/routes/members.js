const express = require('express');
const {
  listMembers,
  getMember,
  createMember,
  updateMember,
  deactivateMember
} = require('../controllers/memberController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', listMembers);
router.get('/:id', getMember);
router.post('/', authorize('ADMIN', 'LIBRARIAN'), createMember);
router.put('/:id', authorize('ADMIN', 'LIBRARIAN'), updateMember);
router.delete('/:id', authorize('ADMIN', 'LIBRARIAN'), deactivateMember);

module.exports = router;
