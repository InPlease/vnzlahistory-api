/*
  Warnings:

  - The primary key for the `VideoTag` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `tagId` on the `VideoTag` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "videoTagVideoId" INTEGER,
    CONSTRAINT "Tag_videoTagVideoId_fkey" FOREIGN KEY ("videoTagVideoId") REFERENCES "VideoTag" ("videoId") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tag" ("id", "name") SELECT "id", "name" FROM "Tag";
DROP TABLE "Tag";
ALTER TABLE "new_Tag" RENAME TO "Tag";
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");
CREATE TABLE "new_VideoTag" (
    "videoId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    CONSTRAINT "VideoTag_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_VideoTag" ("videoId") SELECT "videoId" FROM "VideoTag";
DROP TABLE "VideoTag";
ALTER TABLE "new_VideoTag" RENAME TO "VideoTag";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
