-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "RiskBand" AS ENUM ('A', 'B', 'C');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "monthly_consumption_kwh" INTEGER NOT NULL,
    "system_size_watts" INTEGER NOT NULL,
    "down_payment_cents" INTEGER NOT NULL,
    "system_price_cents" INTEGER NOT NULL,
    "principal_cents" INTEGER NOT NULL,
    "risk_band" "RiskBand" NOT NULL,
    "apr_bps" INTEGER NOT NULL,
    "pricing_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_offers" (
    "id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "term_years" INTEGER NOT NULL,
    "apr_bps" INTEGER NOT NULL,
    "principal_cents" INTEGER NOT NULL,
    "monthly_payment_cents" INTEGER NOT NULL,
    "total_paid_cents" INTEGER NOT NULL,

    CONSTRAINT "quote_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "quotes_user_id_created_at_idx" ON "quotes"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "quotes_created_at_idx" ON "quotes"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "quote_offers_quote_id_term_years_key" ON "quote_offers"("quote_id", "term_years");

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_offers" ADD CONSTRAINT "quote_offers_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
