-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "case_code" SET DEFAULT ('CASE-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('case_code_seq')::text, 5, '0'));
