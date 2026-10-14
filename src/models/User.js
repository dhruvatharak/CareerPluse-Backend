/**
 * CareerPulse AI - User Model
 * Represents a registered Tamil Nadu student or administrator with reservation category and district.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { TN_DISTRICTS, RESERVATION_CATEGORIES, USER_ROLES } from '../utils/constants.js';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide student name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Do not include in queries by default for security
    },
    district: {
      type: String,
      required: [true, 'Please select your Tamil Nadu district'],
      enum: {
        values: TN_DISTRICTS,
        message: '{VALUE} is not a valid Tamil Nadu district'
      }
    },
    category: {
      type: String,
      required: [true, 'Please select your reservation category'],
      enum: {
        values: RESERVATION_CATEGORIES,
        message: '{VALUE} is not a valid category (OC, BC, BCM, MBC, SC, SCA, ST)'
      }
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'student'
    },
    // Academic details stored progressively
    tenthMarks: {
      total: { type: Number, default: 0 },
      maths: { type: Number, default: 0 },
      science: { type: Number, default: 0 },
      social: { type: Number, default: 0 },
      tamil: { type: Number, default: 0 },
      english: { type: Number, default: 0 }
    },
    twelfthMarks: {
      stream: { type: String, default: '' },
      maths: { type: Number, default: 0 },
      physics: { type: Number, default: 0 },
      chemistry: { type: Number, default: 0 },
      biology: { type: Number, default: 0 },
      computerScience: { type: Number, default: 0 },
      totalMarks: { type: Number, default: 0 },
      engineeringCutoff: { type: Number, default: 0 },
      neetScore: { type: Number, default: 0 },
      jeeScore: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare candidate password with stored hash
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', UserSchema);
export default User;
