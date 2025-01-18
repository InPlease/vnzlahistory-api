/*
  Warnings:

  - Added the required column `isRecommended` to the `Video` table without a default value. This is not possible if the table is not empty.

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
    "views" INTEGER NOT NULL,
    "isRecommended" BOOLEAN,
    "thumbnailUrl" TEXT,
    CONSTRAINT "Video_thumbnailUrl_fkey" FOREIGN KEY ("thumbnailUrl") REFERENCES "Image" ("url") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Video" ("bucket_file_name", "createdAt", "description", "id", "is_reported", "is_verified", "report_team_comments", "report_type", "tags", "thumbnailUrl", "ui_title", "updatedAt", "url", "views") SELECT "bucket_file_name", "createdAt", "description", "id", "is_reported", "is_verified", "report_team_comments", "report_type", "tags", "thumbnailUrl", "ui_title", "updatedAt", "url", "views" FROM "Video";
DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";
CREATE UNIQUE INDEX "Video_bucket_file_name_key" ON "Video"("bucket_file_name");
CREATE UNIQUE INDEX "Video_ui_title_key" ON "Video"("ui_title");
CREATE UNIQUE INDEX "Video_thumbnailUrl_key" ON "Video"("thumbnailUrl");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
