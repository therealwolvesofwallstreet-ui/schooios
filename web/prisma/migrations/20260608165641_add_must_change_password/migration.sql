-- AlterTable
ALTER TABLE "cases" ALTER COLUMN "case_code" SET DEFAULT ('CASE-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('case_code_seq')::text, 5, '0'));

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT true;
