import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "todo",
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "medium",
      required: true,
    },
    dueDate: { type: Date, default: null },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

export type TaskDoc = InferSchemaType<typeof taskSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Task: Model<TaskDoc> =
  (mongoose.models["Task"] as Model<TaskDoc>) ||
  mongoose.model<TaskDoc>("Task", taskSchema);
