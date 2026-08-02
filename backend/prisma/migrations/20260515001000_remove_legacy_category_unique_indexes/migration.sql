-- Drop category unique indexes replaced by the scoped slug/type constraint.
DROP INDEX IF EXISTS "Category_name_key";
DROP INDEX IF EXISTS "Category_slug_key";
