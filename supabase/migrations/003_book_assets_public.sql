-- Phase 6 (DOCX→HTML): DOCX-embedded images need a stable, non-expiring URL
-- to embed directly in content_html/content_json (spec §10 example uses a
-- plain https URL, not a signed one). book-covers is already public, so
-- book-assets follows the same default-public pattern for now.
--
-- This is intentionally permissive — it does not yet gate access by the
-- parent book's visibility (spec §8 says private-book assets should be
-- protected). That access-control layer belongs to the phases that build
-- public serving (Phase 9/16), not this conversion phase; revisit then.

update storage.buckets set public = true where id = 'book-assets';
