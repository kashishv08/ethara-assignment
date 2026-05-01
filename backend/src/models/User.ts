import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
      required: true,
    },
    avatarColor: { type: String, default: "#6366f1" },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const User: Model<UserDoc> =
  (mongoose.models["User"] as Model<UserDoc>) ||
  mongoose.model<UserDoc>("User", userSchema);

export function publicUser(user: UserDoc) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    avatarColor: user.avatarColor,
    createdAt: user.createdAt,
  };
}
