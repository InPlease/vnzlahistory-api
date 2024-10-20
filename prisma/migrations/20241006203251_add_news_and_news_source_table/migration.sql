/*
  Warnings:

  - You are about to drop the column `source` on the `News` table. All the data in the column will be lost.
  - Added the required column `newsSourceId` to the `News` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "NewsSource" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_News" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT,
    "url" TEXT NOT NULL,
    "image" TEXT,
    "category" TEXT,
    "language" TEXT,
    "country" TEXT,
    "published_at" DATETIME NOT NULL,
    "newsSourceId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "News_newsSourceId_fkey" FOREIGN KEY ("newsSourceId") REFERENCES "NewsSource" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_News" ("author", "category", "content", "country", "createdAt", "id", "image", "language", "published_at", "title", "updatedAt", "url") SELECT "author", "category", "content", "country", "createdAt", "id", "image", "language", "published_at", "title", "updatedAt", "url" FROM "News";
DROP TABLE "News";
ALTER TABLE "new_News" RENAME TO "News";
CREATE UNIQUE INDEX "News_url_key" ON "News"("url");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "NewsSource_source_key" ON "NewsSource"("source");
