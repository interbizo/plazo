import { Module, Global } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import { MeilisearchService } from "./meilisearch.service";

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [MeilisearchService],
  exports: [MeilisearchService],
})
export class SearchModule {}