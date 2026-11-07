-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "username" VARCHAR(20) NOT NULL,
    "usernameLower" VARCHAR(20) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "TokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerStats" (
    "userId" UUID NOT NULL,
    "blocksPlaced" INTEGER NOT NULL DEFAULT 0,
    "blocksMined" INTEGER NOT NULL DEFAULT 0,
    "distanceTravelled" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "playTimeSeconds" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerStats_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "World" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "seed" INTEGER NOT NULL DEFAULT 0,
    "dataVersion" INTEGER NOT NULL DEFAULT 1,
    "playerX" DOUBLE PRECISION,
    "playerY" DOUBLE PRECISION,
    "playerZ" DOUBLE PRECISION,
    "playerYaw" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "playerPitch" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "blocksMined" INTEGER NOT NULL DEFAULT 0,
    "blocksPlaced" INTEGER NOT NULL DEFAULT 0,
    "playTimeSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastPlayedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "World_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldChunk" (
    "id" UUID NOT NULL,
    "worldId" UUID NOT NULL,
    "chunkX" INTEGER NOT NULL,
    "chunkZ" INTEGER NOT NULL,
    "edits" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySlot" (
    "id" UUID NOT NULL,
    "worldId" UUID NOT NULL,
    "slot" INTEGER NOT NULL,
    "blockId" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "InventorySlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_usernameLower_key" ON "User"("usernameLower");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserToken_tokenHash_key" ON "UserToken"("tokenHash");

-- CreateIndex
CREATE INDEX "UserToken_userId_type_idx" ON "UserToken"("userId", "type");

-- CreateIndex
CREATE INDEX "UserToken_expiresAt_idx" ON "UserToken"("expiresAt");

-- CreateIndex
CREATE INDEX "World_userId_lastPlayedAt_idx" ON "World"("userId", "lastPlayedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorldChunk_worldId_chunkX_chunkZ_key" ON "WorldChunk"("worldId", "chunkX", "chunkZ");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySlot_worldId_slot_key" ON "InventorySlot"("worldId", "slot");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserToken" ADD CONSTRAINT "UserToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerStats" ADD CONSTRAINT "PlayerStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "World" ADD CONSTRAINT "World_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldChunk" ADD CONSTRAINT "WorldChunk_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySlot" ADD CONSTRAINT "InventorySlot_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Database-level checks (Prisma cannot express these in schema.prisma)
ALTER TABLE "User" ADD CONSTRAINT "User_username_length_check"
  CHECK (char_length("username") BETWEEN 3 AND 20 AND char_length("usernameLower") BETWEEN 3 AND 20);

ALTER TABLE "PlayerStats" ADD CONSTRAINT "PlayerStats_nonnegative_check"
  CHECK ("blocksPlaced" >= 0 AND "blocksMined" >= 0 AND "distanceTravelled" >= 0 AND "playTimeSeconds" >= 0);

ALTER TABLE "World" ADD CONSTRAINT "World_values_check"
  CHECK (char_length("name") BETWEEN 1 AND 40
    AND "blocksMined" >= 0 AND "blocksPlaced" >= 0 AND "playTimeSeconds" >= 0
    AND "playerPitch" BETWEEN -1.6 AND 1.6);

ALTER TABLE "WorldChunk" ADD CONSTRAINT "WorldChunk_range_check"
  CHECK ("chunkX" BETWEEN -100000 AND 100000 AND "chunkZ" BETWEEN -100000 AND 100000
    AND jsonb_typeof("edits") = 'array');

ALTER TABLE "InventorySlot" ADD CONSTRAINT "InventorySlot_values_check"
  CHECK ("slot" BETWEEN 0 AND 35 AND "count" BETWEEN 1 AND 64 AND "blockId" BETWEEN 1 AND 255);