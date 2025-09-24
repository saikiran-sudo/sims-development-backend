const Student = require('../../models/CoreUser/Student');
const Result = require('../../models/Attendance_PerformanceSchema/Result');
const Exam = require('../../models/Attendance_PerformanceSchema/Exam');
const Class = require('../../models/AcademicSchema/Class');
const Teacher = require('../../models/CoreUser/Teacher');
const Admin = require('../../models/CoreUser/Admin');
const Subject = require('../../models/AcademicSchema/Subject');
const StudentMarks = require('../../models/Attendance_PerformanceSchema/StudentMarks');
const fs = require('fs');
const path = require('path');
const SUBJECTS_CONFIG_PATH = path.join(__dirname, '../../data/subjectsConfig.json');
const Grade = require('../../models/Attendance_PerformanceSchema/Grade');

// Load subjects configuration
let subjectsConfig = {};
try {
  const fileData = fs.readFileSync(SUBJECTS_CONFIG_PATH, 'utf-8');
  subjectsConfig = JSON.parse(fileData);
} catch (err) {
  console.error('Failed to load subjectsConfig from file:', err);
  // Default configuration if file doesn't exist
  subjectsConfig = {
    'Mathematics': { maxMarks: 100, passingMarks: 35 },
    'Science': { maxMarks: 100, passingMarks: 35 },
    'English': { maxMarks: 100, passingMarks: 35 },
    'History': { maxMarks: 100, passingMarks: 35 },
    'Geography': { maxMarks: 100, passingMarks: 35 }
  };
}


exports.getExamReportOverview = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    let admin_id;
    let teacher = null;

    // Check if user is a teacher
    if (req.user.role === 'teacher') {
      teacher = await Teacher.findOne({ users: req.user._id });
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher profile not found' });
      }
      admin_id = teacher.admin_id;
    } 
    // Check if user is an admin
    else if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      const admin = await Admin.findOne({ users: req.user._id });
      if (!admin) {
        return res.status(404).json({ message: 'Admin profile not found' });
      }
      admin_id = admin._id;
    } else {
      return res.status(403).json({ message: 'Access denied: Only teachers and admins can access exam reports' });
    }

    const exams = await Exam.find({ });

    // Fetch students based on user role
    let students;
    if (req.user.role === 'teacher' && teacher.class_teacher) {
      // If teacher is a class teacher, only fetch students from their assigned class
      const classTeacherAssignment = teacher.class_teacher;
      
      // Parse the class_teacher field to get class and section
      // Expected format: "1st-A", "2nd-B", "3rd-C", etc.
      const lastHyphenIndex = classTeacherAssignment.lastIndexOf('-');
      if (lastHyphenIndex === -1) {
        return res.status(400).json({ 
          message: 'Invalid class teacher assignment format. Expected format: "className-section"' 
        });
      }
      
      const className = classTeacherAssignment.substring(0, lastHyphenIndex);
      const section = classTeacherAssignment.substring(lastHyphenIndex + 1);
      
      // Validate section is a single letter
      if (!/^[A-Z]$/.test(section)) {
        return res.status(400).json({ 
          message: 'Invalid section format. Section must be a single letter (A-Z)' 
        });
      }
      
      // Find students in the assigned class and section
      students = await Student.find({ 
        admin_id: teacher.admin_id,
        class_id: className,
        section: section
      });
      
      console.log(`Teacher ${teacher.full_name} is class teacher for ${className}-${section}, found ${students.length} students`);
    } else {
      // For admins or teachers without class assignment, fetch all students
      students = await Student.find({ admin_id });
    }

    const grades = await StudentMarks.find().populate('subject_id').populate('exam_id').populate({
      path: 'student_id',
      match: { admin_id: admin_id }
    });

    const classes = await Class.find({ admin_id });

    const classIdToName = {};
    classes.forEach(cls => {
      classIdToName[cls._id?.toString() || cls.class_id] = cls.class_name || cls.grade;
    });

    const formattedStudents = students.map(stu => ({
      id: stu.user_id,
      name: stu.full_name,
      class: classIdToName[stu.class_id] || stu.class_id || '',
      section: stu.section || '',
      rollNo: stu.rollNo || stu.admission_number || '',
      ...stu._doc
    }));

    // Create a map of exam_id to class_id from StudentMarks
    const examClassMap = {};
    grades.forEach(grade => {
      if (grade.exam_id && grade.class_id) {
        examClassMap[grade.exam_id.toString()] = grade.class_id.toString();
      }
    });

    const formattedExams = exams.map(exam => {
      const classId = examClassMap[exam._id.toString()];
      const className = classId ? classIdToName[classId] : '';
      
      return {
        examId: exam._id,
        examName: exam.exam_name,
        class: className,
        subject: '', // Will be populated from StudentMarks
        status: exam.status || 'Completed',
        maxMarks: exam.maxMarks || 100, 
        ...exam._doc
      };
    });

    const formattedGrades = grades
      .filter(grade => grade.student_id) // Filter out grades where student is null
      .map(grade => ({
        studentId: grade.student_id?._id || grade.student_id,
        examId: grade.exam_id?._id || grade.exam_id,
        marks: grade.marks_obtained,
        maxMarks: grade.max_marks,
        subject: grade.subject_id?.name || grade.subject_id,
        classId: grade.class_id?._id || grade.class_id,
        admin_id: admin_id,
      }));

    res.json({
      exams: formattedExams,
      students: formattedStudents,
      grades: formattedGrades
    });
  } catch (err) {
    console.error('Error in getExamReportOverview:', err);
    res.status(500).json({ error: 'Failed to fetch exam report data.' });
  }
};





exports.getSubjectsConfig = (req, res) => {
  // Check if user is authenticated
  if (!req.user || !req.user._id) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  // Check if user has appropriate role
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Access denied: Only admins and teachers can access subjects config' });
  }

  res.json(subjectsConfig);
};


exports.updateSubjectsConfig = (req, res) => {
  // Check if user is authenticated
  if (!req.user || !req.user._id) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  // Check if user has admin role
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied: Only admins can update subjects config' });
  }

  const newConfig = req.body;
  if (!newConfig || typeof newConfig !== 'object') {
    return res.status(400).json({ error: 'Invalid config data' });
  }
  subjectsConfig = newConfig;
  
  try {
    fs.writeFileSync(SUBJECTS_CONFIG_PATH, JSON.stringify(subjectsConfig, null, 2), 'utf-8');
    res.json(subjectsConfig);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save config' });
  }
};


// Create a new result
exports.createResult = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    let admin_id;
    let teacher = null;

    // Check if user is a teacher
    if (req.user.role === 'teacher') {
      teacher = await Teacher.findOne({ users: req.user._id });
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher profile not found' });
      }
      admin_id = teacher.admin_id;
    } 
    // Check if user is an admin
    else if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      const admin = await Admin.findOne({ users: req.user._id });
      if (!admin) {
        return res.status(404).json({ message: 'Admin profile not found' });
      }
      admin_id = admin._id;
    } else {
      return res.status(403).json({ message: 'Access denied: Only teachers and admins can create results' });
    }

    const { id, name, class: className, section, rollNo, marks, examType, examName = 'Mid-Term', subjectName = 'Mathematics' } = req.body;

    console.log('Received request body:', req.body);
    console.log('Extracted fields:', { id, name, className, section, rollNo, marks, examType });

    // Validate required fields
    if (!id || !name || !className || !section || !rollNo || !marks || !examType) {
      console.log('Missing required fields:', { id, name, className, section, rollNo, marks, examType });
      return res.status(400).json({ error: 'Missing required fields including exam type' });
    }

    // Format class name to ensure it's in the correct format
    // First try to find the class as-is, then try with "Grade " prefix if not found
    let formattedClassName = className.toString();
    let classRecord = await Class.findOne({ class_name: formattedClassName, admin_id });
    
    // If not found, try adding "Grade " prefix
    if (!classRecord) {
      formattedClassName = formattedClassName.startsWith('Grade ') ? formattedClassName : `Grade ${formattedClassName}`;
      classRecord = await Class.findOne({ class_name: formattedClassName, admin_id });
    }
    
    // If still not found, try removing "Grade " prefix if it exists
    if (!classRecord && formattedClassName.startsWith('Grade ')) {
      formattedClassName = formattedClassName.replace('Grade ', '');
      classRecord = await Class.findOne({ class_name: formattedClassName, admin_id });
    }
    if (!classRecord) {
      return res.status(404).json({ error: `Class "${formattedClassName}" not found. Please create the class first.` });
    }

    const student = await Student.findOne({ user_id: id, admin_id });
    if (!student) {
      return res.status(404).json({ error: `Student with ID "${id}" not found. Please create the student first.` });
    }

    // Create new result
    const result = new Result({
      id,
      name,
      class: formattedClassName,
      section,
      rollNo,
      marks,
      examType,
      admin_id
    });

    // Try to find existing exam, create if not exists
    let exam = await Exam.findOne({ exam_name: examName, admin_id });
    if (!exam) {
      exam = new Exam({
        exam_name: examName,
        exam_id: `EXAM_${Date.now()}`,
        class: formattedClassName,
        subject: subjectName,
        status: 'Completed',
        maxMarks: 100,
        admin_id
      });
      await exam.save();
    }

    // Try to find existing subject, create if not exists
    let subject = await Subject.findOne({ name: subjectName, admin_id });
    if (!subject) {
      subject = new Subject({
        name: subjectName,
        className: formattedClassName,
        category: 'Academic',
        maxMarks: 100,
        passingMarks: 35,
        admin_id
      });
      await subject.save();
    }

    // Handle marks - if it's an object with multiple subjects, use the first one or a specific subject
    let marksValue = marks;
    if (typeof marks === 'object' && marks !== null) {
      // If marks is an object with multiple subjects, use the subjectName or first available
      marksValue = marks[subjectName] || Object.values(marks)[0] || 0;
    }

    const studentMarks = new StudentMarks({
      exam_id: exam._id,
      class_id: classRecord._id,
      subject_id: subject._id,
      student_id: student._id,
      marks_obtained: marksValue,
      max_marks: 100,
      grade: 'A',
      remarks: 'Good'
    });

    await studentMarks.save();
    await result.save();
    res.status(201).json({ result, studentMarks });
  } catch (err) {
    console.error('Error in createResult:', err);
    
    // Handle specific MongoDB errors
    if (err.code === 11000) {
      // Duplicate key error
      return res.status(400).json({ error: 'A result with this ID already exists for this exam type.' });
    }
    
    if (err.name === 'ValidationError') {
      // Mongoose validation error
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: `Validation error: ${validationErrors.join(', ')}` });
    }
    
    res.status(500).json({ error: 'Failed to create result.', details: err.message });
  }
};

// Update an existing result
exports.updateResult = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    let admin_id;
    let teacher = null;

    // Check if user is a teacher
    if (req.user.role === 'teacher') {
      teacher = await Teacher.findOne({ users: req.user._id });
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher profile not found' });
      }
      admin_id = teacher.admin_id;
    } 
    // Check if user is an admin
    else if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      const admin = await Admin.findOne({ users: req.user._id });
      if (!admin) {
        return res.status(404).json({ message: 'Admin profile not found' });
      }
      admin_id = admin._id;
    } else {
      return res.status(403).json({ message: 'Access denied: Only teachers and admins can update results' });
    }

    const { id } = req.params;
    const { name, class: className, section, rollNo, marks, examType } = req.body;

    // Format class name to ensure it's in the correct format
    // First try to find the class as-is, then try with "Grade " prefix if not found
    let formattedClassName = className.toString();
    let classRecord = await Class.findOne({ class_name: formattedClassName, admin_id });
    
    // If not found, try adding "Grade " prefix
    if (!classRecord) {
      formattedClassName = formattedClassName.startsWith('Grade ') ? formattedClassName : `Grade ${formattedClassName}`;
      classRecord = await Class.findOne({ class_name: formattedClassName, admin_id });
    }
    
    // If still not found, try removing "Grade " prefix if it exists
    if (!classRecord && formattedClassName.startsWith('Grade ')) {
      formattedClassName = formattedClassName.replace('Grade ', '');
      classRecord = await Class.findOne({ class_name: formattedClassName, admin_id });
    }

    // Find and update the result
    const result = await Result.findOneAndUpdate(
      { id, admin_id },
      { name, class: formattedClassName, section, rollNo, marks, examType },
      { new: true, runValidators: true }
    );

    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    res.json(result);
  } catch (err) {
    console.error('Error in updateResult:', err);
    res.status(500).json({ error: 'Failed to update result.' });
  }
};

exports.getAllResults = async (req, res) => {
  try {
    console.log('getAllResults called with query:', req.query);
    
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    let admin_id;

    // Check if user is a teacher
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ users: req.user._id });
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher profile not found' });
      }
      admin_id = teacher.admin_id;
    } 
    // Check if user is an admin
    else if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      const admin = await Admin.findOne({ users: req.user._id });
      if (!admin) {
        return res.status(404).json({ message: 'Admin profile not found' });
      }
      admin_id = admin._id;
    } else {
      return res.status(403).json({ message: 'Access denied: Only teachers and admins can access exam reports' });
    }

    console.log('Admin ID:', admin_id);

    const { class: classFilter, section, search, gradeCategory, examType } = req.query;
    let query = { admin_id };
    if (classFilter) query.class = classFilter;
    if (section) query.section = section;
    if (examType) query.examType = examType;
    
    console.log('Query for Result.find:', query);
    const adminId = await Admin.findOne({users: req.user._id});
    console.log('adminId', adminId.users);

    let results = await Result.find({admin_id: adminId.users});
    console.log('Raw results from database:', results.length, 'records found');
    console.log('Subjects config available:', Object.keys(subjectsConfig));

    
    results = results.map(student => {
      console.log('Processing student:', student.name, 'with marks:', student.marks);
      let totalMarksObtained = 0;
      let totalMaxMarks = 0;
      let subjectsAttempted = 0;
      Object.entries(student.marks).forEach(([subject, marks]) => {
        const subjectConf = subjectsConfig[subject];
        console.log(`Subject: ${subject}, Marks: ${marks}, Config:`, subjectConf);
        if (subjectConf) {
          totalMarksObtained += marks;
          totalMaxMarks += subjectConf.maxMarks;
          subjectsAttempted++;
        }
      });
      const overallPercentage = subjectsAttempted > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;
      
      let gradeCat = 'Poor';
      if (overallPercentage >= 85) gradeCat = 'Excellent';
      else if (overallPercentage >= 70) gradeCat = 'Good';
      else if (overallPercentage >= 50) gradeCat = 'Average';
      
      const processedStudent = {
        ...student._doc,
        totalMarksObtained,
        totalMaxMarks,
        overallPercentage: parseFloat(overallPercentage.toFixed(2)),
        gradeCategory: gradeCat
      };
      console.log('Processed student:', processedStudent.name, 'Total:', totalMarksObtained, '/', totalMaxMarks, 'Percentage:', overallPercentage);
      return processedStudent;
    });

    
    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(student =>
        student.name.toLowerCase().includes(searchLower) ||
        student.rollNo.toLowerCase().includes(searchLower) ||
        student.id.toLowerCase().includes(searchLower)
      );
    }
    
    if (gradeCategory) {
      results = results.filter(student => student.gradeCategory === gradeCategory);
    }

    console.log('Final results to send:', results.length, 'records');
    console.log('Sample result:', results);
    
    res.json({
      success: true,
      results: results,
      subjectsConfig: subjectsConfig
    });
  } catch (err) {
    console.error('Error in getAllResults:', err);
    res.status(500).json({ error: 'Failed to fetch results.' });
  }
};

exports.getAllResultsUnderMyAdmin = async (req, res) => {
  try {
    console.log('getAllResults called with query:', req.query);
    
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    let admin_id;
    let teacher = null;

    // Check if user is a teacher
    if (req.user.role === 'teacher') {
      teacher = await Teacher.findOne({ users: req.user._id });
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher profile not found' });
      }
      admin_id = teacher.admin_id;
    } 
    // Check if user is an admin
    else if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      const admin = await Admin.findOne({ users: req.user._id });
      if (!admin) {
        return res.status(404).json({ message: 'Admin profile not found' });
      }
      admin_id = admin._id;
    } else {
      return res.status(403).json({ message: 'Access denied: Only teachers and admins can access exam reports' });
    }

    console.log('Admin ID:', admin_id);

    const { class: classFilter, section, search, gradeCategory, examType } = req.query;
    let query = { admin_id };
    if (classFilter) query.class = classFilter;
    if (section) query.section = section;
    if (examType) query.examType = examType;
    
    console.log('Query for Result.find:', query);

    let results;
    
    if (req.user.role === 'teacher' && teacher.class_teacher) {
      // If teacher is a class teacher, only fetch results from their assigned class students
      const classTeacherAssignment = teacher.class_teacher;
      
      // Parse the class_teacher field to get class and section
      const lastHyphenIndex = classTeacherAssignment.lastIndexOf('-');
      if (lastHyphenIndex === -1) {
        return res.status(400).json({ 
          message: 'Invalid class teacher assignment format. Expected format: "className-section"' 
        });
      }
      
      const className = classTeacherAssignment.substring(0, lastHyphenIndex);
      const section = classTeacherAssignment.substring(lastHyphenIndex + 1);
      
      // Validate section is a single letter
      if (!/^[A-Z]$/.test(section)) {
        return res.status(400).json({ 
          message: 'Invalid section format. Section must be a single letter (A-Z)' 
        });
      }
      
      // Find students in the assigned class and section
      const assignedStudents = await Student.find({ 
        admin_id: teacher.admin_id,
        class_id: className,
        section: section
      });
      
      const studentIds = assignedStudents.map(student => student.user_id);
      
      // Filter results to only include students from the assigned class
      results = await Result.find({ 
        admin_id: teacher.admin_id,
        id: { $in: studentIds }
      });
      
      console.log(`Teacher ${teacher.full_name} is class teacher for ${className}-${section}, found ${assignedStudents.length} students and ${results.length} results`);
    } else {
      // For admins or teachers without class assignment, fetch all results
      results = await Result.find({ admin_id: admin_id });
    }
    
    console.log('Raw results from database:', results.length, 'records found');
    console.log('Subjects config available:', Object.keys(subjectsConfig));

    results = results.map(student => {
      console.log('Processing student:', student.name, 'with marks:', student.marks);
      let totalMarksObtained = 0;
      let totalMaxMarks = 0;
      let subjectsAttempted = 0;
      Object.entries(student.marks).forEach(([subject, marks]) => {
        const subjectConf = subjectsConfig[subject];
        console.log(`Subject: ${subject}, Marks: ${marks}, Config:`, subjectConf);
        if (subjectConf) {
          totalMarksObtained += marks;
          totalMaxMarks += subjectConf.maxMarks;
          subjectsAttempted++;
        }
      });
      const overallPercentage = subjectsAttempted > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;
      
      let gradeCat = 'Poor';
      if (overallPercentage >= 85) gradeCat = 'Excellent';
      else if (overallPercentage >= 70) gradeCat = 'Good';
      else if (overallPercentage >= 50) gradeCat = 'Average';
      
      const processedStudent = {
        ...student._doc,
        totalMarksObtained,
        totalMaxMarks,
        overallPercentage: parseFloat(overallPercentage.toFixed(2)),
        gradeCategory: gradeCat
      };
      console.log('Processed student:', processedStudent.name, 'Total:', totalMarksObtained, '/', totalMaxMarks, 'Percentage:', overallPercentage);
      return processedStudent;
    });

    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(student =>
        student.name.toLowerCase().includes(searchLower) ||
        student.rollNo.toLowerCase().includes(searchLower) ||
        student.id.toLowerCase().includes(searchLower)
      );
    }
    
    if (gradeCategory) {
      results = results.filter(student => student.gradeCategory === gradeCategory);
    }

    console.log('Final results to send:', results.length, 'records');
    console.log('Sample result:', results);
    
    res.json({
      success: true,
      results: results,
      subjectsConfig: subjectsConfig
    });
  } catch (err) {
    console.error('Error in getAllResults:', err);
    res.status(500).json({ error: 'Failed to fetch results.' });
  }
};
