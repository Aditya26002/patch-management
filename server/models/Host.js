import mongoose from "mongoose";

const hostSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid IP address!`,
      },
    },
    osName: {
      type: String,
      required: true,
      enum: ["Windows", "Linux"], // Removed macOS
    },
    osVersion: {
      type: String,
      required: true,
    },
    loginId: {
      type: String,
      required: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    availablePatches: [
      {
        type: String,
      },
    ],
    installedPatches: [
      {
        type: String,
      },
    ],
    patchCount: {
      type: Number,
      default: 0,
    },
    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Host = mongoose.model("Host", hostSchema);
