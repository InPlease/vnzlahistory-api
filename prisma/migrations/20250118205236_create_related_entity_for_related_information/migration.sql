/*
  Warnings:

  - Added the required column `relatedEntityId` to the `RelatedTo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `relatedEntityType` to the `RelatedTo` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "RelatedEntity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RelatedTo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "videoId" INTEGER,
    "relatedEntityId" INTEGER NOT NULL,
    "relatedEntityType" TEXT NOT NULL,
    "historyId" INTEGER,
    "newsId" INTEGER,
    CONSTRAINT "RelatedTo_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RelatedTo_relatedEntityId_fkey" FOREIGN KEY ("relatedEntityId") REFERENCES "RelatedEntity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RelatedTo_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "History" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RelatedTo_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RelatedTo" ("historyId", "id", "newsId", "videoId") SELECT "historyId", "id", "newsId", "videoId" FROM "RelatedTo";
DROP TABLE "RelatedTo";
ALTER TABLE "new_RelatedTo" RENAME TO "RelatedTo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
