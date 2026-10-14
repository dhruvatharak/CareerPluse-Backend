/**
 * CareerPulse AI - Favorite Bookmark Model
 * Represents student bookmarks for groups, schools, colleges, and diploma courses.
 */

import mongoose from 'mongoose';

const FavoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    itemType: {
      type: String,
      required: true,
      enum: ['group', 'school', 'college', 'diploma', 'degreeCollege'],
      index: true
    },
    itemId: {
      type: String,
      required: true,
      trim: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Enforce unique bookmark per user, itemType, and itemId
FavoriteSchema.index({ user: 1, itemType: 1, itemId: 1 }, { unique: true });

export const Favorite = mongoose.model('Favorite', FavoriteSchema);
export default Favorite;
