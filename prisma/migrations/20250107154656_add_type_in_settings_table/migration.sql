/*
  Warnings:

  - Added the required column `type` to the `PageSettingConfig` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PageSettingConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" INTEGER NOT NULL,
    "configs" TEXT NOT NULL
);
INSERT INTO "new_PageSettingConfig" ("configs", "id") SELECT "configs", "id" FROM "PageSettingConfig";
DROP TABLE "PageSettingConfig";
ALTER TABLE "new_PageSettingConfig" RENAME TO "PageSettingConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
