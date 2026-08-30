ALTER TABLE "LandingBenefit"
ADD COLUMN "sectionEyebrow" TEXT NOT NULL DEFAULT '',
ADD COLUMN "sectionHeading" TEXT NOT NULL DEFAULT '',
ADD COLUMN "sectionDescription" TEXT NOT NULL DEFAULT '';

ALTER TABLE "LandingStep"
ADD COLUMN "sectionEyebrow" TEXT NOT NULL DEFAULT '',
ADD COLUMN "sectionHeading" TEXT NOT NULL DEFAULT '',
ADD COLUMN "sectionDescription" TEXT NOT NULL DEFAULT '';

ALTER TABLE "LandingAdvantage"
ADD COLUMN "sectionEyebrow" TEXT NOT NULL DEFAULT '',
ADD COLUMN "sectionHeading" TEXT NOT NULL DEFAULT '',
ADD COLUMN "sectionDescription" TEXT NOT NULL DEFAULT '';

ALTER TABLE "LandingTestimonial"
ADD COLUMN "sectionEyebrow" TEXT NOT NULL DEFAULT '',
ADD COLUMN "sectionHeading" TEXT NOT NULL DEFAULT '',
ADD COLUMN "sectionDescription" TEXT NOT NULL DEFAULT '';
