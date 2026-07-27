CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE');
ALTER TABLE "users" ADD COLUMN "gender" "gender";
