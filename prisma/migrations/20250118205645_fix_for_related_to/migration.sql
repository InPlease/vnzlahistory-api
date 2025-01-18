/*
  Warnings:

  - You are about to drop the column `historyId` on the `RelatedTo` table. All the data in the column will be lost.
  - You are about to drop the column `newsId` on the `RelatedTo` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RelatedTo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "videoId" INTEGER,
    "relatedEntityId" INTEGER,
    "relatedEntityType" TEXT,
    CONSTRAINT "RelatedTo_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RelatedTo_relatedEntityId_fkey" FOREIGN KEY ("relatedEntityId") REFERENCES "History" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RelatedTo_relatedEntityId_fkey" FOREIGN KEY ("relatedEntityId") REFERENCES "News" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RelatedTo" ("id", "relatedEntityId", "relatedEntityType", "videoId") SELECT "id", "relatedEntityId", "relatedEntityType", "videoId" FROM "RelatedTo";
DROP TABLE "RelatedTo";
ALTER TABLE "new_RelatedTo" RENAME TO "RelatedTo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
