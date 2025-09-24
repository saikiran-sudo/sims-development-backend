const LeaveApplication = require('../../models/AdministrativeSchema/LeaveApplication');
const Parent = require('../../models/CoreUser/Parent');
const Teacher = require('../../models/CoreUser/Teacher');

exports.getAllTeacherLeaves = async (req, res) => {
  try {
    
    const leaves = await LeaveApplication.find({admin_id: req.user._id}).sort({ requestedAt: -1 });
    res.status(200).json(leaves);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leave requests', details: err.message });
  }
};
exports.getAllTeacherLeavesUnderMyAdmin = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({users: req.user._id});
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }
    
    const leaves = await LeaveApplication.find({admin_id: teacher.admin_id,user_id: teacher.user_id}).sort({ requestedAt: -1 });
  
    res.status(200).json(leaves);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leave requests', details: err.message });
  }
};


exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    const leave = await LeaveApplication.findByIdAndUpdate(
      id,
      { status,admin_id: req.user._id },
      { new: true }
    );
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    res.status(200).json(leave);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status', details: err.message });
  }
};


exports.updateAdminComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminComment } = req.body;
    const leave = await LeaveApplication.findByIdAndUpdate(
      id,
      { adminComment,admin_id: req.user._id },
      { new: true }
    );
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    res.status(200).json(leave);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update comment', details: err.message });
  }
};


exports.getAllStudentLeaves = async (req, res) => {
  try {
    const Parent = require('../../models/CoreUser/Parent');
    const Student = require('../../models/CoreUser/Student');
    
    let filter = { $or: [ { employeeId: null }, { employeeId: '' }, { employeeId: { $exists: false } } ] };
    
    
    if (req.user.role === 'parent') {
      
      const parent = await Parent.findOne({ users: req.user._id });
      if (!parent) {
        return res.status(404).json({ error: 'Parent profile not found' });
      }
      
      
      const students = await Student.find({
        parent_id: { $in: [parent._id.toString()] }
      });
      
      const studentIds = students.map(student => student._id.toString());
      
      
      filter = {
        ...filter,
        user_id: { $in: studentIds }
      };
    }
    
    const leaves = await LeaveApplication.find(filter).sort({ requestedAt: -1 });
    res.status(200).json(leaves);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch student leave requests', details: err.message });
  }
};


exports.updateStudentLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    const leave = await LeaveApplication.findByIdAndUpdate(
      id,
      { status,admin_id: req.user._id },
      { new: true }
    );
    if (!leave) return res.status(404).json({ error: 'Student leave request not found' });
    res.status(200).json(leave);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update student leave status', details: err.message });
  }
};


exports.updateTeacherComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherComment } = req.body;
    const leave = await LeaveApplication.findByIdAndUpdate(
      id,
      { adminComment: teacherComment,admin_id: req.user._id }, 
      { new: true }
    );
    if (!leave) return res.status(404).json({ error: 'Student leave request not found' });
    res.status(200).json(leave);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update teacher comment', details: err.message });
  }
};


exports.createLeave = async (req, res) => {
  try {
    const {
      user_id,
      leave_type,
      start_date,
      end_date,
      reason,
      employeeId,
      applicantName,
      document_url,
      document_id
    } = req.body;
    if (!user_id || !leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const teacher = await Teacher.findOne({users: req.user._id});
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }
    const leave = await LeaveApplication.create({
      user_id,
      leave_type,
      start_date,
      end_date,
      reason,
      employeeId,
      applicantName,
      document_url,
      document_id,
      admin_id: teacher.admin_id
    });
    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create leave request', details: err.message });
  }
};

exports.createLeaveByParent = async (req, res) => {
  try {
    const {
      user_id,
      leave_type,
      start_date,
      end_date,
      reason,
      employeeId,
      applicantName,
      document_url,
      document_id
    } = req.body;
    if (!user_id || !leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const parent = await Parent.findOne({ users: req.user._id });
    if (!parent) {
      return res.status(404).json({ error: 'Parent profile not found' });
    }
    const leave = await LeaveApplication.create({
      user_id,
      leave_type,
      start_date,
      end_date,
      reason,
      employeeId,
      applicantName,
      document_url,
      document_id,
      admin_id: parent.admin_id
    });
    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create leave request', details: err.message });
  }
};


exports.getParentChildrenLeaves = async (req, res) => {
  try {
    const Parent = require('../../models/CoreUser/Parent');
    const Student = require('../../models/CoreUser/Student');
    
    
    const parent = await Parent.findOne({ users: req.user._id });
    if (!parent) {
      return res.status(404).json({ error: 'Parent profile not found' });
    }
    
    console.log('Parent found:', parent._id, 'Parent admin_id:', parent.admin_id);
    console.log('Current user ID:', req.user._id);
    
    // Try different approaches to find students
    let students = await Student.find({
      parent_id: { $in: [parent._id.toString()] }
    }).populate('class_id', 'class_name section');
    
    // If no students found with parent_id, try with children array
    if (students.length === 0) {
      console.log('No students found with parent_id, trying children array');
      students = await Student.find({
        _id: { $in: parent.children || [] }
      }).populate('class_id', 'class_name section');
    }
    
    console.log('Students found:', students.length);
    console.log('Student IDs:', students.map(s => ({ id: s._id, name: s.full_name, user_id: s.user_id })));
    
    if (students.length === 0) {
      return res.status(200).json([]);
    }
    
    const studentIds = students.map(student => student._id.toString());
    
    // First, let's check all leaves for these students without admin filter
    const allLeavesForStudents = await LeaveApplication.find({
      user_id: { $in: studentIds }
    }).sort({ requestedAt: -1 });
    
    console.log('All leaves for students (without admin filter):', allLeavesForStudents.length);
    console.log('Leave details:', allLeavesForStudents.map(l => ({ 
      id: l._id, 
      user_id: l.user_id, 
      admin_id: l.admin_id,
      status: l.status 
    })));
    
    // Try different admin_id filters
    let leaves = await LeaveApplication.find({
      user_id: { $in: studentIds },
      admin_id: req.user._id
    }).sort({ requestedAt: -1 });
    
    console.log('Leaves with current user admin filter:', leaves.length);
    
    // If no leaves found, try with parent's admin_id
    if (leaves.length === 0) {
      leaves = await LeaveApplication.find({
        user_id: { $in: studentIds },
        admin_id: parent.admin_id
      }).sort({ requestedAt: -1 });
      console.log('Leaves with parent admin_id filter:', leaves.length);
    }
    
    // If still no leaves found, use all leaves for students
    if (leaves.length === 0 && allLeavesForStudents.length > 0) {
      console.log('No leaves found with admin filters, using all leaves for students');
      leaves = allLeavesForStudents;
    }
    
    const leavesWithStudentInfo = leaves.map(leave => {
      const student = students.find(s => s._id.toString() === leave.user_id);
      return {
        ...leave.toObject(),
        studentInfo: student ? {
          name: student.full_name,
          class: student.class_id?.class_name || student.class_id || 'N/A',
          section: student.section || 'N/A',
          admissionNumber: student.admission_number
        } : null
      };
    });

    console.log('Final leavesWithStudentInfo:', leavesWithStudentInfo);
    
    res.status(200).json(leavesWithStudentInfo);
  } catch (err) {
    console.error('Error in getParentChildrenLeaves:', err);
    res.status(500).json({ error: 'Failed to fetch parent children leave requests', details: err.message });
  }
};
exports.getParentChildrenLeavesByParent = async (req, res) => {
  try {
    const Parent = require('../../models/CoreUser/Parent');
    const Student = require('../../models/CoreUser/Student');
    
    
    const parent = await Parent.findOne({ users: req.user._id });
    if (!parent) {
      return res.status(404).json({ error: 'Parent profile not found' });
    }
    
    
    
    const students = await Student.find({
      parent_id: { $in: [parent._id.toString()] }
    }).populate('class_id', 'class_name section');
    
    
    const studentIds = students.map(student => student.user_id);
    
    // First, let's check if there are any leaves for these students at all
    const allLeavesForStudents = await LeaveApplication.find({
      user_id: { $in: studentIds }
    }).sort({ requestedAt: -1 });
    
    
    // Now check with admin_id filter
    const leaves = await LeaveApplication.find({
      user_id: { $in: studentIds },
      admin_id: parent.admin_id
    }).sort({ requestedAt: -1 });
    
  
    
    // If no leaves found with admin_id filter, try without it
    if (leaves.length === 0) {
      const leavesWithoutAdminFilter = await LeaveApplication.find({
        user_id: { $in: studentIds }
      }).sort({ requestedAt: -1 });
      
      // Use leaves without admin filter if that returns results
      if (leavesWithoutAdminFilter.length > 0) {
        const leavesWithStudentInfoAlt = leavesWithoutAdminFilter.map(leave => {
          const student = students.find(s => s._id.toString() === leave.user_id);
          return {
            ...leave.toObject(),
            studentInfo: student ? {
              name: student.full_name,
              class: student.class_id?.class_name || student.class_id || 'N/A',
              section: student.section || 'N/A',
              admissionNumber: student.admission_number
            } : null
          };
        });
      
        return res.status(200).json(leavesWithStudentInfoAlt);
      }
    }
    
    const leavesWithStudentInfo = leaves.map(leave => {
      const student = students.find(s => s._id.toString() === leave.user_id);
      return {
        ...leave.toObject(),
        studentInfo: student ? {
          name: student.full_name,
          class: student.class_id?.class_name || student.class_id || 'N/A',
          section: student.section || 'N/A',
          admissionNumber: student.admission_number
        } : null
      };
    });
    
    res.status(200).json(leavesWithStudentInfo);
  } catch (err) {
    console.error('Error in getParentChildrenLeavesByParent:', err);
    res.status(500).json({ error: 'Failed to fetch parent children leave requests', details: err.message });
  }
}; 