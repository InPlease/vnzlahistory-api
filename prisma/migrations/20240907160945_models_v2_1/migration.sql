-- CreateTable
CREATE TABLE "Video" (
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
    "report_team_comments" TEXT
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "VideoTag" (
    "videoId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    PRIMARY KEY ("videoId", "tagId"),
    CONSTRAINT "VideoTag_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VideoTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommunityComments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "comment" TEXT NOT NULL,
    "video_id" INTEGER NOT NULL,
    CONSTRAINT "CommunityComments_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "Video" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Limits" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "maxUploadedPerDay" INTEGER NOT NULL,
    "totalUploadedToday" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Report" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "reportType" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Video_bucket_file_name_key" ON "Video"("bucket_file_name");

-- CreateIndex
CREATE UNIQUE INDEX "Video_url_key" ON "Video"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Report_name_key" ON "Report"("name");
