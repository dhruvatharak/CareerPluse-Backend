/**
 * CareerPulse AI - District Model
 * Reference model for all 38 Tamil Nadu revenue districts.
 */

import mongoose from 'mongoose';

const DistrictSchema = new mongoose.Schema(
  {
    districtId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export const District = mongoose.model('District', DistrictSchema);
export default District;
