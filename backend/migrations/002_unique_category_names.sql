-- ============================================================================
-- 002: category names are unique, ignoring upper/lower case (DB-06)
-- Safe to run more than once.
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_lower_key ON Categories (LOWER(category_name));
