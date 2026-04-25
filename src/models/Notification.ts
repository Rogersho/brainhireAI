import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  icon: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'default';
  read: boolean;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    icon: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'default'],
      default: 'default',
    },
    read: { type: Boolean, default: false },
    link: { type: String },
  },
  { timestamps: true }
);

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
