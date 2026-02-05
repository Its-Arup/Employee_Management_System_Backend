/**
 * Migration: Add email verification to existing users
 * 
 * This migration sets isEmailVerified to true for all existing active users
 * since they were created before the email verification feature was implemented.
 */

import { config } from 'dotenv';
import { connect, connection } from 'mongoose';

config();

const DB_URL = process.env.DB_URL + process.env.NODE_ENV;

async function migrateExistingUsers() {
    try {
        console.log('Connecting to database...');
        await connect(DB_URL);
        console.log('Connected to database successfully');

        // Update all existing active users to have verified emails
        const result = await connection.collection('users').updateMany(
            { 
                status: 'active',
                isEmailVerified: { $exists: false }
            },
            { 
                $set: { 
                    isEmailVerified: true 
                },
                $unset: {
                    emailVerificationOTP: '',
                    emailVerificationExpires: ''
                }
            }
        );

        console.log(`Migration completed successfully!`);
        console.log(`- Matched ${result.matchedCount} users`);
        console.log(`- Updated ${result.modifiedCount} users`);

        // Also update any pending users that might have been created before this feature
        const pendingResult = await connection.collection('users').updateMany(
            { 
                status: 'pending',
                isEmailVerified: { $exists: false }
            },
            { 
                $set: { 
                    isEmailVerified: false 
                }
            }
        );

        console.log(`\nPending users migration:`);
        console.log(`- Matched ${pendingResult.matchedCount} users`);
        console.log(`- Updated ${pendingResult.modifiedCount} users`);

        await connection.close();
        console.log('\nDatabase connection closed');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        await connection.close();
        process.exit(1);
    }
}

// Run migration
console.log('Starting migration for email verification feature...\n');
migrateExistingUsers();
