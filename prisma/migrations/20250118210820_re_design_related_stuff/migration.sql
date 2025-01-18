/*
  Warnings:

  - You are about to drop the `RelatedEntity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RelatedTo` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RelatedEntity";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RelatedTo";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "RelatedInfo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "idEntity" INTEGER NOT NULL,
    "relatedEntityId" INTEGER NOT NULL,
    CONSTRAINT "RelatedInfo_relatedEntityId_fkey" FOREIGN KEY ("relatedEntityId") REFERENCES "Video" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RelatedInfo_idEntity_key" ON "RelatedInfo"("idEntity");
