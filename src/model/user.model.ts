import { Document, model, Schema } from 'mongoose';

export interface User {
    username: string;
    email: string;
    passwordHash: string;
    roles: ('employee' | 'admin' | 'hr' | 'manager')[];
    status: 'pending' | 'active' | 'rejected' | 'suspended';
    displayName: string;
    dateOfBirth?: Date;
    profilePictureUrl?: string;
    designation?: string;
    department?: string;
    phoneNumber?: string;
    address?: string;
    joiningDate?: Date;
    employeeId?: string;
    approvedBy?: Schema.Types.ObjectId;
    approvedAt?: Date;
    rejectionReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserDocument extends User, Document {}

const userSchema = new Schema(
    {
        username: { type: String, required: true, unique: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
        roles: {
            type: [String],
            enum: ['employee', 'admin', 'hr', 'manager'],
            default: ['employee']
        },
        status: {
            type: String,
            enum: ['pending', 'active', 'rejected', 'suspended'],
            default: 'pending'
        },
        displayName: { type: String, required: true, trim: true },
        dateOfBirth: { type: Date },
        profilePictureUrl: { type: String },
        designation: { type: String, trim: true },
        department: { type: String, trim: true },
        phoneNumber: { type: String, trim: true },
        address: { type: String, trim: true },
        joiningDate: { type: Date },
        employeeId: { type: String, unique: true, sparse: true },
        approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        approvedAt: { type: Date },
        rejectionReason: { type: String }
    },
    {
        timestamps: true
    }
);

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ status: 1 });
userSchema.index({ roles: 1 });
userSchema.index({ employeeId: 1 });

export const userModel = model<UserDocument>('User', userSchema);
