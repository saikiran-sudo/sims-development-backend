const Class = require('../../models/AcademicSchema/Class');
const Teacher = require('../../models/CoreUser/Teacher');
const mongoose = require('mongoose');


exports.createClass = async (req, res) => {
  try {

    if (!req.body.class_name) {
      return res.status(400).json({
        message: 'Class name is required'
      });
    }

    const classInfo = await Class.findOne({class_name: req.body.class_name,section: req.body.section,admin_id: req.user._id});
    if (classInfo) {
      return res.status(400).json({
        message: 'Class with section already exists',
      });
    }


    const formattedTeachersDetails = req.body.teachers_details?.map(teacher => ({
      ...teacher,
      subjects: Array.isArray(teacher.subjects) ?
        teacher.subjects :
        (teacher.subjects?.split(',').map(s => s.trim()).filter(Boolean) || [])
    })) || [];


    const newClass = new Class({
      class_name: req.body.class_name,
      strength: req.body.strength,
      section: req.body.section,
      supervisor: req.body.supervisor,
      teachers_details: formattedTeachersDetails,
      admin_id: req.user._id,
    });

    await newClass.save();
    res.status(201).json(newClass);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


exports.getAllClasses = async (req, res) => {
  try {

    const filter = {};
    if (req.query.grade) filter.grade = req.query.grade;
    if (req.query.search) {
      filter.$or = [
        { class_name: { $regex: req.query.search, $options: 'i' } },
        { supervisor: { $regex: req.query.search, $options: 'i' } },
        { 'teachers_details.name': { $regex: req.query.search, $options: 'i' } }
      ];
    }


    const classes = await Class.find({ admin_id: req.user._id });
    res.json(classes);

    // const classes = await Class.find(filter).sort({ class_name: 1 });
    // res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getAllClassesUnderMyAdmin = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Get teacher's assigned classes and class teacher role
    const assignedClasses = teacher.assigned_classes || [];
    const classTeacher = teacher.class_teacher;

    // If teacher has assigned classes, filter by those classes
    if (assignedClasses.length > 0 || classTeacher) {
      const classFilter = [];
      
      // Add assigned classes
      if (assignedClasses.length > 0) {
        classFilter.push(...assignedClasses);
      }
      
      // Add class teacher class if different from assigned classes
      if (classTeacher && !assignedClasses.includes(classTeacher)) {
        classFilter.push(classTeacher);
      }
      
      const classes = await Class.find({ 
        admin_id: teacher.admin_id,
        // class_name: { $in: classFilter }
      });
      res.json(classes);
    } else {
      // If no assigned classes, return all classes under the teacher's admin
      // This allows teachers to create assignments for any class under their admin
      const classes = await Class.find({ admin_id: teacher.admin_id });
      res.json(classes);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getClassById = async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid class ID format' });
    }

    const classObj = await Class.findById(req.params.id);
    if (!classObj) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.json(classObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.updateClass = async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid class ID format' });
    }


    const formattedTeachersDetails = req.body.teachers_details?.map(teacher => ({
      ...teacher,
      subjects: Array.isArray(teacher.subjects) ?
        teacher.subjects :
        (teacher.subjects?.split(',').map(s => s.trim()).filter(Boolean) || [])
    })) || [];

    const updated = await Class.findByIdAndUpdate(
      req.params.id,
      {
        class_name: req.body.class_name,
        strength: req.body.strength,
        section: req.body.section,
        supervisor: req.body.supervisor,
        teachers_details: formattedTeachersDetails
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


exports.deleteClass = async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid class ID format' });
    }

    const deleted = await Class.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getClassesByGrade = async (req, res) => {
  try {
    const classes = await Class.find({ grade: req.params.grade })
      .sort({ class_name: 1 });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getClassesBySubject = async (req, res) => {
  try {
    const subject = req.params.subject.toLowerCase();
    const classes = await Class.find({
      'teachers_details.subjects': {
        $elemMatch: { $regex: subject, $options: 'i' }
      }
    });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getClassNames = async (req, res) => {
  console.log("getClassNames");
  try {
    const classes = await Class.find({}, { class_name: 1 }).sort({ class_name: 1 });

    const result = classes.map(cls => ({ value: cls._id, label: cls.class_name }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPredefinedSections = async (req, res) => {
  try {
    const { grade } = req.query;
    
    // Define predefined sections for different grades
    const predefinedSections = {
      'Nursery': ['Morning Batch', 'Afternoon Batch'],
      'LKG': ['Morning Batch', 'Afternoon Batch'],
      'UKG': ['Morning Batch', 'Afternoon Batch'],
      'Class 1': ['A', 'B', 'C', 'D', 'E', 'F'],
      'Class 2': ['A', 'B', 'C', 'D', 'E', 'F'],
      'Class 3': ['A', 'B', 'C', 'D', 'E', 'F'],
      'Class 4': ['A', 'B', 'C', 'D', 'E', 'F'],
      'Class 5': ['A', 'B', 'C', 'D', 'E', 'F'],
      'Class 6': ['A', 'B', 'C', 'D', 'E', 'F'],
      'Class 7': ['A', 'B', 'C', 'D', 'E', 'F'],
      'Class 8': ['A', 'B', 'C', 'D', 'E', 'F'],
      'Class 9': ['A', 'B', 'C', 'D', 'E', 'F'],
      'Class 10': ['A', 'B', 'C', 'D', 'E', 'F']
    };

    if (grade && predefinedSections[grade]) {
      res.json(predefinedSections[grade]);
    } else {
      // Return all sections if no specific grade is requested
      res.json(predefinedSections);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSectionsForTeacherClasses = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Get teacher's assigned classes and class teacher role
    const assignedClasses = teacher.assigned_classes || [];
    const classTeacher = teacher.class_teacher;

    // If teacher has assigned classes, get sections for those classes
    if (assignedClasses.length > 0 || classTeacher) {
      const classFilter = [];
      
      // Add assigned classes
      if (assignedClasses.length > 0) {
        classFilter.push(...assignedClasses);
      }
      
      // Add class teacher class if different from assigned classes
      if (classTeacher && !assignedClasses.includes(classTeacher)) {
        classFilter.push(classTeacher);
      }
      
      // Get classes and extract unique sections
      const classes = await Class.find({ 
        admin_id: teacher.admin_id,
        class_name: { $in: classFilter }
      });
      
      // Extract unique sections from the classes
      const sections = [...new Set(classes.map(cls => cls.section))].sort();
      
      res.json(sections);
    } else {
      // If no assigned classes, return empty array
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};