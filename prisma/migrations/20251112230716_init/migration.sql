-- CreateTable
CREATE TABLE "Score" (
    "id" SERIAL NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "maxCombo" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "is_ai" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_sessions" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_session_seen" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "image_id" INTEGER NOT NULL,
    "seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_session_seen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Score_gameId_key" ON "Score"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "images_url_key" ON "images"("url");

-- CreateIndex
CREATE INDEX "image_session_seen_session_id_idx" ON "image_session_seen"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "image_session_seen_session_id_image_id_key" ON "image_session_seen"("session_id", "image_id");

-- AddForeignKey
ALTER TABLE "image_session_seen" ADD CONSTRAINT "image_session_seen_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "image_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_session_seen" ADD CONSTRAINT "image_session_seen_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;
