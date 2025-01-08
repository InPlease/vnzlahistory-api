/*
  Warnings:

  - A unique constraint covering the columns `[type]` on the table `PageSettingConfig` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PageSettingConfig_type_key" ON "PageSettingConfig"("type");
