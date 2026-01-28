import { Document, model, Schema } from 'mongoose';

export interface Attendance {
    userId: Schema.Types.ObjectId;
    date: Date;
    checkIn?: Date;
    checkOut?: Date;
    totalHours?: number;
    status: 'present' | 'absent' | 'half-day' | 'leave' | 'holiday';
    remarks?: string;
    location?: {
        checkIn?: {
            latitude: number;
            longitude: number;
            address?: string;
        };
        checkOut?: {
            latitude: number;
            longitude: number;
            address?: string;
        };
    };
    isManualEntry: boolean;
    editedBy?: Schema.Types.ObjectId;
    editedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface AttendanceDocument extends Attendance, Document {}

const attendanceSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        date: {
            type: Date,
            required: true
        },
        checkIn: {
            type: Date
        },
        checkOut: {
            type: Date
        },
        totalHours: {
            type: Number,
            min: 0,
            max: 24
        },
        status: {
            type: String,
            enum: ['present', 'absent', 'half-day', 'leave', 'holiday'],
            default: 'absent'
        },
        remarks: {
            type: String,
            trim: true
        },
        location: {
            checkIn: {
                latitude: Number,
                longitude: Number,
                address: String
            },
            checkOut: {
                latitude: Number,
                longitude: Number,
                address: String
            }
        },
        isManualEntry: {
            type: Boolean,
            default: false
        },
        editedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        editedAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

// Compound index to prevent duplicate entries for same user and date
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ userId: 1, date: -1 });

// Auto-calculate total hours before saving
attendanceSchema.pre('save', function (next) {
    if (this.checkIn && this.checkOut) {
        const diffMs = this.checkOut.getTime() - this.checkIn.getTime();
        this.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

        // Auto-determine status based on hours
        if (this.totalHours >= 8) {
            this.status = 'present';
        } else if (this.totalHours >= 4) {
            this.status = 'half-day';
        }
    }
    next();
});

export const attendanceModel = model<AttendanceDocument>('Attendance', attendanceSchema);
