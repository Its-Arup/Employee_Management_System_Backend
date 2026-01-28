import { Document, model, Schema } from 'mongoose';

export interface Leave {
    userId: Schema.Types.ObjectId;
    leaveType: 'casual' | 'sick' | 'paid' | 'unpaid' | 'maternity' | 'paternity';
    startDate: Date;
    endDate: Date;
    totalDays: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    reviewedBy?: Schema.Types.ObjectId;
    reviewedAt?: Date;
    reviewRemarks?: string;
    attachments?: string[];
    isHalfDay: boolean;
    halfDayPeriod?: 'first-half' | 'second-half';
    createdAt: Date;
    updatedAt: Date;
}

export interface LeaveDocument extends Leave, Document {}

const leaveSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        leaveType: {
            type: String,
            enum: ['casual', 'sick', 'paid', 'unpaid', 'maternity', 'paternity'],
            required: true
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        totalDays: {
            type: Number,
            required: true,
            min: 0.5
        },
        reason: {
            type: String,
            required: true,
            trim: true,
            minlength: 10,
            maxlength: 500
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'cancelled'],
            default: 'pending'
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        reviewedAt: {
            type: Date
        },
        reviewRemarks: {
            type: String,
            trim: true
        },
        attachments: {
            type: [String]
        },
        isHalfDay: {
            type: Boolean,
            default: false
        },
        halfDayPeriod: {
            type: String,
            enum: ['first-half', 'second-half']
        }
    },
    {
        timestamps: true
    }
);

// Indexes
leaveSchema.index({ userId: 1, startDate: 1, endDate: 1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ userId: 1, status: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });

// Validate dates
leaveSchema.pre('save', function (next) {
    if (this.endDate < this.startDate) {
        next(new Error('End date must be after start date'));
    }
    next();
});

// Auto-calculate total days
leaveSchema.pre('save', function (next) {
    if (this.isHalfDay) {
        this.totalDays = 0.5;
    } else {
        const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime());
        this.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
    next();
});

export const leaveModel = model<LeaveDocument>('Leave', leaveSchema);
