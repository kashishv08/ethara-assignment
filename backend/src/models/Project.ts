import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    color: { type: String, default: "#6366f1" },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true },
);

export type ProjectDoc = InferSchemaType<typeof projectSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Project: Model<ProjectDoc> =
  (mongoose.models["Project"] as Model<ProjectDoc>) ||
  mongoose.model<ProjectDoc>("Project", projectSchema);
