const Assignment = require('../../models/AcademicSchema/Assignment');
const mongoose = require('mongoose');
const Teacher = require('../../models/CoreUser/Teacher');
const Student = require('../../models/CoreUser/Student');
const Class = require('../../models/AcademicSchema/Class');
const Admin = require('../../models/CoreUser/Admin');

exports.createAssignment = async (req, res) => {
  try {

    const adminId = await Admin.findOne({ users: req.user._id });
    if (!adminId) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const classId = await Class.find({ admin_id: adminId.users, class_name: req.body.class, section: req.body.section });

    if (!classId[0]._id) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const newAssignment = new Assignment({
      class: classId[0]._id,
      subject: req.body.subject,
      title: req.body.title,
      description: req.body.description,
      dueDate: req.body.dueDate,
      section: req.body.section,
      file: req.body.file,
      admin_id: adminId.users
    });
    const savedAssignment = await newAssignment.save();
    res.status(201).json(savedAssignment);
  } catch (error) {
    console.error("Error creating assignment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createAssignmentUnderMyAdmin = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Validate required fields
    if (!req.body.subject) {
      return res.status(400).json({ message: 'Subject is required' });
    }

    // Get teacher's assigned classes and class teacher role
    const assignedClasses = teacher.assigned_classes || [];
    const classTeacher = teacher.class_teacher;

    // Check if the teacher is trying to create assignment for a class they're assigned to
    const Class = require('../../models/AcademicSchema/Class');
    const targetClass = await Class.findById(req.body.class);

    if (!targetClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if teacher has permission for this class
    // const hasPermission = assignedClasses.includes(targetClass.class_name) || 
    //                      (classTeacher && classTeacher === targetClass.class_name);


    req.body.admin_id = teacher.admin_id;
    req.body.teacher_id = teacher._id; // Set the teacher_id to the current teacher

    const newAssignment = new Assignment(req.body);
    const savedAssignment = await newAssignment.save();

    // Populate the saved assignment to return complete data
    const populatedAssignment = await Assignment.findById(savedAssignment._id)
      .populate("class", "class_name")
      .populate("subject", "name");

    res.status(201).json(populatedAssignment);
  } catch (error) {
    console.error("Error creating assignment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.getAllAssignments = async (req, res) => {
  try {
    let filter = {};


    // If user is a student, filter by class and section without admin_id restriction
    if (req.user.role === 'student') {
      // Use the user's class_id and section from their profile
      const userClassId = req.user.class_id;
      const userSection = req.user.section;

      if (userClassId) {
        // Handle both class ID and class name
        const Class = require('../../models/AcademicSchema/Class');

        // First try to find by ObjectId (if it's a valid ObjectId)
        if (mongoose.Types.ObjectId.isValid(userClassId)) {
          filter.class = userClassId;
        } else {
          // If not a valid ObjectId, try to find by class_name
          const classDoc = await Class.findOne({ class_name: userClassId });
          if (classDoc) {
            filter.class = classDoc._id;
          } else {
            console.log('Class not found for:', userClassId);
          }
        }
      }

      if (userSection) {
        filter.section = userSection;
      }

      // Also check query parameters if provided (for backward compatibility)
      if (req.query.class && !userClassId) {
        const Class = require('../../models/AcademicSchema/Class');
        if (mongoose.Types.ObjectId.isValid(req.query.class)) {
          filter.class = req.query.class;
        } else {
          const classDoc = await Class.findOne({ class_name: req.query.class });
          if (classDoc) {
            filter.class = classDoc._id;
          }
        }
      }
      if (req.query.section && !userSection) {
        filter.section = req.query.section;
      }
    } else {
      // For teachers and admins, filter by admin_id
      filter.admin_id = req.user._id;
      if (req.query.class) filter.class = req.query.class;
      if (req.query.section) filter.section = req.query.section;
    }


    const assignments = await Assignment.find(filter)
      .populate("class", "class_name")
      .populate("subject", "name");

    res.status(200).json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
exports.getAllAssignmentsUnderMyAdmin = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Get teacher's assigned classes and class teacher role
    const assignedClasses = teacher.assigned_classes || [];
    const classTeacher = teacher.class_teacher;

    // Build filter based on teacher's assigned classes
    let filter = { admin_id: teacher.admin_id };

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

      // Find class documents to get ObjectIds
      const Class = require('../../models/AcademicSchema/Class');
      const classDocs = await Class.find({
        class_name: { $in: classFilter },
        admin_id: teacher.admin_id
      });

      const classIds = classDocs.map(cls => cls._id);

      if (classIds.length > 0) {
        filter.class = { $in: classIds };
      }
    }

    const assignments = await Assignment.find(filter)
      .populate("class", "class_name")
      .populate("subject", "name");

    res.status(200).json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
exports.getAllAssignmentsUnderStudent = async (req, res) => {
  try {
    const student = await Student.findOne({ users: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Find the class by name since student.class_id is a string
    const classRecord = await Class.findOne({ class_name: student.class_id });
    if (!classRecord) {
      return res.status(404).json({ message: 'Class not found for student' });
    }


    const assignments = await Assignment.find({ class: classRecord._id, section: student.section })
      .populate("class", "class_name")
      .populate("subject", "name");

    res.status(200).json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getAssignmentById = async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid assignment ID format' });
    }

    const assignment = await Assignment.findById(req.params.id)
      .populate("class", "class_name")
      .populate("subject", "name");

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    res.status(200).json(assignment);
  } catch (error) {
    console.error("Error fetching assignment by ID:", error);

    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid assignment ID" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.updateAssignment = async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid assignment ID format' });
    }
    const adminId = await Admin.findOne({ users: req.user._id });
    if (!adminId) {
      return res.status(404).json({ message: 'Admin not found' });
    }


    const classId = await Class.find({ admin_id: adminId.users, class_name: req.body.class, section: req.body.section });
    // Check if user is a teacher and verify permissions
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ users: req.user._id });
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      // Get the assignment to check permissions
      const assignment = await Assignment.findById(req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Check if teacher owns this assignment or has permission for the class
      const assignedClasses = teacher.assigned_classes || [];
      const classTeacher = teacher.class_teacher;

      const Class = require('../../models/AcademicSchema/Class');
      // const targetClass = await Class.findById(assignment.class);
      classId = await Class.find({ admin_id: adminId.users, class_name: req.body.class, section: req.body.section });

      if (!classId) {
        return res.status(404).json({ message: 'Class not found' });
      }

      const hasPermission = assignment.teacher_id?.toString() === teacher._id.toString() ||
        assignedClasses.includes(classId[0].class_name) ||
        (classTeacher && classTeacher === classId[0].class_name);

      if (!hasPermission) {
        return res.status(403).json({
          message: 'You can only update assignments for classes you are assigned to'
        });
      }
    }

    if (req.body.section) {
      const validSections = ['A', 'B', 'C', 'D', 'E', 'F'];
      if (!validSections.includes(req.body.section)) {
        return res.status(400).json({ message: 'Section must be one of A, B, C, D, E, F.' });
      }
    }
    const updatedAssignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      // req.body,
      {
        class: classId[0]._id,
        subject: req.body.subject,
        title: req.body.title,
        description: req.body.description,
        dueDate: req.body.dueDate,
        section: req.body.section,
        file: req.body.file,
      },
      { new: true, runValidators: true }
    );

    if (!updatedAssignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.status(200).json(updatedAssignment);
  } catch (error) {
    console.error("Error updating assignment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.deleteAssignment = async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid assignment ID format' });
    }

    // Check if user is a teacher and verify permissions
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ users: req.user._id });
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      // Get the assignment to check permissions
      const assignment = await Assignment.findById(req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Check if teacher owns this assignment or has permission for the class
      const assignedClasses = teacher.assigned_classes || [];
      const classTeacher = teacher.class_teacher;

      const Class = require('../../models/AcademicSchema/Class');
      const targetClass = await Class.findById(assignment.class);

      if (!targetClass) {
        return res.status(404).json({ message: 'Class not found' });
      }
    }

    const deletedAssignment = await Assignment.findByIdAndDelete(req.params.id);

    if (!deletedAssignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.status(200).json({ message: "Assignment deleted successfully" });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

