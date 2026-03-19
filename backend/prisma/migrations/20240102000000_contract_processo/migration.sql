-- AlterTable: add CNJ process linkage fields to Contract
ALTER TABLE "Contract" ADD COLUMN "numeroProcesso" TEXT;
ALTER TABLE "Contract" ADD COLUMN "tribunalIndex" TEXT;
