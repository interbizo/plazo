import { ConfigService } from '@nestjs/config';
import { EmailService } from '../src/common/services/email.service';

/**
 * Test script for Email Service (Resend SMTP)
 * Run: npx ts-node scripts/test-email.ts
 */

async function testEmailService() {
  console.log('🧪 Testing Email Service (Resend SMTP)...\n');

  // Initialize services
  const configService = new ConfigService();
  const emailService = new EmailService(configService);

  try {
    // Test 1: Verify SMTP connection
    console.log('1️⃣ Testing SMTP connection...');
    const connectionValid = await emailService.verifyConnection();
    
    if (connectionValid) {
      console.log('✅ SMTP connection successful\n');
    } else {
      console.log('❌ SMTP connection failed\n');
      return;
    }

    // Test 2: Send verification email
    console.log('2️⃣ Testing verification email...');
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    const testToken = 'test_token_' + Date.now();
    
    const verificationSent = await emailService.sendVerificationEmail(
      testEmail,
      testToken,
      'Test User'
    );

    if (verificationSent) {
      console.log(`✅ Verification email sent to ${testEmail}`);
      console.log(`   Token: ${testToken}\n`);
    } else {
      console.log(`❌ Failed to send verification email\n`);
    }

    // Test 3: Send password reset email
    console.log('3️⃣ Testing password reset email...');
    const resetToken = 'reset_token_' + Date.now();
    
    const resetSent = await emailService.sendPasswordResetEmail(
      testEmail,
      resetToken,
      'Test User'
    );

    if (resetSent) {
      console.log(`✅ Password reset email sent to ${testEmail}`);
      console.log(`   Token: ${resetToken}\n`);
    } else {
      console.log(`❌ Failed to send password reset email\n`);
    }

    console.log('✅ All email tests completed successfully!');
    console.log('\n📧 Check your inbox at:', testEmail);
    console.log('   (Make sure to check spam folder if not in inbox)');

  } catch (error) {
    console.error('❌ Error during email testing:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
}

// Run tests
testEmailService()
  .then(() => {
    console.log('\n✅ Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
