/*
  Warnings:

  - You are about to drop the column `fullName` on the `KycSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `selfiePath` on the `KycSubmission` table. All the data in the column will be lost.
  - Added the required column `fullNameEncrypted` to the `KycSubmission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ktpNumberEncrypted` to the `KycSubmission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `selfieWithKtpPath` to the `KycSubmission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "KycSubmission" DROP COLUMN "fullName",
DROP COLUMN "selfiePath",
ADD COLUMN     "addressEncrypted" TEXT,
ADD COLUMN     "dobEncrypted" TEXT,
ADD COLUMN     "fullNameEncrypted" TEXT NOT NULL,
ADD COLUMN     "ktpNumberEncrypted" TEXT NOT NULL,
ADD COLUMN     "selfieWithKtpPath" TEXT NOT NULL;
