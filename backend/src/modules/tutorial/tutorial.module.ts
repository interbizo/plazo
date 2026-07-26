import { Module } from "@nestjs/common";
import { TutorialController } from "./tutorial.controller";
import { TutorialService } from "./tutorial.service";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [TutorialController],
  providers: [TutorialService],
  exports: [TutorialService],
})
export class TutorialModule {}
