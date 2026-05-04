<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('assets') || ! Schema::hasColumn('assets', 'category')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            $this->rebuildSqliteAssetsTable(useLegacyEnum: false);

            return;
        }

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement('ALTER TABLE assets MODIFY category VARCHAR(255) NOT NULL');

            return;
        }

        if ($driver === 'pgsql') {
            foreach ($this->postgresCategoryConstraints() as $constraint) {
                DB::statement(sprintf('ALTER TABLE assets DROP CONSTRAINT IF EXISTS "%s"', str_replace('"', '""', $constraint)));
            }

            DB::statement('ALTER TABLE assets ALTER COLUMN category TYPE VARCHAR(255)');

            return;
        }

        Schema::table('assets', function (Blueprint $table) {
            $table->string('category')->change();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('assets') || ! Schema::hasColumn('assets', 'category')) {
            return;
        }

        $this->ensureOnlyLegacyCategories();

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            $this->rebuildSqliteAssetsTable(useLegacyEnum: true);

            return;
        }

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE assets MODIFY category ENUM('Computer', 'PS') NOT NULL");

            return;
        }

        if ($driver === 'pgsql') {
            foreach ($this->postgresCategoryConstraints() as $constraint) {
                DB::statement(sprintf('ALTER TABLE assets DROP CONSTRAINT IF EXISTS "%s"', str_replace('"', '""', $constraint)));
            }

            DB::statement("ALTER TABLE assets ADD CONSTRAINT assets_category_check CHECK (category IN ('Computer', 'PS'))");

            return;
        }

        Schema::table('assets', function (Blueprint $table) {
            $table->enum('category', ['Computer', 'PS'])->change();
        });
    }

    protected function rebuildSqliteAssetsTable(bool $useLegacyEnum): void
    {
        Schema::disableForeignKeyConstraints();
        DB::statement('PRAGMA foreign_keys = OFF');

        Schema::rename('asset_booking', 'asset_booking_legacy');
        Schema::rename('assets', 'assets_legacy');
        DB::statement('DROP INDEX IF EXISTS assets_room_id_index');

        Schema::create('assets', function (Blueprint $table) use ($useLegacyEnum) {
            $table->id();

            if ($useLegacyEnum) {
                $table->enum('category', ['Computer', 'PS']);
            } else {
                $table->string('category');
            }

            $table->foreignId('room_id')->index();
            $table->integer('total_usage_duration_minutes')->default(0);
            $table->decimal('total_earned_money', 15, 2)->default(0);
            $table->timestamps();
        });

        DB::statement('
            INSERT INTO assets (
                id,
                category,
                room_id,
                total_usage_duration_minutes,
                total_earned_money,
                created_at,
                updated_at
            )
            SELECT
                id,
                category,
                room_id,
                total_usage_duration_minutes,
                total_earned_money,
                created_at,
                updated_at
            FROM assets_legacy
        ');

        Schema::create('asset_booking', function (Blueprint $table) {
            $table->foreignId('asset_id')->constrained()->cascadeOnDelete();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
        });

        DB::statement('
            INSERT INTO asset_booking (asset_id, booking_id)
            SELECT asset_id, booking_id
            FROM asset_booking_legacy
        ');

        Schema::drop('asset_booking_legacy');
        Schema::drop('assets_legacy');

        DB::statement('PRAGMA foreign_keys = ON');
        Schema::enableForeignKeyConstraints();
    }

    protected function ensureOnlyLegacyCategories(): void
    {
        $hasCustomCategories = DB::table('assets')
            ->whereNotIn('category', ['Computer', 'PS'])
            ->exists();

        if ($hasCustomCategories) {
            throw new RuntimeException('Cannot restore the legacy asset category restriction while custom categories exist.');
        }
    }

    protected function postgresCategoryConstraints(): array
    {
        return DB::table('pg_constraint as con')
            ->join('pg_class as rel', 'rel.oid', '=', 'con.conrelid')
            ->select('con.conname', DB::raw('pg_get_constraintdef(con.oid) as definition'))
            ->where('rel.relname', 'assets')
            ->where('con.contype', 'c')
            ->get()
            ->filter(function ($constraint) {
                $definition = strtolower((string) $constraint->definition);

                return str_contains($definition, 'category')
                    && str_contains($definition, 'computer')
                    && str_contains($definition, 'ps');
            })
            ->pluck('conname')
            ->all();
    }
};
