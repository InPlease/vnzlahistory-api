-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RelatedTo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "newsId" INTEGER,
    "videoId" INTEGER,
    "historyId" INTEGER,
    CONSTRAINT "RelatedTo_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RelatedTo_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RelatedTo_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "History" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RelatedTo" ("historyId", "id", "newsId", "videoId") SELECT "historyId", "id", "newsId", "videoId" FROM "RelatedTo";
DROP TABLE "RelatedTo";
ALTER TABLE "new_RelatedTo" RENAME TO "RelatedTo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
