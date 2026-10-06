const express = require('express');
const {
  issueBook, listLoans, returnBook, renewBook, payFine, listFines
} = require('../controllers/loanController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.get('/', listLoans);
router.get('/fines', listFines);
router.post('/', authorize('ADMIN', 'LIBRARIAN'), issueBook);
router.post('/:id/return', authorize('ADMIN', 'LIBRARIAN'), returnBook);
router.post('/:id/renew', authorize('ADMIN', 'LIBRARIAN'), renewBook);
router.post('/fines/:id/pay', authorize('ADMIN', 'LIBRARIAN'), payFine);

module.exports = router;
