/*
  Warnings:

  - Added the required column `published_at` to the `News` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `News` table without a default value. This is not possible if the table is not empty.

*/
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
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_News" ("content", "createdAt", "id", "source", "title", "updatedAt") SELECT "content", "createdAt", "id", "source", "title", "updatedAt" FROM "News";
DROP TABLE "News";
ALTER TABLE "new_News" RENAME TO "News";
CREATE UNIQUE INDEX "News_url_key" ON "News"("url");
CREATE TABLE "new_RateLimit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "maxRequestsPerDay" INTEGER NOT NULL,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "totalHourlyRequests" INTEGER NOT NULL DEFAULT 0,
    "lastReset" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_RateLimit" ("id", "lastReset", "maxRequestsPerDay", "source", "totalRequests") SELECT "id", "lastReset", "maxRequestsPerDay", "source", "totalRequests" FROM "RateLimit";
DROP TABLE "RateLimit";
ALTER TABLE "new_RateLimit" RENAME TO "RateLimit";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
