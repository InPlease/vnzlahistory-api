/*
  Warnings:

  - Added the required column `views` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Video" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bucket_file_name" TEXT NOT NULL,
    "ui_title" TEXT,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "is_verified" BOOLEAN NOT NULL,
    "is_reported" BOOLEAN NOT NULL,
    "report_type" TEXT,
    "report_team_comments" TEXT,
    "tags" TEXT NOT NULL,
    "views" INTEGER NOT NULL
);
INSERT INTO "new_Video" ("bucket_file_name", "createdAt", "description", "id", "is_reported", "is_verified", "report_team_comments", "report_type", "tags", "ui_title", "updatedAt", "url") SELECT "bucket_file_name", "createdAt", "description", "id", "is_reported", "is_verified", "report_team_comments", "report_type", "tags", "ui_title", "updatedAt", "url" FROM "Video";
DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";
CREATE UNIQUE INDEX "Video_bucket_file_name_key" ON "Video"("bucket_file_name");
CREATE UNIQUE INDEX "Video_ui_title_key" ON "Video"("ui_title");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
