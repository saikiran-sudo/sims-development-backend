const express = require('express');
const router = express.Router();
const Class = require('../../models/AcademicSchema/Class');
const classController = require('../../controllers/Academics/classController');
const { protect, checkRole } = require('../../middlewares/authMiddleware');
const { validateObjectId } = require('../../utils/validationUtils');


router.post(
  '/',
  protect,
  checkRole('admin', 'superadmin','teacher'),
  classController.createClass
);


router.get(
  '/',
  protect,
  checkRole('admin', 'superadmin', 'teacher', 'student'),
  classController.getAllClasses
);

router.get('/under-my-admin', protect, checkRole('teacher'), classController.getAllClassesUnderMyAdmin);

// Get sections for teacher's assigned classes
router.get('/sections/under-my-admin', protect, checkRole('teacher'), classController.getSectionsForTeacherClasses);

// Get predefined sections for different grades
router.get(
  '/sections',
  protect,
  checkRole('admin', 'superadmin', 'teacher', 'student'),
  classController.getPredefinedSections
);

// Get only class names and IDs (for dropdowns, etc.)
router.get('/names/all', async (req, res) => {
  try {
    const classes = await Class.find({}, 'class_name');
    console.log('classes ', classes);
    res.json(classes); 
    
    
    // const classNames = classes.map(c => c.class_name);
    // res.json(classNames);
  } catch (error) {
    console.log('error ', error);
    res.status(500).json({ message: error.message });
  }
});

router.get(
  '/:id',
  protect,
  checkRole('admin', 'superadmin', 'teacher', 'student'),
  validateObjectId('id'),
  classController.getClassById
);


router.put(
  '/:id',
  protect,
  checkRole('admin', 'superadmin','teacher'),
  validateObjectId('id'),
  classController.updateClass
);


router.delete(
  '/:id',
  protect,
  checkRole('admin', 'superadmin','teacher'),
  validateObjectId('id'),
  classController.deleteClass
);

module.exports = router;
