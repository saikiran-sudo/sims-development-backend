const Announcement = require('../../models/Communication_Activities/Announcement');
const Teacher = require('../../models/CoreUser/Teacher');
const Student = require('../../models/CoreUser/Student');
const Parent = require('../../models/CoreUser/Parent');
const User = require('../../models/CoreUser/User');


exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, target, class: classId, section, startDate, endDate, status, admin_id } = req.body;
    let recipientIds = [];

    if (target && Array.isArray(target)) {
      // Handle array of target values
      for (const targetValue of target) {
        switch (targetValue) {
          case 'all_students':
            const students = await Student.find({ admin_id: req.user._id })
              .populate('users', '_id');
            const studentIds = students.map(student => student.users?._id).filter(Boolean);
            recipientIds = [...recipientIds, ...studentIds];
            break;

          case 'all_teachers':
            const teachers = await Teacher.find({ admin_id: req.user._id })
              .populate('users', '_id');
            const teacherIds = teachers.map(teacher => teacher.users?._id).filter(Boolean);
            recipientIds = [...recipientIds, ...teacherIds];
            break;

          case 'all_parents':
            const parents = await Parent.find({ admin_id: req.user._id })
              .populate('users', '_id');
            const parentIds = parents.map(parent => parent.users?._id).filter(Boolean);
            recipientIds = [...recipientIds, ...parentIds];
            break;

          case 'all':
            const allUsers = await User.find({ is_active: true, admin_id: req.user._id }).select('_id');
            const allUserIds = allUsers.map(user => user._id);
            recipientIds = [...recipientIds, ...allUserIds];
            break;

          default:
            return res.status(400).json({ message: "Invalid group specified" });
        }
      }

      // Remove duplicates
      recipientIds = [...new Set(recipientIds)];
    } else if (target) {
      // Handle single target value (backward compatibility)
      switch (target) {
        case 'all_students':
          const students = await Student.find({ admin_id: req.user._id })
            .populate('users', '_id');
          recipientIds = students.map(student => student.users?._id).filter(Boolean);
          break;

        case 'all_teachers':
          const teachers = await Teacher.find({ admin_id: req.user._id })
            .populate('users', '_id');
          recipientIds = teachers.map(teacher => teacher.users?._id).filter(Boolean);
          break;

        case 'all_parents':
          const parents = await Parent.find({ admin_id: req.user._id })
            .populate('users', '_id');
          recipientIds = parents.map(parent => parent.users?._id).filter(Boolean);
          break;

        case 'all':
          const allUsers = await User.find({ is_active: true, admin_id: req.user._id }).select('_id');
          recipientIds = allUsers.map(user => user._id);
          break;

        default:
          return res.status(400).json({ message: "Invalid group specified" });
      }
    }
    console.log('req end date is ',req.body.endDate);

    const announcement = await Announcement.create({
      title,
      content,
      target: recipientIds,
      targetGroups: target, // Store the original target groups
      startDate,
      endDate,
      status,
      author_id: req.user._id,
      admin_id: req.user._id
    });
    res.status(201).json(announcement);
  } catch (error) {
    console.log('not working fine');
    res.status(400).json({ message: error.message });
  }
};

exports.createAnnouncementUnderMyAdmin = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const { title, content, target, class: classId, section, startDate, endDate, status } = req.body;


    // Convert class ID to class name if needed
    let className = classId;
    if (classId && typeof classId === 'string' && classId.length === 24) {
      // This looks like an ObjectId, try to get the class name
      try {
        const Class = require('../../models/AcademicSchema/Class');
        const classDoc = await Class.findById(classId);
        if (classDoc) {
          className = classDoc.class_name;

        }
      } catch (error) {
        console.log('Error converting class ID to name:', error);
      }
    }

    // Debug: Check what classes and sections exist in the database
    const allStudents = await Student.find({ admin_id: teacher.admin_id }).select('class_id section');
    const uniqueClasses = [...new Set(allStudents.map(s => s.class_id).filter(Boolean))];
    const uniqueSections = [...new Set(allStudents.map(s => s.section).filter(Boolean))];


    let recipientIds = [];

    if (target && Array.isArray(target)) {
      // Handle array of target values
      for (const targetValue of target) {
        switch (targetValue) {
          case 'all_students':
            let studentQuery = { admin_id: teacher.admin_id };

            // Add class filter if specified
            if (className) {
              studentQuery.class_id = className;
            }

            // Add section filter if specified
            if (section) {
              studentQuery.section = section;
            }


            const students = await Student.find(studentQuery)
              .populate('users', '_id');
            const studentIds = students.map(student => student.users?._id).filter(Boolean);


            recipientIds = [...recipientIds, ...studentIds];
            break;

          case 'all_teachers':
            const teachers = await Teacher.find({ admin_id: teacher.admin_id })
              .populate('users', '_id');
            const teacherIds = teachers.map(teacher => teacher.users?._id).filter(Boolean);
            recipientIds = [...recipientIds, ...teacherIds];
            break;

          case 'all_parents':
            // If class or section is specified, get parents of students in that class/section
            if (className || section) {
              let studentQuery = { admin_id: teacher.admin_id };

              if (className) {
                studentQuery.class_id = className;
              }

              if (section) {
                studentQuery.section = section;
              }

              // Get students in the specified class/section
              const students = await Student.find(studentQuery).select('parent_id');
              const parentIds = students.flatMap(student => student.parent_id || []).filter(Boolean);

              // Get parent user IDs
              const parents = await Parent.find({
                _id: { $in: parentIds },
                admin_id: teacher.admin_id
              }).populate('users', '_id');

              const parentUserIds = parents.map(parent => parent.users?._id).filter(Boolean);

              recipientIds = [...recipientIds, ...parentUserIds];
            } else {
              // If no class/section specified, get all parents
              const parents = await Parent.find({ admin_id: teacher.admin_id })
                .populate('users', '_id');
              const parentIds = parents.map(parent => parent.users?._id).filter(Boolean);
              recipientIds = [...recipientIds, ...parentIds];
            }
            break;

          case 'all':
            const allUsers = await User.find({ is_active: true, admin_id: teacher.admin_id }).select('_id');
            const allUserIds = allUsers.map(user => user._id);
            recipientIds = [...recipientIds, ...allUserIds];
            break;

          default:
            return res.status(400).json({ message: "Invalid group specified" });
        }
      }

      // Remove duplicates
      recipientIds = [...new Set(recipientIds)];
    } else if (target) {
      // Handle single target value (backward compatibility)
      switch (target) {
        case 'all_students':
          let studentQuery = { admin_id: teacher.admin_id };

          // Add class filter if specified
          if (className) {
            studentQuery.class_id = className;
          }

          // Add section filter if specified
          if (section) {
            studentQuery.section = section;
          }


          const students = await Student.find(studentQuery)
            .populate('users', '_id');


          recipientIds = students.map(student => student.users?._id).filter(Boolean);
          break;

        case 'all_teachers':
          const teachers = await Teacher.find({ admin_id: teacher.admin_id })
            .populate('users', '_id');
          recipientIds = teachers.map(teacher => teacher.users?._id).filter(Boolean);
          break;

        case 'all_parents':
          // If class or section is specified, get parents of students in that class/section
          if (className || section) {
            let studentQuery = { admin_id: teacher.admin_id };

            if (className) {
              studentQuery.class_id = className;
            }

            if (section) {
              studentQuery.section = section;
            }

            // Get students in the specified class/section
            const students = await Student.find(studentQuery).select('parent_id');
            const parentIds = students.flatMap(student => student.parent_id || []).filter(Boolean);

            // Get parent user IDs
            const parents = await Parent.find({
              _id: { $in: parentIds },
              admin_id: teacher.admin_id
            }).populate('users', '_id');

            const parentUserIds = parents.map(parent => parent.users?._id).filter(Boolean);
            recipientIds = parentUserIds;
          } else {
            // If no class/section specified, get all parents
            const parents = await Parent.find({ admin_id: teacher.admin_id })
              .populate('users', '_id');
            recipientIds = parents.map(parent => parent.users?._id).filter(Boolean);
          }
          break;

        case 'all':
          const allUsers = await User.find({ is_active: true, admin_id: teacher.admin_id }).select('_id');
          recipientIds = allUsers.map(user => user._id);
          break;

        default:
          return res.status(400).json({ message: "Invalid group specified" });
      }
    }

    

    const announcement = await Announcement.create({
      title,
      content,
      target: recipientIds,
      targetGroups: target, // Store the original target groups
      class: classId, // Keep the original class ID for reference
      section: section,
      startDate,
      endDate,
      status,
      author_id: req.user._id,
      admin_id: teacher.admin_id
    });
    res.status(201).json(announcement);
  } catch (error) {
    console.log('not working fine');
    res.status(400).json({ message: error.message });
  }
};


exports.getAnnouncements = async (req, res) => {
  try {
    const role = req.user.role;
    const now = new Date();
    const announcements = await Announcement.find({ admin_id: req.user._id }).sort({ publish_date: -1 });

    res.json(announcements);
  } catch (err) {
    console.log('announcements not working fine');
    res.status(500).json({ message: err.message });
  }
};

exports.getAnnouncementsUnderMyAdmin = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const role = req.user.role;
    const now = new Date();

    // Get all announcements under this admin
    const allAnnouncements = await Announcement.find({
      admin_id: teacher.admin_id
    })
      .populate('class', 'class_name')
      .populate('author_id', 'role')
      .sort({ createdAt: -1 });

    // Filter to only show announcements created by admin (not by teachers)
    const adminAnnouncements = allAnnouncements.filter(announcement => {
      // If no author_id, it's an old admin announcement
      if (!announcement.author_id) return true;

      // If author has role 'admin', it's an admin announcement
      return announcement.author_id.role === 'admin';
    });

    res.json(adminAnnouncements);
  } catch (err) {
    console.log('announcements not working fine');
    res.status(500).json({ message: err.message });
  }
};

exports.getAnnouncementsForStudent = async (req, res) => {
  try {
    const student = await Student.findOne({ users: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const teacher = await Teacher.findOne({ admin_id: student.admin_id });

    const role = req.user.role;
    const now = new Date();
    // const announcements = await Announcement.find({admin_id: student.admin_id}).sort({ publish_date: -1 });
    const announcements = await Announcement.find({ $or: [{ admin_id: student.admin_id }, { author_id: teacher.users }] }).sort({ publish_date: -1 });

    res.json(announcements);
  } catch (err) {
    console.log('announcements not working fine');
    res.status(500).json({ message: err.message });
  }
};

exports.getAnnouncementsForParent = async (req, res) => {
  try {
    const parent = await Parent.findOne({ users: req.user._id });
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }
    const teacher = await Teacher.findOne({ admin_id: parent.admin_id });

    const role = req.user.role;
    const now = new Date();
    // const announcements = await Announcement.find({admin_id: parent.admin_id}).sort({ publish_date: -1 });
    const announcements = await Announcement.find({ $or: [{ admin_id: parent.admin_id }, { author_id: teacher.users }] }).sort({ publish_date: -1 });

    res.json(announcements);
  } catch (err) {
    console.log('announcements not working fine');
    res.status(500).json({ message: err.message });
  }
};

exports.getAnnouncementsCreatedByMe = async (req, res) => {
  try {
    const announcements = await Announcement.find({ author_id: req.user._id })
      .sort({ createdAt: -1 })
      .populate('author_id', 'full_name')
      .populate('class', 'class_name');

    res.json(announcements);
  } catch (err) {
    console.log('Error fetching announcements created by me:', err);
    res.status(500).json({ message: err.message });
  }
};


exports.getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id, { admin_id: req.user._id }).populate('author_id', 'full_name');
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    res.json(announcement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.updateAnnouncement = async (req, res) => {
  try {
    const { title, content, target, startDate, endDate, status } = req.body;
    let recipientIds = [];

    if (target && Array.isArray(target)) {
      // Handle array of target values
      for (const targetValue of target) {
        switch (targetValue) {
          case 'all_students':
            const students = await Student.find({ admin_id: req.user._id })
              .populate('users', '_id');
            const studentIds = students.map(student => student.users?._id).filter(Boolean);
            recipientIds = [...recipientIds, ...studentIds];
            break;

          case 'all_teachers':
            const teachers = await Teacher.find({ admin_id: req.user._id })
              .populate('users', '_id');
            const teacherIds = teachers.map(teacher => teacher.users?._id).filter(Boolean);
            recipientIds = [...recipientIds, ...teacherIds];
            break;

          case 'all_parents':
            const parents = await Parent.find({ admin_id: req.user._id })
              .populate('users', '_id');
            const parentIds = parents.map(parent => parent.users?._id).filter(Boolean);
            recipientIds = [...recipientIds, ...parentIds];
            break;

          case 'all':
            const allUsers = await User.find({ is_active: true, admin_id: req.user._id }).select('_id');
            const allUserIds = allUsers.map(user => user._id);
            recipientIds = [...recipientIds, ...allUserIds];
            break;

          default:
            return res.status(400).json({ message: "Invalid group specified" });
        }
      }

      // Remove duplicates
      recipientIds = [...new Set(recipientIds)];
    }

    const updateData = {
      title,
      content,
      target: recipientIds,
      targetGroups: target, // Store the original target groups
      startDate,
      endDate,
      status,
      admin_id: req.user._id
    };

    const updated = await Announcement.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: 'Announcement not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateAnnouncementUnderMyAdmin = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const { title, content, target, startDate, endDate, status } = req.body;
    let recipientIds = [];

    if (target && Array.isArray(target)) {
      // Handle array of target values
      for (const targetValue of target) {
        switch (targetValue) {
          case 'all_students':
            const students = await Student.find({ admin_id: teacher.admin_id })
              .populate('users', '_id');
            const studentIds = students.map(student => student.users?._id).filter(Boolean);
            recipientIds = [...recipientIds, ...studentIds];
            break;

          case 'all_teachers':
            const teachers = await Teacher.find({ admin_id: teacher.admin_id })
              .populate('users', '_id');
            const teacherIds = teachers.map(teacher => teacher.users?._id).filter(Boolean);
            recipientIds = [...recipientIds, ...teacherIds];
            break;

          case 'all_parents':
            const parents = await Parent.find({ admin_id: teacher.admin_id })
              .populate('users', '_id');
            const parentIds = parents.map(parent => parent.users?._id).filter(Boolean);
            recipientIds = [...recipientIds, ...parentIds];
            break;

          case 'all':
            const allUsers = await User.find({ is_active: true, admin_id: teacher.admin_id }).select('_id');
            const allUserIds = allUsers.map(user => user._id);
            recipientIds = [...recipientIds, ...allUserIds];
            break;

          default:
            return res.status(400).json({ message: "Invalid group specified" });
        }
      }

      // Remove duplicates
      recipientIds = [...new Set(recipientIds)];
    }

    const updateData = {
      title,
      content,
      target: recipientIds,
      targetGroups: target, // Store the original target groups
      startDate,
      endDate,
      status,
      admin_id: teacher.admin_id
    };

    const updated = await Announcement.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: 'Announcement not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


exports.deleteAnnouncement = async (req, res) => {
  try {
    const deleted = await Announcement.findByIdAndDelete(req.params.id, { admin_id: req.user._id });
    if (!deleted) return res.status(404).json({ message: 'Announcement not found' });
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
