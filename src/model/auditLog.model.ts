import { Document, model, Schema } from 'mongoose';
import { logger } from '../util';

export interface AuditLog {
    userId: Schema.Types.ObjectId;
    performedBy: Schema.Types.ObjectId;
    action: string;
    module: 'user' | 'attendance' | 'leave' | 'salary' | 'auth' | 'system';
    entityType: string;
    entityId?: Schema.Types.ObjectId;
    previousData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    changes?: {
        field: string;
        oldValue: unknown;
        newValue: unknown;
    }[];
    ipAddress?: string;
    userAgent?: string;
    status: 'success' | 'failure';
    errorMessage?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

export interface AuditLogDocument extends AuditLog, Document {}

const auditLogSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        action: {
            type: String,
            required: true,
            trim: true
        },
        module: {
            type: String,
            enum: ['user', 'attendance', 'leave', 'salary', 'auth', 'system'],
            required: true
        },
        entityType: {
            type: String,
            required: true,
            trim: true
        },
        entityId: {
            type: Schema.Types.ObjectId
        },
        previousData: {
            type: Schema.Types.Mixed
        },
        newData: {
            type: Schema.Types.Mixed
        },
        changes: [
            {
                field: { type: String, required: true },
                oldValue: { type: Schema.Types.Mixed },
                newValue: { type: Schema.Types.Mixed }
            }
        ],
        ipAddress: {
            type: String,
            trim: true
        },
        userAgent: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            enum: ['success', 'failure'],
            default: 'success'
        },
        errorMessage: {
            type: String,
            trim: true
        },
        metadata: {
            type: Schema.Types.Mixed
        }
    },
    {
        timestamps: { createdAt: true, updatedAt: false }
    }
);

// Indexes for efficient querying
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

// TTL index to auto-delete logs older than 1 year (optional)
// auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

export const auditLogModel = model<AuditLogDocument>('AuditLog', auditLogSchema);

// Helper function to create audit logs
export const createAuditLog = async (data: Partial<AuditLog>) => {
    try {
        const log = new auditLogModel(data);
        await log.save();
        return log;
    } catch (error) {
        logger.error('Error creating audit log', { meta: error });
        return null;
    }
};
