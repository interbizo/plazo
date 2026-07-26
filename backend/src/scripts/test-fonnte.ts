import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Test script untuk verifikasi Fonnte API
 * Run: npx ts-node src/scripts/test-fonnte.ts
 */
@Injectable()
export class TestFonnteScript {
  private readonly logger = new Logger(TestFonnteScript.name);
  private readonly apiToken: string;
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    this.apiToken = this.configService.get<string>('FONNTE_API_TOKEN') || '';
    this.apiUrl = this.configService.get<string>('FONNTE_API_URL') || 'https://api.fonnte.com/send';
  }

  async testConnection() {
    try {
      this.logger.log('Testing Fonnte API connection...');
      this.logger.log(`API URL: ${this.apiUrl}`);
      this.logger.log(`API Token: ${this.apiToken.substring(0, 10)}...`);

      // Test dengan nomor dummy (ganti dengan nomor real untuk test)
      const testPhone = '6281234567890'; // Ganti dengan nomor WhatsApp Anda
      const testMessage = 'Test message from Plazo - Fonnte API is working! ✅';

      const response = await axios.post(
        this.apiUrl,
        {
          target: testPhone,
          message: testMessage,
          countryCode: '62',
        },
        {
          headers: {
            Authorization: this.apiToken,
          },
        }
      );

      this.logger.log('✅ Fonnte API Response:');
      this.logger.log(JSON.stringify(response.data, null, 2));

      if (response.data.status === true || response.data.status === 'success') {
        this.logger.log('✅ SUCCESS: Fonnte API is working correctly!');
        return true;
      } else {
        this.logger.error('❌ FAILED: Fonnte API returned error');
        this.logger.error(JSON.stringify(response.data, null, 2));
        return false;
      }
    } catch (error: any) {
      this.logger.error('❌ ERROR: Failed to connect to Fonnte API');
      this.logger.error(error.message);
      if (error.response) {
        this.logger.error('Response data:', error.response.data);
      }
      return false;
    }
  }

  async checkDeviceStatus() {
    try {
      this.logger.log('Checking Fonnte device status...');
      
      const response = await axios.post(
        'https://api.fonnte.com/get-devices',
        {},
        {
          headers: {
            Authorization: this.apiToken,
          },
        }
      );

      this.logger.log('Device Status:');
      this.logger.log(JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to check device status');
      this.logger.error(error.message);
      return null;
    }
  }
}

// Run test
async function runTest() {
  const { ConfigModule } = await import('@nestjs/config');
  const { NestFactory } = await import('@nestjs/core');
  const { Module } = await import('@nestjs/common');

  @Module({
    imports: [ConfigModule.forRoot()],
    providers: [TestFonnteScript],
  })
  class TestModule {}

  const app = await NestFactory.createApplicationContext(TestModule);
  const testScript = app.get(TestFonnteScript);

  console.log('\n===========================================');
  console.log('🧪 FONNTE API TEST SCRIPT');
  console.log('===========================================\n');

  // Test 1: Check device status
  console.log('📱 Test 1: Checking device status...\n');
  await testScript.checkDeviceStatus();

  console.log('\n-------------------------------------------\n');

  // Test 2: Send test message
  console.log('📤 Test 2: Sending test message...\n');
  console.log('⚠️  IMPORTANT: Edit testPhone in the script with your real WhatsApp number!\n');
  await testScript.testConnection();

  console.log('\n===========================================');
  console.log('✅ Test completed!');
  console.log('===========================================\n');

  await app.close();
}

// Execute if run directly
if (require.main === module) {
  runTest().catch(console.error);
}

export default TestFonnteScript;
