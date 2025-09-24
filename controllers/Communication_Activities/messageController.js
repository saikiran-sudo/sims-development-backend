const Message = require("../../models/Communication_Activities/Message");
const User = require("../../models/CoreUser/User");
const Student = require("../../models/CoreUser/Student");
const Teacher = require("../../models/CoreUser/Teacher");
const Parent = require("../../models/CoreUser/Parent");
const Admin = require("../../models/CoreUser/Admin");
const cloudinary = require("../../config/cloudinary");
const fs = require("fs");
const mongoose = require("mongoose");


exports.getUsersForMessaging = async (req, res) => {
  try {
    const { search, role, group } = req.query;
    let users = [];


    if (group) {
      switch (group) {
        case 'all_students':
          const students = await Student.find({ admin_id: req.user._id })
            .select('user_id full_name email class_id')
            .populate('users', 'email role');
          users = students.map(student => ({
            _id: student.users?._id || student.user_id,
            user_id: student.user_id,
            full_name: student.full_name,
            email: student.email || student.users?.email,
            role: 'student',
            class_id: student.class_id
          }));
          break;

        case 'all_teachers':
          const teachers = await Teacher.find({ admin_id: req.user._id })
            .select('user_id full_name email subjects_taught')
            .populate('users', 'email role');
          users = teachers.map(teacher => ({
            _id: teacher.users?._id || teacher.user_id,
            user_id: teacher.user_id,
            full_name: teacher.full_name,
            email: teacher.email || teacher.users?.email,
            role: 'teacher',
            subjects_taught: teacher.subjects_taught
          }));
          break;

        case 'all_parents':
          const parents = await Parent.find({ admin_id: req.user._id })
            .select('user_id full_name email phone')
            .populate('users', 'email role');
          users = parents.map(parent => ({
            _id: parent.users?._id || parent.user_id,
            user_id: parent.user_id,
            full_name: parent.full_name,
            email: parent.email || parent.users?.email,
            role: 'parent',
            phone: parent.phone
          }));
          break;

        case 'all':

          const allUsers = await User.find({ is_active: true, admin_id: req.user._id })
            .select('_id user_id full_name email role');
          users = allUsers.map(user => ({
            _id: user._id,
            user_id: user.user_id,
            full_name: user.full_name,
            email: user.email,
            role: user.role
          }));
          break;

        default:
          return res.status(400).json({ message: "Invalid group specified" });
      }
    } else {

      let allUsers = [];


      const students = await Student.find({
        // status: 'active',
        admin_id: req.user._id,
        ...(search ? {
          $or: [
            { full_name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { user_id: { $regex: search, $options: 'i' } }
          ]
        } : {})
      }).select('user_id full_name email').populate('users', 'email role');

      students.forEach(student => {
        allUsers.push({
          _id: student.users?._id || student.user_id,
          user_id: student.user_id,
          full_name: student.full_name,
          email: student.email || student.users?.email,
          role: 'student'
        });
      });


      const teachers = await Teacher.find({
        admin_id: req.user._id,
        ...(search ? {
          $or: [
            { full_name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { user_id: { $regex: search, $options: 'i' } }
          ]
        } : {})
      }).select('user_id full_name email').populate('users', 'email role');

      teachers.forEach(teacher => {
        allUsers.push({
          _id: teacher.users?._id || teacher.user_id,
          user_id: teacher.user_id,
          full_name: teacher.full_name,
          email: teacher.email || teacher.users?.email,
          role: 'teacher'
        });
      });


      const parents = await Parent.find({
        admin_id: req.user._id,
        ...(search ? {
          $or: [
            { full_name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { user_id: { $regex: search, $options: 'i' } }
          ]
        } : {})
      }).select('user_id full_name email').populate('users', 'email role');

      parents.forEach(parent => {
        allUsers.push({
          _id: parent.users?._id || parent.user_id,
          user_id: parent.user_id,
          full_name: parent.full_name,
          email: parent.email || parent.users?.email,
          role: 'parent'
        });
      });


      if (role && role !== 'all') {
        allUsers = allUsers.filter(user => user.role === role);
      }


      users = allUsers.slice(0, 50);
    }

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUsersForMessagingUnderMyAdmin = async (req, res) => {
  try {
    const { search, role, group } = req.query;
    let users = [];

    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }


    if (group) {
      switch (group) {
        case 'all_students':
          const students = await Student.find({ admin_id: teacher.admin_id })
            .select('user_id full_name email class_id')
            .populate('users', 'email role');
          users = students.map(student => ({
            _id: student.users?._id || student.user_id,
            user_id: student.user_id,
            full_name: student.full_name,
            email: student.email || student.users?.email,
            role: 'student',
            class_id: student.class_id
          }));
          break;

        case 'all_teachers':
          const teachers = await Teacher.find({ admin_id: teacher.admin_id })
            .select('user_id full_name email subjects_taught')
            .populate('users', 'email role');
          users = teachers.map(teacher => ({
            _id: teacher.users?._id || teacher.user_id,
            user_id: teacher.user_id,
            full_name: teacher.full_name,
            email: teacher.email || teacher.users?.email,
            role: 'teacher',
            subjects_taught: teacher.subjects_taught
          }));
          break;

        case 'all_parents':
          const parents = await Parent.find({ admin_id: teacher.admin_id })
            .select('user_id full_name email phone')
            .populate('users', 'email role');
          users = parents.map(parent => ({
            _id: parent.users?._id || parent.user_id,
            user_id: parent.user_id,
            full_name: parent.full_name,
            email: parent.email || parent.users?.email,
            role: 'parent',
            phone: parent.phone
          }));
          break;

        case 'all_admins':
          const admins = await Admin.find({ users: teacher.admin_id })
            .select('userId schoolName email')
            .populate('users', 'email role');
          users = admins.map(admin => ({
            _id: admin.users?._id || admin.userId,
            user_id: admin.userId,
            full_name: admin.schoolName,
            email: admin.email || admin.users?.email,
            role: 'admin'
          }));
          break;

        case 'all':

          const allUsers = await User.find({ is_active: true, admin_id: teacher.admin_id })
            .select('_id user_id full_name email role');
          users = allUsers.map(user => ({
            _id: user._id,
            user_id: user.user_id,
            full_name: user.full_name,
            email: user.email,
            role: user.role
          }));
          break;

        default:
          return res.status(400).json({ message: "Invalid group specified" });
      }
    } else {

      let allUsers = [];


      const students = await Student.find({
        // status: 'active',
        admin_id: teacher.admin_id,
        ...(search ? {
          $or: [
            { full_name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { user_id: { $regex: search, $options: 'i' } }
          ]
        } : {})
      }).select('user_id full_name email').populate('users', 'email role');

      students.forEach(student => {
        allUsers.push({
          _id: student.users?._id || student.user_id,
          user_id: student.user_id,
          full_name: student.full_name,
          email: student.email || student.users?.email,
          role: 'student'
        });
      });


      const teachers = await Teacher.find({
        admin_id: teacher.admin_id,
        ...(search ? {
          $or: [
            { full_name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { user_id: { $regex: search, $options: 'i' } }
          ]
        } : {})
      }).select('user_id full_name email').populate('users', 'email role');

      teachers.forEach(teacher => {
        allUsers.push({
          _id: teacher.users?._id || teacher.user_id,
          user_id: teacher.user_id,
          full_name: teacher.full_name,
          email: teacher.email || teacher.users?.email,
          role: 'teacher'
        });
      });


      const parents = await Parent.find({
        admin_id: teacher.admin_id,
        ...(search ? {
          $or: [
            { full_name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { user_id: { $regex: search, $options: 'i' } }
          ]
        } : {})
      }).select('user_id full_name email').populate('users', 'email role');

      parents.forEach(parent => {
        allUsers.push({
          _id: parent.users?._id || parent.user_id,
          user_id: parent.user_id,
          full_name: parent.full_name,
          email: parent.email || parent.users?.email,
          role: 'parent'
        });
      });

      // Add admins to individual search
      const admins = await Admin.find({
        users: teacher.admin_id,
        ...(search ? {
          $or: [
            { schoolName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { userId: { $regex: search, $options: 'i' } }
          ]
        } : {})
      }).select('userId schoolName email').populate('users', 'email role');

      admins.forEach(admin => {
        allUsers.push({
          _id: admin.users?._id || admin.userId,
          user_id: admin.userId,
          full_name: admin.schoolName,
          email: admin.email || admin.users?.email,
          role: 'admin'
        });
      });

      if (role && role !== 'all') {
        allUsers = allUsers.filter(user => user.role === role);
      }


      users = allUsers.slice(0, 50);
    }

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUsersForMessagingUnderMyAdminForStudent = async (req, res) => {
  try {
    const student = await Student.findOne({ users: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const { search, role, group } = req.query;
    let users = [];

    if (group) {
      switch (group) {
        case 'all_students':
          const students = await Student.find({ admin_id: student.admin_id })
            .select('user_id full_name email class_id')
            .populate('users', 'email role');
          users = students.map(student => ({
            _id: student.users?._id || student.user_id,
            user_id: student.user_id,
            full_name: student.full_name,
            email: student.email || student.users?.email,
            role: 'student',
            class_id: student.class_id
          }));
          break;

        case 'all_teachers':
          const teachers = await Teacher.find({ admin_id: student.admin_id })
            .select('user_id full_name email subjects_taught')
            .populate('users', 'email role');
          users = teachers.map(teacher => ({
            _id: teacher.users?._id || teacher.user_id,
            user_id: teacher.user_id,
            full_name: teacher.full_name,
            email: teacher.email || teacher.users?.email,
            role: 'teacher',
            subjects_taught: teacher.subjects_taught
          }));
          break;

        case 'all_parents':
          const parents = await Parent.find({ admin_id: student.admin_id })
            .select('user_id full_name email phone')
            .populate('users', 'email role');
          users = parents.map(parent => ({
            _id: parent.users?._id || parent.user_id,
            user_id: parent.user_id,
            full_name: parent.full_name,
            email: parent.email || parent.users?.email,
            role: 'parent',
            phone: parent.phone
          }));
          break;

        case 'all':

          const allUsers = await User.find({ is_active: true, admin_id: student.admin_id })
            .select('_id user_id full_name email role');
          users = allUsers.map(user => ({
            _id: user._id,
            user_id: user.user_id,
            full_name: user.full_name,
            email: user.email,
            role: user.role
          }));
          break;

        default:
          return res.status(400).json({ message: "Invalid group specified" });
      }
    } else {

      let allUsers = [];


      const students = await Student.find({
        // status: 'active',
        admin_id: student.admin_id,
        ...(search ? {
          $or: [
            { full_name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { user_id: { $regex: search, $options: 'i' } }
          ]
        } : {})
      }).select('user_id full_name email').populate('users', 'email role');

      students.forEach(student => {
        allUsers.push({
          _id: student.users?._id || student.user_id,
          user_id: student.user_id,
          full_name: student.full_name,
          email: student.email || student.users?.email,
          role: 'student'
        });
      });


      const teachers = await Teacher.find({
        admin_id: student.admin_id,
        ...(search ? {
          $or: [
            { full_name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { user_id: { $regex: search, $options: 'i' } }
          ]
        } : {})
      }).select('user_id full_name email').populate('users', 'email role');

      teachers.forEach(teacher => {
        allUsers.push({
          _id: teacher.users?._id || teacher.user_id,
          user_id: teacher.user_id,
          full_name: teacher.full_name,
          email: teacher.email || teacher.users?.email,
          role: 'teacher'
        });
      });


      const parents = await Parent.find({
        admin_id: student.admin_id,
        ...(search ? {
          $or: [
            { full_name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { user_id: { $regex: search, $options: 'i' } }
          ]
        } : {})
      }).select('user_id full_name email').populate('users', 'email role');

      parents.forEach(parent => {
        allUsers.push({
          _id: parent.users?._id || parent.user_id,
          user_id: parent.user_id,
          full_name: parent.full_name,
          email: parent.email || parent.users?.email,
          role: 'parent'
        });
      });

      // Add admins to individual search for students
      const admins = await Admin.find({
        users: student.admin_id,
        ...(search ? {
          $or: [
            { schoolName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { userId: { $regex: search, $options: 'i' } }
          ]
        } : {})
      }).select('userId schoolName email').populate('users', 'email role');

      admins.forEach(admin => {
        allUsers.push({
          _id: admin.users?._id || admin.userId,
          user_id: admin.userId,
          full_name: admin.schoolName,
          email: admin.email || admin.users?.email,
          role: 'admin'
        });
      });

      if (role && role !== 'all') {
        allUsers = allUsers.filter(user => user.role === role);
      }


      users = allUsers.slice(0, 50);
    }

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getUsersForMessagingUnderMyAdminForParent = async (req, res) => {
  try {
    const parent = await Parent.findOne({ users: req.user._id });
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }
    const { search, role, group } = req.query;
    let users = [];

    if (group) {
      switch (group) {
        case 'all_students':
          const students = await Student.find({ admin_id: parent.admin_id })
            .select('user_id full_name email class_id')
            .populate('users', 'email role');
          users = students.map(student => ({
            _id: student.users?._id || student.user_id,
            user_id: student.user_id,
            full_name: student.full_name,
            email: student.email || student.users?.email,
            role: 'student',
            class_id: student.class_id
          }));
          break;

        case 'all_teachers':
          const teachers = await Teacher.find({ admin_id: parent.admin_id })
            .select('user_id full_name email subjects_taught')
            .populate('users', 'email role');
          users = teachers.map(teacher => ({
            _id: teacher.users?._id || teacher.user_id,
            user_id: teacher.user_id,
            full_name: teacher.full_name,
            email: teacher.email || teacher.users?.email,
            role: 'teacher',
            subjects_taught: teacher.subjects_taught
          }));
          break;

        case 'all_parents':
          const parents = await Parent.find({ admin_id: parent.admin_id })
            .select('user_id full_name email phone')
            .populate('users', 'email role');
          users = parents.map(parent => ({
            _id: parent.users?._id || parent.user_id,
            user_id: parent.user_id,
            full_name: parent.full_name,
            email: parent.email || parent.users?.email,
            role: 'parent',
            phone: parent.phone
          }));
          break;

        case 'all':

          const allUsers = await User.find({ is_active: true, admin_id: parent.admin_id })
            .select('_id user_id full_name email role');
          users = allUsers.map(user => ({
            _id: user._id,
            user_id: user.user_id,
            full_name: user.full_name,
            email: user.email,
            role: user.role
          }));
          break;

        default:
          return res.status(400).json({ message: "Invalid group specified" });
      }
    } else {

      let allUsers = [];


      const students = await Student.find({
        // status: 'active',
        admin_id: parent.admin_id,
        ...(search ? {
          $or: [
            { full_name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { user_id: { $regex: search, $options: 'i' } }
          ]
        } : {})
      }).select('user_id full_name email').populate('users', 'email role');

      students.forEach(student => {
        allUsers.push({
          _id: student.users?._id || student.user_id,
          user_id: student.user_id,
          full_name: student.full_name,
          email: student.email || student.users?.email,
          role: 'student'
        });
      });


      const teachers = await Teacher.find({
        admin_id: parent.admin_id,
        ...(search ? {
          $or: [
            { full_name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { user_id: { $regex: search, $options: 'i' } }
          ]
        } : {})
      }).select('user_id full_name email').populate('users', 'email role');

      teachers.forEach(teacher => {
        allUsers.push({
          _id: teacher.users?._id || teacher.user_id,
          user_id: teacher.user_id,
          full_name: teacher.full_name,
          email: teacher.email || teacher.users?.email,
          role: 'teacher'
        });
      });


      const parents = await Parent.find({
        admin_id: parent.admin_id,
        ...(search ? {
          $or: [
            { full_name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { user_id: { $regex: search, $options: 'i' } }
          ]
        } : {})
      }).select('user_id full_name email').populate('users', 'email role');

      parents.forEach(parent => {
        allUsers.push({
          _id: parent.users?._id || parent.user_id,
          user_id: parent.user_id,
          full_name: parent.full_name,
          email: parent.email || parent.users?.email,
          role: 'parent'
        });
      });

      // Add admins to individual search for parents
      const admins = await Admin.find({
        users: parent.admin_id,
        ...(search ? {
          $or: [
            { schoolName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { userId: { $regex: search, $options: 'i' } }
          ]
        } : {})
      }).select('userId schoolName email').populate('users', 'email role');

      admins.forEach(admin => {
        allUsers.push({
          _id: admin.users?._id || admin.userId,
          user_id: admin.userId,
          full_name: admin.schoolName,
          email: admin.email || admin.users?.email,
          role: 'admin'
        });
      });

      if (role && role !== 'all') {
        allUsers = allUsers.filter(user => user.role === role);
      }


      users = allUsers.slice(0, 50);
    }

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.sendOrSaveMessage = async (req, res) => {
  try {
    const { recipients, subject, content, status, group, admin_id } = req.body;
    let recipientIds = [];


    if (group) {
      switch (group) {
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

        case 'all_admins':
          const adminUsers = await Admin.find({ users: req.user._id }).select('_id');
          recipientIds = adminUsers.map(user => user._id);
          break;

        case 'all':
          const allUsers = await User.find({ is_active: true, admin_id: req.user._id }).select('_id');
          recipientIds = allUsers.map(user => user._id);
          break;

        default:
          return res.status(400).json({ message: "Invalid group specified" });
      }
    } else {

      recipientIds = Array.isArray(recipients) ? recipients : [recipients];
    }

    if (recipientIds.length === 0) {
      return res.status(400).json({ message: "No valid recipients found" });
    }

    let attachments = [];
    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        const uploaded = await cloudinary.uploader.upload(file.path, {
          folder: "messages",
          resource_type: "auto",
        });
        attachments.push({
          public_id: uploaded.public_id,
          url: uploaded.secure_url,
          name: file.originalname,
        });
        fs.unlinkSync(file.path);
      }
    }


    const messages = await Promise.all(recipientIds.map(async (recipientId) => {
      return await Message.create({
        sender: req.user._id,
        recipients: [recipientId],
        subject,
        content,
        status: status || "sent",
        attachments,
        read: false,
        starred: false,
        deletedAt: null,
        date: new Date(),
        admin_id: admin_id
      });
    }));

    res.status(201).json({
      message: "Message sent successfully",
      count: messages.length,
      messages
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.sendOrSaveMessageUnderMyAdmin = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    
    const { subject, content, status, group } = req.body;
    let recipientIds = [];
    
    // Handle recipients from FormData (they come as recipients[] array)
    const recipients = req.body['recipients[]'] || req.body.recipients;
    console.log('Recipients:', recipients);

    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    console.log('Found teacher:', teacher);
    console.log('Teacher admin_id:', teacher.admin_id);


    if (group) {
      switch (group) {
        case 'all_students':
          const students = await Student.find({ admin_id: teacher.admin_id })
            .populate('users', '_id');
          recipientIds = students.map(student => student.users?._id).filter(Boolean);
          break;

        case 'all_teachers':
          const teachers = await Teacher.find({ admin_id: teacher.admin_id })
            .populate('users', '_id');
          recipientIds = teachers.map(teacher => teacher.users?._id).filter(Boolean);
          break;

        case 'all_parents':
          const parents = await Parent.find({ admin_id: teacher.admin_id })
            .populate('users', '_id');
          recipientIds = parents.map(parent => parent.users?._id).filter(Boolean);
          break;

        case 'all_admins':
          const adminUsers = await Admin.find({ users: teacher.admin_id }).select('_id');
          recipientIds = adminUsers.map(user => user._id);
          break;

        case 'all':
            const allUsers = await User.find({ is_active: true, admin_id: teacher.admin_id }).select('_id');
          recipientIds = allUsers.map(user => user._id);
          break;

        default:
          return res.status(400).json({ message: "Invalid group specified" });
      }
    } else {

      recipientIds = Array.isArray(recipients) ? recipients : [recipients];
    }

    if (recipientIds.length === 0) {
      return res.status(400).json({ message: "No valid recipients found" });
    }

    let attachments = [];
    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        const uploaded = await cloudinary.uploader.upload(file.path, {
          folder: "messages",
          resource_type: "auto",
        });
        attachments.push({
          public_id: uploaded.public_id,
          url: uploaded.secure_url,
          name: file.originalname,
        });
        fs.unlinkSync(file.path);
      }
    }


    console.log('Recipient IDs:', recipientIds);
    console.log('Teacher admin_id:', teacher.admin_id);
    console.log('Content:', content);
    console.log('Subject:', subject);
    
    const messages = await Promise.all(recipientIds.map(async (recipientId) => {
      const messageData = {
        sender: req.user._id,
        recipients: [recipientId],
        subject: subject || '',
        content: content || '',
        status: status || "sent",
        attachments,
        read: false,
        starred: false,
        deletedAt: null,
        date: new Date(),
        admin_id: teacher.admin_id
      };
      console.log('Creating message with data:', messageData);
      return await Message.create(messageData);
    }));

    res.status(201).json({
      message: "Message sent successfully",
      count: messages.length,
      messages
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.sendOrSaveMessageUnderMyAdminForStudent = async (req, res) => {
  try {
    const student = await Student.findOne({ users: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const { subject, content, status, group } = req.body;
    let recipientIds = [];
    
    // Handle recipients from FormData (they come as recipients[] array)
    const recipients = req.body['recipients[]'] || req.body.recipients;

    if (group) {
      switch (group) {
        case 'all_students':
          const students = await Student.find({ admin_id: student.admin_id })
            .populate('users', '_id');
          recipientIds = students.map(student => student.users?._id).filter(Boolean);
          break;

        case 'all_teachers':
          const teachers = await Teacher.find({ admin_id: student.admin_id })
            .populate('users', '_id');
          recipientIds = teachers.map(teacher => teacher.users?._id).filter(Boolean);
          break;

        case 'all_parents':
          const parents = await Parent.find({ admin_id: student.admin_id })
            .populate('users', '_id');
          recipientIds = parents.map(parent => parent.users?._id).filter(Boolean);
          break;

        case 'all_admins':
          const adminUsers = await Admin.find({ users: student.admin_id }).select('_id');
          recipientIds = adminUsers.map(user => user._id);
          break;

        case 'all':
            const allUsers = await User.find({ is_active: true, admin_id: student.admin_id }).select('_id');
          recipientIds = allUsers.map(user => user._id);
          break;

        default:
          return res.status(400).json({ message: "Invalid group specified" });
      }
    } else {

      recipientIds = Array.isArray(recipients) ? recipients : [recipients];
    }

    if (recipientIds.length === 0) {
      return res.status(400).json({ message: "No valid recipients found" });
    }

    let attachments = [];
    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        const uploaded = await cloudinary.uploader.upload(file.path, {
          folder: "messages",
          resource_type: "auto",
        });
        attachments.push({
          public_id: uploaded.public_id,
          url: uploaded.secure_url,
          name: file.originalname,
        });
        fs.unlinkSync(file.path);
      }
    }
    
    const messages = await Promise.all(recipientIds.map(async (recipientId) => {
      const messageData = {
        sender: req.user._id,
        recipients: [recipientId],
        subject: subject || '',
        content: content || '',
        status: status || "sent",
        attachments,
        read: false,
        starred: false,
        deletedAt: null,
        date: new Date(),
        admin_id: student.admin_id
      };
      return await Message.create(messageData);
    }));

    res.status(201).json({
      message: "Message sent successfully",
      count: messages.length,
      messages
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.sendOrSaveMessageUnderMyAdminForParent = async (req, res) => {
  try {
    const parent = await Parent.findOne({ users: req.user._id });
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }
    const { subject, content, status, group } = req.body;
    let recipientIds = [];
    
    // Handle recipients from FormData (they come as recipients[] array)
    const recipients = req.body['recipients[]'] || req.body.recipients;

    if (group) {
      switch (group) {
        case 'all_students':
          const students = await Student.find({ admin_id: parent.admin_id })
            .populate('users', '_id');
          recipientIds = students.map(student => student.users?._id).filter(Boolean);
          break;

        case 'all_teachers':
          const teachers = await Teacher.find({ admin_id: parent.admin_id })
            .populate('users', '_id');
          recipientIds = teachers.map(teacher => teacher.users?._id).filter(Boolean);
          break;

        case 'all_parents':
          const parents = await Parent.find({ admin_id: parent.admin_id })
            .populate('users', '_id');
          recipientIds = parents.map(parent => parent.users?._id).filter(Boolean);
          break;

        case 'all_admins':
          const adminUsers = await Admin.find({ users: parent.admin_id }).select('_id');
          recipientIds = adminUsers.map(user => user._id);
          break;

        case 'all':
            const allUsers = await User.find({ is_active: true, admin_id: parent.admin_id }).select('_id');
          recipientIds = allUsers.map(user => user._id);
          break;

        default:
          return res.status(400).json({ message: "Invalid group specified" });
      }
    } else {

      recipientIds = Array.isArray(recipients) ? recipients : [recipients];
    }

    if (recipientIds.length === 0) {
      return res.status(400).json({ message: "No valid recipients found" });
    }

    let attachments = [];
    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        const uploaded = await cloudinary.uploader.upload(file.path, {
          folder: "messages",
          resource_type: "auto",
        });
        attachments.push({
          public_id: uploaded.public_id,
          url: uploaded.secure_url,
          name: file.originalname,
        });
        fs.unlinkSync(file.path);
      }
    }
    
    const messages = await Promise.all(recipientIds.map(async (recipientId) => {
      const messageData = {
        sender: req.user._id,
        recipients: [recipientId],
        subject: subject || '',
        content: content || '',
        status: status || "sent",
        attachments,
        read: false,
        starred: false,
        deletedAt: null,
        date: new Date(),
        admin_id: parent.admin_id
      };
      return await Message.create(messageData);
    }));

    res.status(201).json({
      message: "Message sent successfully",
      count: messages.length,
      messages
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getMessagesUnderMyAdmin = async (req, res) => {
  try {
    const { tab, search, status, dateRange } = req.query;

    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }


    let filter = {};
    if (tab === 'inbox') {
      filter = {
        recipients: req.user._id,
        status: { $nin: ['draft', 'trash'] },
        admin_id: teacher.admin_id
      };
    } else if (tab === 'sent') {
      filter = {
        sender: req.user._id,
        status: 'sent',
        admin_id: teacher.admin_id
      };
    } else if (tab === 'drafts') {
      filter = {
        sender: req.user._id,
        status: 'draft',
        admin_id: teacher.admin_id
      };
    } else if (tab === 'starred') {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
        starred: true,
        status: { $ne: 'trash' },
        admin_id: teacher.admin_id
      };
    } else if (tab === 'trash') {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
        status: 'trash',
        admin_id: teacher.admin_id
      };
    } else {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
        admin_id: teacher.admin_id
      };
    }

    if (search) {
      // Add search to existing filter without overwriting
      const searchFilter = {
        $or: [
          { subject: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
        ]
      };
      
      // Combine with existing filter
      filter = { $and: [filter, searchFilter] };
    }

    if (status) {
      filter.status = status;
    }

    if (dateRange) {
      const now = new Date();
      let startDate, endDate;
      if (dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (dateRange === 'week') {
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.setDate(now.getDate() - now.getDay() + 7));
        endDate.setHours(0, 0, 0, 0);
      } else if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else if (dateRange === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
      }
      filter.date = { $gte: startDate, $lt: endDate };
    }
    
    const messages = await Message.find(filter)
      .populate('sender', 'email full_name role')
      .populate('recipients', 'email full_name role')
      .sort({ date: -1 });

    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMessagesUnderMyAdminForStudent = async (req, res) => {
  try {
    const student = await Student.findOne({ users: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const { tab, search, status, dateRange } = req.query;

    // const teacher = await Teacher.findOne({ users: req.user._id });
    // if (!teacher) {
    //   return res.status(404).json({ message: 'Teacher not found' });
    // }


    let filter = {};
    if (tab === 'inbox') {
      filter = {
        recipients: req.user._id,
        status: { $nin: ['draft', 'trash'] },
        admin_id: student.admin_id
      };
    } else if (tab === 'sent') {
      filter = {
        sender: req.user._id,
        status: 'sent',
        admin_id: student.admin_id
      };
    } else if (tab === 'drafts') {
      filter = {
        sender: req.user._id,
        status: 'draft',
        admin_id: student.admin_id
      };
    } else if (tab === 'starred') {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
        starred: true,
        status: { $ne: 'trash' },
        admin_id: student.admin_id
      };
    } else if (tab === 'trash') {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
        status: 'trash',
        admin_id: student.admin_id
      };
    } else {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
        admin_id: student.admin_id
      };
    }

    if (search) {
      // Add search to existing filter without overwriting
      const searchFilter = {
        $or: [
          { subject: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
        ]
      };
      
      // Combine with existing filter
      filter = { $and: [filter, searchFilter] };
    }

    if (status) {
      filter.status = status;
    }

    if (dateRange) {
      const now = new Date();
      let startDate, endDate;
      if (dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (dateRange === 'week') {
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.setDate(now.getDate() - now.getDay() + 7));
        endDate.setHours(0, 0, 0, 0);
      } else if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else if (dateRange === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
      }
      filter.date = { $gte: startDate, $lt: endDate };
    }
    
    const messages = await Message.find(filter)
      .populate('sender', 'email full_name role')
      .populate('recipients', 'email full_name role')
      .sort({ date: -1 });
    
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getMessagesUnderMyAdminForParent = async (req, res) => {
  try {
    const parent = await Parent.findOne({ users: req.user._id });
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }
    const { tab, search, status, dateRange } = req.query;

    let filter = {};
    if (tab === 'inbox') {
      filter = {
        recipients: req.user._id,
        status: { $nin: ['draft', 'trash'] },
        admin_id: parent.admin_id
      };
    } else if (tab === 'sent') {
      filter = {
        sender: req.user._id,
        status: 'sent',
        admin_id: parent.admin_id
      };
    } else if (tab === 'drafts') {
      filter = {
        sender: req.user._id,
        status: 'draft',
        admin_id: parent.admin_id
      };
    } else if (tab === 'starred') {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
        starred: true,
        status: { $ne: 'trash' },
        admin_id: parent.admin_id
      };
    } else if (tab === 'trash') {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
        status: 'trash',
        admin_id: parent.admin_id
      };
    } else {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
        admin_id: parent.admin_id
      };
    }

    if (search) {
      // Add search to existing filter without overwriting
      const searchFilter = {
        $or: [
          { subject: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
        ]
      };
      
      // Combine with existing filter
      filter = { $and: [filter, searchFilter] };
    }

    if (status) {
      filter.status = status;
    }

    if (dateRange) {
      const now = new Date();
      let startDate, endDate;
      if (dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (dateRange === 'week') {
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.setDate(now.getDate() - now.getDay() + 7));
        endDate.setHours(0, 0, 0, 0);
      } else if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else if (dateRange === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
      }
      filter.date = { $gte: startDate, $lt: endDate };
    }
    
    const messages = await Message.find(filter)
      .populate('sender', 'email full_name role')
      .populate('recipients', 'email full_name role')
      .sort({ date: -1 });
  
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { tab, search, status, dateRange } = req.query;
    let filter = {};
    if (tab === 'inbox') {
      filter = {
        recipients: req.user._id,
        status: { $nin: ['draft', 'trash'] },
        admin_id: req.user._id
      };
    } else if (tab === 'sent') {
      filter = {
        sender: req.user._id,
        status: 'sent',
        admin_id: req.user._id
      };
    } else if (tab === 'drafts') {
      filter = {
        sender: req.user._id,
        status: 'draft',
        admin_id: req.user._id
      };
    } else if (tab === 'starred') {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
        starred: true,
        status: { $ne: 'trash' },
        admin_id: req.user._id
      };
    } else if (tab === 'trash') {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
        status: 'trash',
      };
    } else {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
      };
    }

    if (search) {
      // Add search to existing filter without overwriting
      const searchFilter = {
        $or: [
          { subject: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
        ]
      };
      
      // Combine with existing filter
      filter = { $and: [filter, searchFilter] };
    }

    if (status) {
      filter.status = status;
    }

    if (dateRange) {
      const now = new Date();
      let startDate, endDate;
      if (dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (dateRange === 'week') {
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.setDate(now.getDate() - now.getDay() + 7));
        endDate.setHours(0, 0, 0, 0);
      } else if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else if (dateRange === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
      }
      filter.date = { $gte: startDate, $lt: endDate };
    }
    
    const messages = await Message.find(filter)
      .populate('sender', 'email full_name role')
      .populate('recipients', 'email full_name role')
      .sort({ date: -1 });
    
    // if (messages.length > 0) {
    //   console.log('Admin getMessages - Sample message:', {
    //     id: messages[0]._id,
    //     sender: messages[0].sender,
    //     status: messages[0].status,
    //     admin_id: messages[0].admin_id
    //   });
    // }
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getMessagesForStudent = async (req, res) => {
  try {
    const student = await Student.findOne({ users: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const { tab, search, status, dateRange } = req.query;
    let filter = {};
    if (tab === 'inbox') {
      filter = {
        recipients: req.user._id,
        status: { $nin: ['draft', 'trash'] },
        admin_id: student.admin_id
      };
    } else if (tab === 'sent') {
      filter = {
        sender: req.user._id,
        status: 'sent',
        admin_id: student.admin_id
      };
    } else if (tab === 'drafts') {
      filter = {
        sender: req.user._id,
        status: 'draft',
        admin_id: student.admin_id
      };
    } else if (tab === 'starred') {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
        starred: true,
        status: { $ne: 'trash' },
        admin_id: student.admin_id
      };
    } else if (tab === 'trash') {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
        status: 'trash',
      };
    } else {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
      };
    }

    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (dateRange) {
      const now = new Date();
      let startDate, endDate;
      if (dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (dateRange === 'week') {
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.setDate(now.getDate() - now.getDay() + 7));
        endDate.setHours(0, 0, 0, 0);
      } else if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else if (dateRange === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
      }
      filter.date = { $gte: startDate, $lt: endDate };
    }
    const messages = await Message.find(filter, { admin_id: student.admin_id })
      .populate('sender', 'email full_name role')
      .populate('recipients', 'email full_name role')
      .sort({ date: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMessagesForParent = async (req, res) => {
  try {
    const parent = await Parent.findOne({ users: req.user._id });
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }
    const { tab, search, status, dateRange } = req.query;
    let filter = {};
    if (tab === 'inbox') {
      filter = {
        recipients: req.user._id,
        status: { $nin: ['draft', 'trash'] },
        admin_id: parent.admin_id
      };
    } else if (tab === 'sent') {
      filter = {
        sender: req.user._id,
        status: 'sent',
        admin_id: parent.admin_id
      };
    } else if (tab === 'drafts') {
      filter = {
        sender: req.user._id,
        status: 'draft',
        admin_id: parent.admin_id
      };
    } else if (tab === 'starred') {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
        starred: true,
        status: { $ne: 'trash' },
        admin_id: parent.admin_id
      };
    } else if (tab === 'trash') {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
        status: 'trash',
      };
    } else {
      filter = {
        $or: [
          { sender: req.user._id },
          { recipients: req.user._id },
        ],
      };
    }

    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (dateRange) {
      const now = new Date();
      let startDate, endDate;
      if (dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (dateRange === 'week') {
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.setDate(now.getDate() - now.getDay() + 7));
        endDate.setHours(0, 0, 0, 0);
      } else if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else if (dateRange === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
      }
      filter.date = { $gte: startDate, $lt: endDate };
    }
    const messages = await Message.find(filter, { admin_id: parent.admin_id })
      .populate('sender', 'email full_name role')
      .populate('recipients', 'email full_name role')
      .sort({ date: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.markAsRead = async (req, res) => {
  try {
    console.log('markAsRead called for user:', req.user._id);
    
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    console.log('Message sender:', message.sender);
    console.log('Message recipients:', message.recipients);
    console.log('User is sender:', message.sender && message.sender.equals ? message.sender.equals(req.user._id) : false);
    console.log('User is recipient:', message.recipients && message.recipients.includes ? message.recipients.includes(req.user._id) : false);
    
    // Check if user is sender (handle both ObjectId and string comparisons)
    const isSender = message.sender && (
      (typeof message.sender === 'object' && message.sender.equals && message.sender.equals(req.user._id)) ||
      (typeof message.sender === 'string' && message.sender === req.user._id.toString()) ||
      (message.sender._id && message.sender._id.toString() === req.user._id.toString())
    );
    
    // Check if user is recipient
    const isRecipient = message.recipients && message.recipients.some(recipient => 
      (typeof recipient === 'object' && recipient.equals && recipient.equals(req.user._id)) ||
      (typeof recipient === 'string' && recipient === req.user._id.toString()) ||
      (recipient._id && recipient._id.toString() === req.user._id.toString())
    );
    
    // Allow both sender and recipients to mark as read
    if (!isSender && !isRecipient) {
      return res.status(403).json({ 
        message: "Unauthorized - User is neither sender nor recipient of this message",
        userId: req.user._id,
        sender: message.sender,
        recipients: message.recipients,
        isSender,
        isRecipient
      });
    }
    
    message.read = true;
    message.admin_id = req.user._id;
    await message.save();
    res.json({ message: "Marked as read" });
  } catch (error) {
    console.error('Error in markAsRead:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.markAsReadUnderMyAdmin = async (req, res) => {
  try {
    console.log('markAsReadUnderMyAdmin called');
    console.log('req.user:', req.user);
    console.log('req.headers:', req.headers);
    
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    if (!req.user._id) {
      return res.status(400).json({ message: 'User ID not found' });
    }
    
    console.log('User role:', req.user.role);
    console.log('User ID:', req.user._id);
    
    const teacher = await Teacher.findOne({ users: req.user._id });
    console.log('Teacher found:', !!teacher);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found for user ID: ' + req.user._id });
    }

    const message = await Message.findById(req.params.id);
    console.log('Message found:', !!message);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    console.log('Message sender:', message.sender);
    console.log('Message recipients:', message.recipients);
    console.log('User is sender:', message.sender && message.sender.equals ? message.sender.equals(req.user._id) : false);
    console.log('User is recipient:', message.recipients && message.recipients.includes ? message.recipients.includes(req.user._id) : false);
    
    // Check if user is sender (handle both ObjectId and string comparisons)
    const isSender = message.sender && (
      (typeof message.sender === 'object' && message.sender.equals && message.sender.equals(req.user._id)) ||
      (typeof message.sender === 'string' && message.sender === req.user._id.toString()) ||
      (message.sender._id && message.sender._id.toString() === req.user._id.toString())
    );
    
    // Check if user is recipient
    const isRecipient = message.recipients && message.recipients.some(recipient => 
      (typeof recipient === 'object' && recipient.equals && recipient.equals(req.user._id)) ||
      (typeof recipient === 'string' && recipient === req.user._id.toString()) ||
      (recipient._id && recipient._id.toString() === req.user._id.toString())
    );
    
    // Allow both sender and recipients to mark as read
    if (!isSender && !isRecipient) {
      return res.status(403).json({ 
        message: "Unauthorized - User is neither sender nor recipient of this message",
        userId: req.user._id,
        sender: message.sender,
        recipients: message.recipients,
        isSender,
        isRecipient
      });
    }
    
    message.read = true;
    message.admin_id = teacher.admin_id;
    await message.save();
    res.json({ message: "Marked as read" });
  } catch (error) {
    console.error('Error in markAsReadUnderMyAdmin:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.markAsReadUnderMyAdminForStudent = async (req, res) => {
  try {
    console.log('markAsReadUnderMyAdmin called');
    console.log('req.user:', req.user);
    console.log('req.headers:', req.headers);
    
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    if (!req.user._id) {
      return res.status(400).json({ message: 'User ID not found' });
    }
    
    console.log('User role:', req.user.role);
    console.log('User ID:', req.user._id);
    
    const student = await Student.findOne({ users: req.user._id });
    console.log('Student found:', !!student);
    if (!student) {
      return res.status(404).json({ message: 'Student not found for user ID: ' + req.user._id });
    }

    const message = await Message.findById(req.params.id);
    console.log('Message found:', !!message);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    console.log('Message sender:', message.sender);
    console.log('Message recipients:', message.recipients);
    console.log('User is sender:', message.sender && message.sender.equals ? message.sender.equals(req.user._id) : false);
    console.log('User is recipient:', message.recipients && message.recipients.includes ? message.recipients.includes(req.user._id) : false);
    
    // Check if user is sender (handle both ObjectId and string comparisons)
    const isSender = message.sender && (
      (typeof message.sender === 'object' && message.sender.equals && message.sender.equals(req.user._id)) ||
      (typeof message.sender === 'string' && message.sender === req.user._id.toString()) ||
      (message.sender._id && message.sender._id.toString() === req.user._id.toString())
    );
    
    // Check if user is recipient
    const isRecipient = message.recipients && message.recipients.some(recipient => 
      (typeof recipient === 'object' && recipient.equals && recipient.equals(req.user._id)) ||
      (typeof recipient === 'string' && recipient === req.user._id.toString()) ||
      (recipient._id && recipient._id.toString() === req.user._id.toString())
    );
    
    // Allow both sender and recipients to mark as read
    if (!isSender && !isRecipient) {
      return res.status(403).json({ 
        message: "Unauthorized - User is neither sender nor recipient of this message",
        userId: req.user._id,
        sender: message.sender,
        recipients: message.recipients,
        isSender,
        isRecipient
      });
    }
    
    message.read = true;
    message.admin_id = student.admin_id;
    await message.save();
    res.json({ message: "Marked as read" });
  } catch (error) {
    console.error('Error in markAsReadUnderMyAdmin:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.markAsReadUnderMyAdminForParent = async (req, res) => {
  try {
    console.log('markAsReadUnderMyAdmin called');
    console.log('req.user:', req.user);
    console.log('req.headers:', req.headers);
    
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    if (!req.user._id) {
      return res.status(400).json({ message: 'User ID not found' });
    }
    
    console.log('User role:', req.user.role);
    console.log('User ID:', req.user._id);
    
    const parent = await Parent.findOne({ users: req.user._id });
    console.log('Parent found:', !!parent);
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found for user ID: ' + req.user._id });
    }

    const message = await Message.findById(req.params.id);
    console.log('Message found:', !!message);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    console.log('Message sender:', message.sender);
    console.log('Message recipients:', message.recipients);
    console.log('User is sender:', message.sender && message.sender.equals ? message.sender.equals(req.user._id) : false);
    console.log('User is recipient:', message.recipients && message.recipients.includes ? message.recipients.includes(req.user._id) : false);
    
    // Check if user is sender (handle both ObjectId and string comparisons)
    const isSender = message.sender && (
      (typeof message.sender === 'object' && message.sender.equals && message.sender.equals(req.user._id)) ||
      (typeof message.sender === 'string' && message.sender === req.user._id.toString()) ||
      (message.sender._id && message.sender._id.toString() === req.user._id.toString())
    );
    
    // Check if user is recipient
    const isRecipient = message.recipients && message.recipients.some(recipient => 
      (typeof recipient === 'object' && recipient.equals && recipient.equals(req.user._id)) ||
      (typeof recipient === 'string' && recipient === req.user._id.toString()) ||
      (recipient._id && recipient._id.toString() === req.user._id.toString())
    );
    
    // Allow both sender and recipients to mark as read
    if (!isSender && !isRecipient) {
      return res.status(403).json({ 
        message: "Unauthorized - User is neither sender nor recipient of this message",
        userId: req.user._id,
        sender: message.sender,
        recipients: message.recipients,
        isSender,
        isRecipient
      });
    }
    
    message.read = true;
    message.admin_id = parent.admin_id;
    await message.save();
    res.json({ message: "Marked as read" });
  } catch (error) {
    console.error('Error in markAsReadUnderMyAdminForParent:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    // Check if user is sender or recipient (handle both ObjectId and string comparisons)
    const isSender = message.sender && (
      (typeof message.sender === 'object' && message.sender.equals && message.sender.equals(req.user._id)) ||
      (typeof message.sender === 'string' && message.sender === req.user._id.toString()) ||
      (message.sender._id && message.sender._id.toString() === req.user._id.toString())
    );
    
    const isRecipient = message.recipients && message.recipients.some(recipient => 
      (typeof recipient === 'object' && recipient.equals && recipient.equals(req.user._id)) ||
      (typeof recipient === 'string' && recipient === req.user._id.toString()) ||
      (recipient._id && recipient._id.toString() === req.user._id.toString())
    );
    
    if (!isSender && !isRecipient) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    message.status = 'trash';
    message.deletedAt = new Date();
    await message.save();
    res.json({ message: "Moved to trash" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteMessageUnderMyAdmin = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    // Check if user is sender or recipient (handle both ObjectId and string comparisons)
    const isSender = message.sender && (
      (typeof message.sender === 'object' && message.sender.equals && message.sender.equals(req.user._id)) ||
      (typeof message.sender === 'string' && message.sender === req.user._id.toString()) ||
      (message.sender._id && message.sender._id.toString() === req.user._id.toString())
    );
    
    const isRecipient = message.recipients && message.recipients.some(recipient => 
      (typeof recipient === 'object' && recipient.equals && recipient.equals(req.user._id)) ||
      (typeof recipient === 'string' && recipient === req.user._id.toString()) ||
      (recipient._id && recipient._id.toString() === req.user._id.toString())
    );
    
    if (!isSender && !isRecipient) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    message.status = 'trash';
    message.deletedAt = new Date();
    message.admin_id = teacher.admin_id;
    await message.save();
    res.json({ message: "Moved to trash" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteMessageUnderMyAdminForStudent = async (req, res) => {
  try {
    const student = await Student.findOne({ users: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    // Check if user is sender or recipient (handle both ObjectId and string comparisons)
    const isSender = message.sender && (
      (typeof message.sender === 'object' && message.sender.equals && message.sender.equals(req.user._id)) ||
      (typeof message.sender === 'string' && message.sender === req.user._id.toString()) ||
      (message.sender._id && message.sender._id.toString() === req.user._id.toString())
    );
    
    const isRecipient = message.recipients && message.recipients.some(recipient => 
      (typeof recipient === 'object' && recipient.equals && recipient.equals(req.user._id)) ||
      (typeof recipient === 'string' && recipient === req.user._id.toString()) ||
      (recipient._id && recipient._id.toString() === req.user._id.toString())
    );
    
    if (!isSender && !isRecipient) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    message.status = 'trash';
    message.deletedAt = new Date();
    message.admin_id = student.admin_id;
    await message.save();
    res.json({ message: "Moved to trash" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteMessageUnderMyAdminForParent = async (req, res) => {
  try {
    const parent = await Parent.findOne({ users: req.user._id });
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    // Check if user is sender or recipient (handle both ObjectId and string comparisons)
    const isSender = message.sender && (
      (typeof message.sender === 'object' && message.sender.equals && message.sender.equals(req.user._id)) ||
      (typeof message.sender === 'string' && message.sender === req.user._id.toString()) ||
      (message.sender._id && message.sender._id.toString() === req.user._id.toString())
    );
    
    const isRecipient = message.recipients && message.recipients.some(recipient => 
      (typeof recipient === 'object' && recipient.equals && recipient.equals(req.user._id)) ||
      (typeof recipient === 'string' && recipient === req.user._id.toString()) ||
      (recipient._id && recipient._id.toString() === req.user._id.toString())
    );
    
    if (!isSender && !isRecipient) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    message.status = 'trash';
    message.deletedAt = new Date();
    message.admin_id = parent.admin_id;
    await message.save();
    res.json({ message: "Moved to trash" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.undoDelete = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    // Check if user is sender or recipient (handle both ObjectId and string comparisons)
    const isSender = message.sender && (
      (typeof message.sender === 'object' && message.sender.equals && message.sender.equals(req.user._id)) ||
      (typeof message.sender === 'string' && message.sender === req.user._id.toString()) ||
      (message.sender._id && message.sender._id.toString() === req.user._id.toString())
    );
    
    const isRecipient = message.recipients && message.recipients.some(recipient => 
      (typeof recipient === 'object' && recipient.equals && recipient.equals(req.user._id)) ||
      (typeof recipient === 'string' && recipient === req.user._id.toString()) ||
      (recipient._id && recipient._id.toString() === req.user._id.toString())
    );
    
    if (!isSender && !isRecipient) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    message.status = message.status === 'trash' ? 'sent' : message.status;
    message.deletedAt = null;
    await message.save();
    res.json({ message: "Restored from trash" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.undoDeleteUnderMyAdmin = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    // Check if user is sender or recipient (handle both ObjectId and string comparisons)
    const isSender = message.sender && (
      (typeof message.sender === 'object' && message.sender.equals && message.sender.equals(req.user._id)) ||
      (typeof message.sender === 'string' && message.sender === req.user._id.toString()) ||
      (message.sender._id && message.sender._id.toString() === req.user._id.toString())
    );
    
    const isRecipient = message.recipients && message.recipients.some(recipient => 
      (typeof recipient === 'object' && recipient.equals && recipient.equals(req.user._id)) ||
      (typeof recipient === 'string' && recipient === req.user._id.toString()) ||
      (recipient._id && recipient._id.toString() === req.user._id.toString())
    );
    
    if (!isSender && !isRecipient) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    message.status = message.status === 'trash' ? 'sent' : message.status;
    message.deletedAt = null;
    message.admin_id = teacher.admin_id;
    await message.save();
    res.json({ message: "Restored from trash" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.undoDeleteUnderMyAdminForStudent = async (req, res) => {
  try {
    const student = await Student.findOne({ users: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    // Check if user is sender or recipient (handle both ObjectId and string comparisons)
    const isSender = message.sender && (
      (typeof message.sender === 'object' && message.sender.equals && message.sender.equals(req.user._id)) ||
      (typeof message.sender === 'string' && message.sender === req.user._id.toString()) ||
      (message.sender._id && message.sender._id.toString() === req.user._id.toString())
    );
    
    const isRecipient = message.recipients && message.recipients.some(recipient => 
      (typeof recipient === 'object' && recipient.equals && recipient.equals(req.user._id)) ||
      (typeof recipient === 'string' && recipient === req.user._id.toString()) ||
      (recipient._id && recipient._id.toString() === req.user._id.toString())
    );
    
    if (!isSender && !isRecipient) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    message.status = message.status === 'trash' ? 'sent' : message.status;
    message.deletedAt = null;
    message.admin_id = student.admin_id;
    await message.save();
    res.json({ message: "Restored from trash" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.undoDeleteUnderMyAdminForParent = async (req, res) => {
  try {
    const parent = await Parent.findOne({ users: req.user._id });
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    // Check if user is sender or recipient (handle both ObjectId and string comparisons)
    const isSender = message.sender && (
      (typeof message.sender === 'object' && message.sender.equals && message.sender.equals(req.user._id)) ||
      (typeof message.sender === 'string' && message.sender === req.user._id.toString()) ||
      (message.sender._id && message.sender._id.toString() === req.user._id.toString())
    );
    
    const isRecipient = message.recipients && message.recipients.some(recipient => 
      (typeof recipient === 'object' && recipient.equals && recipient.equals(req.user._id)) ||
      (typeof recipient === 'string' && recipient === req.user._id.toString()) ||
      (recipient._id && recipient._id.toString() === req.user._id.toString())
    );
    
    if (!isSender && !isRecipient) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    message.status = message.status === 'trash' ? 'sent' : message.status;
    message.deletedAt = null;
    message.admin_id = parent.admin_id;
    await message.save();
    res.json({ message: "Restored from trash" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.permanentDelete = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    // Check if user is sender or recipient (handle both ObjectId and string comparisons)
    const isSender = message.sender && (
      (typeof message.sender === 'object' && message.sender.equals && message.sender.equals(req.user._id)) ||
      (typeof message.sender === 'string' && message.sender === req.user._id.toString()) ||
      (message.sender._id && message.sender._id.toString() === req.user._id.toString())
    );
    
    const isRecipient = message.recipients && message.recipients.some(recipient => 
      (typeof recipient === 'object' && recipient.equals && recipient.equals(req.user._id)) ||
      (typeof recipient === 'string' && recipient === req.user._id.toString()) ||
      (recipient._id && recipient._id.toString() === req.user._id.toString())
    );
    
    if (!isSender && !isRecipient) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    await message.deleteOne();
    res.json({ message: "Deleted permanently" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.permanentDeleteUnderMyAdmin = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    // Check if user is sender or recipient (handle both ObjectId and string comparisons)
    const isSender = message.sender && (
      (typeof message.sender === 'object' && message.sender.equals && message.sender.equals(req.user._id)) ||
      (typeof message.sender === 'string' && message.sender === req.user._id.toString()) ||
      (message.sender._id && message.sender._id.toString() === req.user._id.toString())
    );
    
    const isRecipient = message.recipients && message.recipients.some(recipient => 
      (typeof recipient === 'object' && recipient.equals && recipient.equals(req.user._id)) ||
      (typeof recipient === 'string' && recipient === req.user._id.toString()) ||
      (recipient._id && recipient._id.toString() === req.user._id.toString())
    );
    
    if (!isSender && !isRecipient) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await message.deleteOne();
    res.json({ message: "Deleted permanently" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.permanentDeleteUnderMyAdminForStudent = async (req, res) => {
  try {
    const student = await Student.findOne({ users: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    // Check if user is sender or recipient (handle both ObjectId and string comparisons)
    const isSender = message.sender && (
      (typeof message.sender === 'object' && message.sender.equals && message.sender.equals(req.user._id)) ||
      (typeof message.sender === 'string' && message.sender === req.user._id.toString()) ||
      (message.sender._id && message.sender._id.toString() === req.user._id.toString())
    );
    
    const isRecipient = message.recipients && message.recipients.some(recipient => 
      (typeof recipient === 'object' && recipient.equals && recipient.equals(req.user._id)) ||
      (typeof recipient === 'string' && recipient === req.user._id.toString()) ||
      (recipient._id && recipient._id.toString() === req.user._id.toString())
    );
    
    if (!isSender && !isRecipient) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await message.deleteOne();
    res.json({ message: "Deleted permanently" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.permanentDeleteUnderMyAdminForParent = async (req, res) => {
  try {
    const parent = await Parent.findOne({ users: req.user._id });
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    // Check if user is sender or recipient (handle both ObjectId and string comparisons)
    const isSender = message.sender && (
      (typeof message.sender === 'object' && message.sender.equals && message.sender.equals(req.user._id)) ||
      (typeof message.sender === 'string' && message.sender === req.user._id.toString()) ||
      (message.sender._id && message.sender._id.toString() === req.user._id.toString())
    );
    
    const isRecipient = message.recipients && message.recipients.some(recipient => 
      (typeof recipient === 'object' && recipient.equals && recipient.equals(req.user._id)) ||
      (typeof recipient === 'string' && recipient === req.user._id.toString()) ||
      (recipient._id && recipient._id.toString() === req.user._id.toString())
    );
    
    if (!isSender && !isRecipient) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await message.deleteOne();
    res.json({ message: "Deleted permanently" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.toggleStar = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    
    // Check if user is sender or recipient (handle both ObjectId and string comparisons)
    const isSender = message.sender && (
      (typeof message.sender === 'object' && message.sender.equals && message.sender.equals(req.user._id)) ||
      (typeof message.sender === 'string' && message.sender === req.user._id.toString()) ||
      (message.sender._id && message.sender._id.toString() === req.user._id.toString())
    );
    
    const isRecipient = message.recipients && message.recipients.some(recipient => 
      (typeof recipient === 'object' && recipient.equals && recipient.equals(req.user._id)) ||
      (typeof recipient === 'string' && recipient === req.user._id.toString()) ||
      (recipient._id && recipient._id.toString() === req.user._id.toString())
    );
    
    if (!isSender && !isRecipient) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    message.starred = !message.starred;
    await message.save();
    res.json({ message: "Star status toggled", starred: message.starred });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

