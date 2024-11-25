/*
  Warnings:

  - The primary key for the `Image` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Image` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Image" (
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "format" TEXT,
    "size" INTEGER
);
INSERT INTO "new_Image" ("altText", "createdAt", "format", "height", "size", "updatedAt", "url", "width") SELECT "altText", "createdAt", "format", "height", "size", "updatedAt", "url", "width" FROM "Image";
DROP TABLE "Image";
ALTER TABLE "new_Image" RENAME TO "Image";
CREATE UNIQUE INDEX "Image_url_key" ON "Image"("url");
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
    "thumbnailId" TEXT,
    CONSTRAINT "Video_thumbnailId_fkey" FOREIGN KEY ("thumbnailId") REFERENCES "Image" ("url") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Video" ("bucket_file_name", "createdAt", "description", "id", "is_reported", "is_verified", "report_team_comments", "report_type", "tags", "thumbnailId", "ui_title", "updatedAt", "url", "views") SELECT "bucket_file_name", "createdAt", "description", "id", "is_reported", "is_verified", "report_team_comments", "report_type", "tags", "thumbnailId", "ui_title", "updatedAt", "url", "views" FROM "Video";
DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";
CREATE UNIQUE INDEX "Video_bucket_file_name_key" ON "Video"("bucket_file_name");
CREATE UNIQUE INDEX "Video_ui_title_key" ON "Video"("ui_title");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
