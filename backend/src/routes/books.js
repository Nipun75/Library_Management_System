const express = require('express');
const {
  listBooks, getBook, createBook, updateBook, deleteBook
} = require('../controllers/bookController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.get('/', listBooks);
router.get('/:id', getBook);
router.post('/', authorize('ADMIN', 'LIBRARIAN'), createBook);
router.put('/:id', authorize('ADMIN', 'LIBRARIAN'), updateBook);
router.delete('/:id', authorize('ADMIN'), deleteBook);

module.exports = router;
