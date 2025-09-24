const Parent = require('../../models/CoreUser/Parent');
const Student = require('../../models/CoreUser/Student');
const cloudinary = require('../../config/cloudinary');
const User = require('../../models/CoreUser/User');
const bcrypt = require("bcryptjs");
const { getParentStudents, removeStudentFromParent } = require('../../utils/relationshipUtils');
const Teacher = require('../../models/CoreUser/Teacher');


exports.createParent = async (req, res) => {
  try {
    const { user_id, full_name, email, password, phone, address, childrenCount, profileImage, admin_id } = req.body;

    if (!user_id || !full_name || !email || !password || !phone) {
      return res.status(400).json({ message: 'Missing required fields' });
    }


    const existingUser = await User.findOne({ user_id });
    if (existingUser) {
      return res.status(400).json({ message: 'User ID already exists' });
    }


    // const newUser = await User.create({
    //   user_id,
    //   email,
    //   password,
    //   role: 'parent',
    // });
    const newUser = await User.create({
      user_id,
      full_name,
      email,
      password,
      phone,
      role: 'parent',
      profileImage,
      status: "Active",
    });

    const parent = await Parent.create({
      user_id,
      full_name,
      email,
      password,
      phone,
      role: 'parent',
      profileImage,
      childrenCount: childrenCount || 1,
      // childrenCount,
      address: address || '',
      // address,
      users: newUser._id,
      status: "Active",
      admin_id
    });

    res.status(201).json({
      message: 'Parent created successfully',
      parent,
      user: {
        id: newUser._id,
        user_id: newUser.user_id,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error('Error creating parent:', err);
    res.status(400).json({
      message: err.message.includes('duplicate key') ?
        'Duplicate user_id or email' :
        'Failed to create parent',
      error: err.message
    });
  }
};


exports.getAllParents = async (req, res) => {
  try {
    const parents = await Parent.find({ admin_id: req.user._id })
      .populate('children', 'user_id full_name admission_number class_id email contact status')
      .select('-__v');
    res.json(parents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllParentsUnderMyAdmin = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    const parents = await Parent.find({ admin_id: teacher.admin_id })
      .populate('children', 'user_id full_name admission_number class_id email contact status')
      .select('-__v');
    res.json(parents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


exports.getParentById = async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.id)
      .populate('children', 'user_id full_name admission_number class_id email contact status');
    if (!parent) return res.status(404).json({ message: 'Parent not found' });
    res.json(parent);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.updateParent = async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.id);
    if (!parent) return res.status(404).json({ message: 'Parent not found' });

    const {
      full_name,
      phone,
      // occupation,
      address
      // relationship
    } = req.body;

    if(parent.users)
    {
      const user = await User.findById(parent.users);
      if(user)
      {
        const userFields = ['full_name', 'phone', 'address'];
        userFields.forEach(field => {
          if(field === 'full_name' && req.body.full_name)
          {
            user.full_name = req.body.full_name;
          }
          else if(field === 'phone' && req.body.phone)
          {
            user.phone = req.body.phone;
          }
          else if(field === 'address' && req.body.address)
          {
            user.address = req.body.address;
          }
        });
        await user.save();
      }
    }

    if (full_name) parent.full_name = full_name;
    if (phone) parent.phone = phone;
    // if (occupation) parent.occupation = occupation;
    if (address) parent.address = address;
    // if (relationship) parent.relationship = relationship;


    // if (req.file) {
    //   // Optional: delete old image from Cloudinary if stored with public_id
    //   parent.profileImage = req.file.path;
    // }

    const updated = await parent.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


exports.deleteParent = async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.id);
    if (!parent) return res.status(404).json({ message: 'Parent not found' });

    const imageUrl = parent.profileImage;
    let publicId = null;
    
    if (imageUrl) {
      publicId = imageUrl.split('/').pop().split('.')[0];
    }

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


    if (parent.users) {
      await User.findByIdAndDelete(parent.users);
    }


    const students = await Student.find({ _id: { $in: parent.children } });


    for (const student of students) {
      if (student.users) {
        await User.findByIdAndDelete(student.users);
      }
      await student.deleteOne();
    }


    await parent.deleteOne();
    res.json({ message: 'Parent deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyParentProfile = async (req, res) => {
  try {

    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Access denied: Parents only' });
    }

    const parent = await Parent.findOne({ users: req.user._id });

    if (!parent) {
      return res.status(404).json({ message: 'Parent profile not found' });
    }


    if (!req.user.is_active) {
      return res.status(403).json({ message: 'Parent account is inactive' });
    }


    const students = await Student.find({
      parent_id: { $in: [parent._id.toString()] }
    });


    const studentsWithClassDetails = await Promise.all(
      students.map(async (student) => {
        let classDetails = null;
        if (student.class_id) {
          try {
            const Class = require('../../models/AcademicSchema/Class');
            classDetails = await Class.findOne({ class_name: student.class_id });
          } catch (err) {
            console.error('Error fetching class details:', err);
          }
        }
        const classTeacher = classDetails ? `${classDetails.class_name}-${classDetails.section}` : 'N/A';
        const teacher = await Teacher.findOne({ class_teacher:classTeacher,admin_id: parent.admin_id });

        
        return {
          ...student.toObject(),
          class_id: classDetails,
          teacher: teacher.user_id,
          teacherName: teacher.full_name,
        };
      })
    );

    res.json({
      parent,
      linkedStudents: studentsWithClassDetails,
    });
  } catch (err) {
    console.error('Error in getMyParentProfile:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.getParentCount = async (req, res) => {
  try {
    
    let adminIdToFilter;

    if (req.user.role === 'admin') {
      adminIdToFilter = req.user._id;
    } else if (req.user.role === 'super_admin') {
      // Superadmin can see all parents
      adminIdToFilter = null;
    } else {
      return res.status(403).json({ message: 'Unauthorized user' });
    }

    const query = adminIdToFilter ? { admin_id: adminIdToFilter } : {};
    const count = await Parent.countDocuments(query);
  
    res.json({ count });
  } catch (err) {
    console.error('Error in getParentCount:', err);
    res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};