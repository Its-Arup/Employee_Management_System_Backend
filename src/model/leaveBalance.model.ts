import { Document, model, Schema } from 'mongoose';

export interface LeaveBalance {
    userId: Schema.Types.ObjectId;
    year: number;
    casual: {
        total: number;
        used: number;
        remaining: number;
    };
    sick: {
        total: number;
        used: number;
        remaining: number;
    };
    paid: {
        total: number;
        used: number;
        remaining: number;
    };
    unpaid: {
        used: number;
    };
    carryForward?: {
        casual: number;
        sick: number;
        paid: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface LeaveBalanceDocument extends LeaveBalance, Document {}

const leaveBalanceSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        year: {
            type: Number,
            required: true,
            min: 2020
        },
        casual: {
            total: { type: Number, default: 12, min: 0 },
            used: { type: Number, default: 0, min: 0 },
            remaining: { type: Number, default: 12, min: 0 }
        },
        sick: {
            total: { type: Number, default: 10, min: 0 },
            used: { type: Number, default: 0, min: 0 },
            remaining: { type: Number, default: 10, min: 0 }
        },
        paid: {
            total: { type: Number, default: 15, min: 0 },
            used: { type: Number, default: 0, min: 0 },
            remaining: { type: Number, default: 15, min: 0 }
        },
        unpaid: {
            used: { type: Number, default: 0, min: 0 }
        },
        carryForward: {
            casual: { type: Number, default: 0, min: 0 },
            sick: { type: Number, default: 0, min: 0 },
            paid: { type: Number, default: 0, min: 0 }
        }
    },
    {
        timestamps: true
    }
);

// Compound unique index
leaveBalanceSchema.index({ userId: 1, year: 1 }, { unique: true });

// Update remaining leaves before saving
leaveBalanceSchema.pre('save', function (next) {
    if (this.casual) {
        this.casual.remaining = this.casual.total - this.casual.used;
    }
    if (this.sick) {
        this.sick.remaining = this.sick.total - this.sick.used;
    }
    if (this.paid) {
        this.paid.remaining = this.paid.total - this.paid.used;
    }
    next();
});

export const leaveBalanceModel = model<LeaveBalanceDocument>('LeaveBalance', leaveBalanceSchema);
