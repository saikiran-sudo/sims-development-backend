const Event = require('../../models/Communication_Activities/Event');
const Student = require('../../models/CoreUser/Student');
const Parent = require('../../models/CoreUser/Parent');
const Teacher = require('../../models/CoreUser/Teacher');
const User = require('../../models/CoreUser/User');

exports.createEvent = async (req, res) => {

  try {
    const {title,eventName,description,startDate,endDate,eventType,targetAudience,status} = req.body;
    let recipientIds = [];

    if (targetAudience && Array.isArray(targetAudience)) {
      // Handle array of target values
      for (const targetValue of targetAudience) {
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
    } else if (targetAudience) {
      // Handle single target value (backward compatibility)
      switch (targetAudience) {
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


    const event = await Event.create({
      title,
      eventName,
      description,
      startDate,
      endDate,
      eventType,
      targetGroups: targetAudience, 
      targetAudience: recipientIds,
      status,
      admin_id: req.user._id,
    });
    res.status(201).json(event);
  } catch (error) {
    console.log('not working fine');
    res.status(400).json({ message: error.message });
  }
};


exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find({admin_id: req.user._id}).sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllEventsByStudent = async (req, res) => {
  try {
    const student = await Student.findOne({ users: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const events = await Event.find({admin_id: student.admin_id}).sort({ event_date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getAllEventsByTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    const events = await Event.find({admin_id: teacher.admin_id}).sort({ event_date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllEventsByStudentByParent = async (req, res) => {
  try {
    const parent = await Parent.findOne({ users: req.user._id });
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }
    const events = await Event.find({admin_id: parent.admin_id}).sort({ event_date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('admin_id', 'full_name');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.updateEvent = async (req, res) => {
  try {
    const {title, eventName, description, startDate, endDate, eventType, targetAudience, status} = req.body;
    let recipientIds = [];

    if (targetAudience && Array.isArray(targetAudience)) {
      // Handle array of target values
      for (const targetValue of targetAudience) {
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
    } else if (targetAudience) {
      // Handle single target value (backward compatibility)
      switch (targetAudience) {
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

    const updateData = {
      title,
      eventName,
      description,
      startDate,
      endDate,
      eventType,
      targetGroups: targetAudience,
      targetAudience: recipientIds,
      status,
      admin_id: req.user._id,
    };

    const updated = await Event.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: 'Event not found' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


exports.deleteEvent = async (req, res) => {
  try {
    const deleted = await Event.findByIdAndDelete(req.params.id,{admin_id: req.user._id});
    if (!deleted) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
