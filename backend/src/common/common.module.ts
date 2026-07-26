import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionFeaturesService } from './services/subscription-features.service';
import { ViewTrackerService } from './services/view-tracker.service';
import { DatabaseModule } from '@modules/database/database.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
  ],
  providers: [SubscriptionFeaturesService, ViewTrackerService],
  exports: [SubscriptionFeaturesService, ViewTrackerService, ConfigModule],
})
export class CommonModule {}
