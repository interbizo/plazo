-- ============================================
-- FULL-TEXT SEARCH INDEXES (PostgreSQL tsvector)
-- ============================================
-- Run this migration manually: psql -d plazo_db -f manual_fulltext_search.sql
-- Or add to a Prisma migration.

-- Products: search by name, description, tags
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

CREATE OR REPLACE FUNCTION product_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('indonesian', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('indonesian', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_search_vector_trigger ON "Product";
CREATE TRIGGER product_search_vector_trigger
  BEFORE INSERT OR UPDATE OF name, description, tags ON "Product"
  FOR EACH ROW EXECUTE FUNCTION product_search_vector_update();

-- Backfill existing products
UPDATE "Product" SET "searchVector" =
  setweight(to_tsvector('indonesian', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('indonesian', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'C');

CREATE INDEX IF NOT EXISTS idx_product_search ON "Product" USING GIN ("searchVector");

-- Services: search by name, description, tags
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

CREATE OR REPLACE FUNCTION service_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('indonesian', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('indonesian', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS service_search_vector_trigger ON "Service";
CREATE TRIGGER service_search_vector_trigger
  BEFORE INSERT OR UPDATE OF name, description, tags ON "Service"
  FOR EACH ROW EXECUTE FUNCTION service_search_vector_update();

UPDATE "Service" SET "searchVector" =
  setweight(to_tsvector('indonesian', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('indonesian', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'C');

CREATE INDEX IF NOT EXISTS idx_service_search ON "Service" USING GIN ("searchVector");

-- Jobs: search by title, description, tags
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

CREATE OR REPLACE FUNCTION job_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('indonesian', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('indonesian', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_search_vector_trigger ON "Job";
CREATE TRIGGER job_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description, tags ON "Job"
  FOR EACH ROW EXECUTE FUNCTION job_search_vector_update();

UPDATE "Job" SET "searchVector" =
  setweight(to_tsvector('indonesian', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('indonesian', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'C');

CREATE INDEX IF NOT EXISTS idx_job_search ON "Job" USING GIN ("searchVector");
