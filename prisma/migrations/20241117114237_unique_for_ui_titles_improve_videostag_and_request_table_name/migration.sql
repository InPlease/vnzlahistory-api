/*
  Warnings:

  - You are about to drop the `requestLog` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[ui_title]` on the table `Video` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Video_url_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "requestLog";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "RequestLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VideoTag" (
    "videoId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    PRIMARY KEY ("videoId", "tagId"),
    CONSTRAINT "VideoTag_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_VideoTag" ("tagId", "videoId") SELECT "tagId", "videoId" FROM "VideoTag";
DROP TABLE "VideoTag";
ALTER TABLE "new_VideoTag" RENAME TO "VideoTag";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Video_ui_title_key" ON "Video"("ui_title");
