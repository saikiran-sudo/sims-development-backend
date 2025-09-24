const Student = require('../../models/CoreUser/Student');
const User = require('../../models/CoreUser/User');
const Teacher = require('../../models/CoreUser/Teacher');
const cloudinary = require('../../config/cloudinary');
const bcrypt = require("bcryptjs");
const Subject = require('../../models/AcademicSchema/Subject');
const Result = require('../../models/Attendance_PerformanceSchema/Result');
const StudentMarks = require('../../models/Attendance_PerformanceSchema/StudentMarks');
const Class = require('../../models/AcademicSchema/Class');
const { addStudentToParent, updateStudentParents } = require('../../utils/relationshipUtils');
const mongoose = require('mongoose');



exports.createStudent = async (req, res) => {

  try {
    const {
      user_id,
      password,
      full_name,
      email,
      admission_number,
      date_of_birth,
      gender,
      address,
      parent_id,
      class_id,
      section,
      blood_group,
      medical_notes,
      profile_image,
      contact,
      status,
      student_type,
      previous_school_name,
      previous_school_address,
      previous_school_phone_number,
      previous_school_start_date,
      previous_school_end_date,
      documents,
      admin_id
    } = req.body;
    // console.log(req.body);
    if (!user_id || !admission_number || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }


    const existingStudent = await Student.findOne({
      $or: [
        { user_id },
        { admission_number }
      ]
    });
    if (existingStudent) {
      return res.status(400).json({ message: "Student ID or Admission Number already exists" });
    }



    const existingUser = await User.findOne({ user_id });
    if (existingUser) {
      return res.status(400).json({ message: "User ID already exists in User collection" });
    }


    // let profile_image = {};
    // if (req.files && req.files['profile_image'] && req.files['profile_image'][0]) {
    //   profile_image = {
    //     public_id: req.files['profile_image'][0].filename,
    //     url: req.files['profile_image'][0].path,
    //   };
    // }

    // let docs = documents || [];
    // if (req.files && req.files['documents']) {
    //   docs = req.files['documents'].map(file => ({
    //     url: file.path,
    //     name: file.originalname
    //   }));
    // }


    const newStudent = await User.create({
      user_id,
      full_name,
      email,
      password,
      phone: contact,
      role: 'student',
      profileImage: profile_image,
      class_id,
      section,
      status: "Active",
    });

    const student = await Student.create({
      user_id,
      password,
      role: 'student',
      full_name,
      email,
      admission_number,
      date_of_birth,
      gender,
      address,
      parent_id,
      class_id,
      section,
      blood_group,
      medical_notes,
      profile_image,
      contact,
      status,
      student_type,
      previous_school_name,
      previous_school_address,
      previous_school_phone_number,
      previous_school_start_date,
      previous_school_end_date,
      // documents: docs,
      documents,
      users: newStudent._id,
      status: "Active",
      admin_id
    });




    if (parent_id && parent_id.length > 0) {
      for (const parentId of parent_id) {
        await addStudentToParent(parentId, student._id);
      }
    }

    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


// exports.getAllStudents = async (req, res) => {
//   try {
//     const students = await Student.find()
//       .populate('student_id', 'email role')
//       .populate('parent_id', 'full_name')
//       .populate('class_id', 'name');
//     res.json(students);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
exports.getAllStudents = async (req, res) => {
  try {
    let adminIdToFilter;

    if (req.user.role === 'admin') {
      adminIdToFilter = req.user._id;
    } else if (req.user.role === 'teacher') {
      // Assuming teacher has `admin_id` field populated
      const teacher = await Teacher.findById({ users: req.user._id });
      if (!teacher || !teacher.admin_id) {
        return res.status(400).json({ message: 'Teacher is not assigned to an admin' });
      }
      adminIdToFilter = teacher.admin_id;
    } else {
      return res.status(403).json({ message: 'Unauthorized user' });
    }



    const students = await Student.find({ admin_id: adminIdToFilter })
      .populate('user_id', 'email role')
      .populate('parent_id', 'full_name user_id')
      .populate('class_id', 'name')
      .select('-password');
    // .populate('password','password')                    

    res.json(students);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({
      message: 'Failed to fetch students',
      error: err.message
    });
  }
};

exports.getStudentsUnderMyAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can access this endpoint' });
    }

    // Find the teacher
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Get all students under the same admin
    const students = await Student.find({ admin_id: teacher.admin_id })
      .populate('parent_id', 'full_name user_id')
      .populate('class_id', 'name')
      .select('-password');

    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getStudentsByClassTeacher = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can access this endpoint' });
    }

    // Find the teacher
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Check if teacher is assigned as class teacher
    if (!teacher.class_teacher) {
      return res.status(404).json({ message: 'Teacher is not assigned as a class teacher' });
    }

    console.log('Teacher class_teacher assignment:', teacher.class_teacher);

    // Parse the class_teacher field to get class and section
    // Expected format: "1st-A", "2nd-B", "3rd-C", etc.
    const classTeacherAssignment = teacher.class_teacher;
    
    // Split by the last hyphen to separate class name and section
    const lastHyphenIndex = classTeacherAssignment.lastIndexOf('-');
    if (lastHyphenIndex === -1) {
      return res.status(400).json({ message: 'Invalid class teacher assignment format. Expected format: "className-section"' });
    }
    
    const className = classTeacherAssignment.substring(0, lastHyphenIndex);
    const section = classTeacherAssignment.substring(lastHyphenIndex + 1);
    
    console.log('Parsed className:', className, 'section:', section);
    
    // Validate section is a single letter
    if (!/^[A-Z]$/.test(section)) {
      return res.status(400).json({ message: 'Invalid section format. Section must be a single letter (A-Z)' });
    }
    
    // Find students in the assigned class and section
    const students = await Student.find({ 
      admin_id: teacher.admin_id,
      class_id: className,
      section: section
    })
      .populate('parent_id', 'full_name user_id')
      .select('-password');

    console.log('Found students count:', students.length);
    res.json(students);
  } catch (err) {
    console.error('Error in getStudentsByClassTeacher:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.getStudentById = async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid student ID format' });
    }

    const student = await Student.findById(req.params.id)
      .populate('student_id', 'email role')
      .populate('parent_id', 'full_name user_id')
      .populate('class_id', 'name');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Find the class teacher for this student's class and section
    let classTeacherInfo = null;
    if (student.class_id && student.section) {
      const Teacher = require('../../models/CoreUser/Teacher');
      const classTeacher = await Teacher.findOne({
        admin_id: student.admin_id,
        class_teacher: `${student.class_id}-${student.section}`
      });

      if (classTeacher) {
        classTeacherInfo = {
          user_id: classTeacher.user_id,
          full_name: classTeacher.full_name,
          display_name: `${classTeacher.full_name}(${classTeacher.user_id})`
        };
      }
    }

    // Add class teacher info to the response
    const responseData = {
      ...student.toObject(),
      classTeacher: classTeacherInfo
    };

    res.json(responseData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.updateStudent = async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid student ID format' });
    }

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const updates = req.body;


    const allowedFields = [
      'user_id','password', 'full_name', 'admission_number', 'email', 'date_of_birth', 'gender', 'address', 'parent_id', 'class_id', 'rollNumber', 'section', 'blood_group', 'medical_notes', 'profile_image', 'contact', 'status', 'student_type', 'previous_school_name', 'previous_school_address', 'previous_school_phone_number', 'previous_school_start_date', 'previous_school_end_date', 'documents'
    ];
    Object.keys(updates).forEach(key => {
      if (!allowedFields.includes(key)) delete updates[key];
    });


    if (req.files && req.files['profile_image'] && req.files['profile_image'][0]) {
      // Delete old image if it exists
      if (student.profile_image) {
        try {
          const publicId = student.profile_image.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.log('Error deleting old image:', error);
        }
      }
      updates.profile_image = req.files['profile_image'][0].path;
    }


    if (req.files && req.files['documents']) {
      updates.documents = req.files['documents'].map(file => ({
        url: file.path,
        name: file.originalname
      }));
    }


    if (updates.parent_id) {
      await updateStudentParents(student._id, updates.parent_id);
    }

    Object.assign(student, updates);
    const updated = await student.save();


    if (student.users) {
      const user = await User.findById(student.users);
      if (user) {
        console.log('it is working fine-------');

        const userFields = ['user_id','password', 'full_name', 'email', 'class_id', 'section', 'profileImage', 'phone', 'status'];
        userFields.forEach(field => {
          if (field === 'profileImage' && updates.profile_image) {
            user.profileImage = updates.profile_image;
          } else if (field === 'password' && updates.password) {
            console.log('Passwork change is working fine-------');
            user.password = updates.password;
          } else if (field === 'phone' && updates.contact) {
            user.phone = updates.contact;
          } else if (field === 'status' && updates.status) {
            user.is_active = updates.status === 'active';
          } else if (updates[field]) {
            user[field] = updates[field];
          }
        });
        await user.save();
      }
    }


    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


exports.deleteStudent = async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid student ID format' });
    }

    const student = await Student.findById(req.params.id);

    if (!student) return res.status(404).json({ message: 'Student not found' });


    if (student.parent_id && student.parent_id.length > 0) {
      const { removeStudentFromParent } = require('../../utils/relationshipUtils');
      for (const parentId of student.parent_id) {
        await removeStudentFromParent(parentId, student._id);
      }
    }

    const imageUrl = student.profile_image;
    const publicId = imageUrl.split('/').pop().split('.')[0];

    if (publicId) {
      cloudinary.config({
        // secure: true,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      // await deleteImageFromCloudinary(imageUrl);
      await cloudinary.uploader.destroy(publicId);
    }


    if (student.users) {
      await User.findByIdAndDelete(student.users);
    }

    if (student.profile_image) {
      try {
        const publicId = student.profile_image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.log('Error deleting profile image:', error);
      }
    }

    await student.deleteOne();
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getMyProfile = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can access this' });
    }

    const student = await Student.findOne({ user_id: req.user.user_id })
      .populate('parent_id', 'full_name user_id')
      .populate('class_id', 'name');

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Find the class teacher for this student's class and section
    let classTeacherInfo = null;
    if (student.class_id && student.section) {
      const Teacher = require('../../models/CoreUser/Teacher');
      const classTeacher = await Teacher.findOne({
        admin_id: student.admin_id,
        class_teacher: `${student.class_id}-${student.section}`
      });

      if (classTeacher) {
        classTeacherInfo = {
          user_id: classTeacher.user_id,
          full_name: classTeacher.full_name,
          display_name: `${classTeacher.full_name}(${classTeacher.user_id})`
        };
      }
    }

    // Add class teacher info to the response
    const responseData = {
      ...student.toObject(),
      classTeacher: classTeacherInfo
    };

    res.json(responseData);
  } catch (err) {
    console.error('Error in getMyProfile:', err);
    res.status(500).json({ message: err.message });
  }
};


exports.getStudentCount = async (req, res) => {
  try {
    let adminIdToFilter;

    if (req.user.role === 'admin') {
      adminIdToFilter = req.user._id;
    } else if (req.user.role === 'super_admin') {
      // Superadmin can see all students
      adminIdToFilter = null;
    } else {
      return res.status(403).json({ message: 'Unauthorized user' });
    }

    const query = adminIdToFilter ? { admin_id: adminIdToFilter } : {};
    const count = await Student.countDocuments(query);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getExamDataForStudent = async (req, res) => {
  try {
    const { examType } = req.query; // Get exam type from query parameters
    const student = await Student.findOne({ user_id: req.params.studentId });
    
    if (!student) {
      console.log('Student not found for user_id:', req.params.studentId);
      return res.status(404).json({ message: 'Student not found' });
    }

    let className = '';
    let section = '';
    if (student.class_id) {
      className = student.class_id;
      section = student.section || '';
    }

    const subjects = await Subject.find();
    console.log('Found subjects:', subjects);

    const subjectsConfig = {};
    subjects.forEach(subj => {
      subjectsConfig[subj.name] = {
        maxMarks: subj.maxMarks,
        passingMarks: subj.passingMarks
      };
    });

    // Build query for results
    let query = { id: student.user_id };
    if (examType) {
      query.examType = examType;
    }
    
    const marksDocs = await Result.find(query);
    console.log('Found marks documents for exam type:', examType, marksDocs);

    // Get marks from the result document for the specific exam type
    let marks = {};
    if (marksDocs.length > 0) {
      // If exam type is specified, use the first matching result
      // If no exam type specified, use the first available result
      marks = marksDocs[0].marks || {};
    }

    console.log('Processed marks:', marks);

    const response = {
      student: {
        id: student.user_id,
        rollNo: student.admission_number,
        name: student.full_name,
        class: className,
        section: section,
        marks: marks
      },
      subjectsConfig,
      examType: examType || 'All'
    };

    console.log('Sending response:', response);
    res.json(response);
  } catch (err) {
    console.error('Error in getExamDataForStudent:', err);
    res.status(500).json({ message: err.message });
  }
};


exports.getStudentByUserId = async (req, res) => {
  try {
    const student = await Student.findOne({ user_id: req.params.userId })
      .populate('parent_id', 'full_name user_id')
      .populate('class_id', 'name');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Find the class teacher for this student's class and section
    let classTeacherInfo = null;
    if (student.class_id && student.section) {
      const Teacher = require('../../models/CoreUser/Teacher');
      const classTeacher = await Teacher.findOne({
        admin_id: student.admin_id,
        class_teacher: `${student.class_id}-${student.section}`
      });

      if (classTeacher) {
        classTeacherInfo = {
          user_id: classTeacher.user_id,
          full_name: classTeacher.full_name,
          display_name: `${classTeacher.full_name}(${classTeacher.user_id})`
        };
      }
    }

    // Add class teacher info to the response
    const responseData = {
      ...student.toObject(),
      classTeacher: classTeacherInfo
    };

    res.json(responseData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
