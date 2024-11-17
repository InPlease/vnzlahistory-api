/*
  Warnings:

  - You are about to drop the `VideoTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `videoTagVideoId` on the `Tag` table. All the data in the column will be lost.
  - Added the required column `tags` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "VideoTag";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);
INSERT INTO "new_Tag" ("id", "name") SELECT "id", "name" FROM "Tag";
DROP TABLE "Tag";
ALTER TABLE "new_Tag" RENAME TO "Tag";
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");
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
    "tags" TEXT NOT NULL
);
INSERT INTO "new_Video" ("bucket_file_name", "createdAt", "description", "id", "is_reported", "is_verified", "report_team_comments", "report_type", "ui_title", "updatedAt", "url") SELECT "bucket_file_name", "createdAt", "description", "id", "is_reported", "is_verified", "report_team_comments", "report_type", "ui_title", "updatedAt", "url" FROM "Video";
DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";
CREATE UNIQUE INDEX "Video_bucket_file_name_key" ON "Video"("bucket_file_name");
CREATE UNIQUE INDEX "Video_ui_title_key" ON "Video"("ui_title");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
