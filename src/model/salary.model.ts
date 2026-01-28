import { Document, model, Schema } from 'mongoose';

export interface SalaryStructure {
    basic: number;
    hra: number;
    medicalAllowance?: number;
    transportAllowance?: number;
    otherAllowances?: number;
    bonus?: number;
    providentFund?: number;
    professionalTax?: number;
    incomeTax?: number;
    otherDeductions?: number;
}

export interface Salary {
    userId: Schema.Types.ObjectId;
    month: number;
    year: number;
    structure: SalaryStructure;
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
    status: 'pending' | 'processed' | 'paid' | 'on-hold';
    creditDate?: Date;
    actualCreditDate?: Date;
    paymentMethod?: 'bank-transfer' | 'cheque' | 'cash';
    transactionId?: string;
    remarks?: string;
    workingDays: number;
    presentDays: number;
    leaveDays: number;
    absentDays: number;
    isProrated: boolean;
    createdBy: Schema.Types.ObjectId;
    processedBy?: Schema.Types.ObjectId;
    processedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface SalaryDocument extends Salary, Document {}

const salaryStructureSchema = new Schema(
    {
        basic: { type: Number, required: true, min: 0 },
        hra: { type: Number, required: true, min: 0 },
        medicalAllowance: { type: Number, default: 0, min: 0 },
        transportAllowance: { type: Number, default: 0, min: 0 },
        otherAllowances: { type: Number, default: 0, min: 0 },
        bonus: { type: Number, default: 0, min: 0 },
        providentFund: { type: Number, default: 0, min: 0 },
        professionalTax: { type: Number, default: 0, min: 0 },
        incomeTax: { type: Number, default: 0, min: 0 },
        otherDeductions: { type: Number, default: 0, min: 0 }
    },
    { _id: false }
);

const salarySchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12
        },
        year: {
            type: Number,
            required: true,
            min: 2020
        },
        structure: {
            type: salaryStructureSchema,
            required: true
        },
        grossSalary: {
            type: Number,
            required: true,
            min: 0
        },
        totalDeductions: {
            type: Number,
            required: true,
            min: 0
        },
        netSalary: {
            type: Number,
            required: true,
            min: 0
        },
        status: {
            type: String,
            enum: ['pending', 'processed', 'paid', 'on-hold'],
            default: 'pending'
        },
        creditDate: {
            type: Date
        },
        actualCreditDate: {
            type: Date
        },
        paymentMethod: {
            type: String,
            enum: ['bank-transfer', 'cheque', 'cash']
        },
        transactionId: {
            type: String,
            trim: true
        },
        remarks: {
            type: String,
            trim: true
        },
        workingDays: {
            type: Number,
            required: true,
            min: 0,
            max: 31
        },
        presentDays: {
            type: Number,
            required: true,
            min: 0,
            max: 31
        },
        leaveDays: {
            type: Number,
            default: 0,
            min: 0
        },
        absentDays: {
            type: Number,
            default: 0,
            min: 0
        },
        isProrated: {
            type: Boolean,
            default: false
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        processedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        processedAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

// Compound index to prevent duplicate salary entries
salarySchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });
salarySchema.index({ status: 1 });
salarySchema.index({ creditDate: 1 });
salarySchema.index({ userId: 1, year: -1, month: -1 });

// Auto-calculate gross, deductions, and net salary before saving
salarySchema.pre('save', function (next) {
    const structure = this.structure;

    // Calculate gross salary
    this.grossSalary =
        structure.basic +
        structure.hra +
        (structure.medicalAllowance || 0) +
        (structure.transportAllowance || 0) +
        (structure.otherAllowances || 0) +
        (structure.bonus || 0);

    // Calculate total deductions
    this.totalDeductions =
        (structure.providentFund || 0) + (structure.professionalTax || 0) + (structure.incomeTax || 0) + (structure.otherDeductions || 0);

    // Calculate net salary
    let netAmount = this.grossSalary - this.totalDeductions;

    // Apply proration if needed
    if (this.isProrated && this.workingDays > 0) {
        netAmount = (netAmount / this.workingDays) * this.presentDays;
    }

    this.netSalary = Math.round(netAmount * 100) / 100;

    next();
});

export const salaryModel = model<SalaryDocument>('Salary', salarySchema);
