const express = require('express');
const router = express.Router();
const examController = require('../../controllers/Attendance_Performance/examController');
const { protect, checkRole } = require('../../middlewares/authMiddleware');
const { validateObjectId } = require('../../utils/validationUtils');


router.post(
  '/',
  protect,
  checkRole('admin', 'superadmin'),
  examController.createExam
);

router.get(
  '/',
  protect,
  checkRole('admin', 'teacher', 'student', 'parent'),
  examController.getAllExams
);

router.get(
  '/:id',
  protect,
  checkRole('admin', 'teacher', 'student', 'parent'),
  validateObjectId('id'),
  examController.getExamById
);

router.put(
  '/:id',
  protect,
  checkRole('admin', 'superadmin'),
  validateObjectId('id'),
  examController.updateExam
);

router.delete(
  '/:id',
  protect,
  checkRole('admin', 'superadmin'),
  validateObjectId('id'),
  examController.deleteExam
);

module.exports = router;
