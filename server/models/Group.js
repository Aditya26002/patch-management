import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    os: {
      type: String,
      required: true,
      enum: ["Windows", "Linux"],
    },
    hosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Host",
      },
    ],
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better performance
groupSchema.index({ os: 1 });
groupSchema.index({ isDefault: 1 });

const Group = mongoose.model("Group", groupSchema);

export default Group;
