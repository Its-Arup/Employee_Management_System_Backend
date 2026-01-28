import { Document, model, Schema } from 'mongoose';
import { cryptoUtil } from '../util';

export interface User {
    key: string;
    walletAddress: string;
    privateKey: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserDocument extends User, Document {}

const apiKeySchema = new Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            get: (v: string) => cryptoUtil.decrypt(v),
            set: (v: string) => cryptoUtil.encrypt(v)
        },
        walletAddress: { type: String, required: true, unique: true, lowercase: true },
        privateKey: {
            type: String,
            required: true,
            unique: true,
            get: (v: string) => cryptoUtil.decrypt(v),
            set: (v: string) => cryptoUtil.encrypt(v)
        }
    },
    {
        toObject: { getters: true },
        timestamps: true
    }
);

export const userModel = model<UserDocument>('User', apiKeySchema);
