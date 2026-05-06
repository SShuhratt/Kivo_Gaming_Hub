<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('rooms')) {
            Schema::create('rooms', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->timestamps();
            });
        }

        if (! Schema::hasColumn('services', 'name')) {
            Schema::table('services', function (Blueprint $table) {
                $table->string('name')->nullable()->after('id');
            });
        }

        if (! Schema::hasColumn('services', 'price')) {
            Schema::table('services', function (Blueprint $table) {
                $table->decimal('price', 15, 2)->nullable()->after('name');
            });
        }

        if (! Schema::hasColumn('assets', 'name')) {
            Schema::table('assets', function (Blueprint $table) {
                $table->string('name')->nullable()->after('id');
            });
        }

        if (! Schema::hasColumn('assets', 'service_id')) {
            Schema::table('assets', function (Blueprint $table) {
                $table->foreignId('service_id')->nullable()->after('name')->constrained('services')->nullOnDelete();
            });
        }

        if (Schema::hasColumn('assets', 'room_id')) {
            Schema::table('assets', function (Blueprint $table) {
                $table->unsignedBigInteger('room_id')->nullable()->change();
            });
        }

        $legacyRoomNumbers = collect();

        if (Schema::hasColumn('assets', 'room_id')) {
            $legacyRoomNumbers = $legacyRoomNumbers->merge(
                DB::table('assets')
                    ->whereNotNull('room_id')
                    ->pluck('room_id')
            );
        }

        if (Schema::hasColumn('services', 'room_id')) {
            $legacyRoomNumbers = $legacyRoomNumbers->merge(
                DB::table('services')
                    ->whereNotNull('room_id')
                    ->pluck('room_id')
            );
        }

        $roomIdMap = [];

        foreach ($legacyRoomNumbers
            ->filter(fn ($value) => $value !== null && $value !== '')
            ->unique()
            ->values() as $legacyRoomNumber) {
            $roomName = $this->legacyRoomName($legacyRoomNumber);
            $roomId = DB::table('rooms')->where('name', $roomName)->value('id');

            if (! $roomId) {
                $roomId = DB::table('rooms')->insertGetId([
                    'name' => $roomName,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $roomIdMap[(string) $legacyRoomNumber] = $roomId;
        }

        if (Schema::hasColumn('services', 'game_name')) {
            foreach (DB::table('services')->select('id', 'game_name', 'cost')->orderBy('id')->cursor() as $service) {
                DB::table('services')
                    ->where('id', $service->id)
                    ->update([
                        'name' => $service->game_name ?: DB::raw('name'),
                        'price' => $service->cost !== null ? round((float) $service->cost, 2) : DB::raw('price'),
                    ]);
            }
        }

        if (Schema::hasColumn('assets', 'category')) {
            $existingServices = DB::table('services')
                ->whereNotNull('name')
                ->get(['id', 'name', 'price'])
                ->keyBy(fn ($service) => $this->normalizeKey($service->name));

            foreach (DB::table('assets')->select('id', 'category', 'name', 'room_id')->orderBy('id')->cursor() as $asset) {
                $category = trim((string) $asset->category);

                if ($category === '') {
                    continue;
                }

                $key = $this->normalizeKey($category);
                $matchedService = $existingServices->get($key);

                if (! $matchedService) {
                    $serviceId = DB::table('services')->insertGetId([
                        'name' => $category,
                        'price' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    $matchedService = (object) [
                        'id' => $serviceId,
                        'name' => $category,
                        'price' => null,
                    ];

                    $existingServices->put($key, $matchedService);
                }

                $roomId = null;

                $roomId = $asset->room_id !== null
                    ? ($roomIdMap[(string) $asset->room_id] ?? null)
                    : null;

                DB::table('assets')
                    ->where('id', $asset->id)
                    ->update([
                        'name' => $asset->name ?: $category,
                        'service_id' => $matchedService->id,
                        'room_id' => $roomId,
                    ]);
            }
        } elseif (Schema::hasColumn('assets', 'room_id')) {
            foreach (DB::table('assets')->select('id', 'room_id', 'name')->orderBy('id')->cursor() as $asset) {
                DB::table('assets')
                    ->where('id', $asset->id)
                    ->update([
                        'name' => $asset->name ?: 'Asset '.$asset->id,
                        'room_id' => $asset->room_id !== null
                            ? ($roomIdMap[(string) $asset->room_id] ?? $asset->room_id)
                            : null,
                    ]);
            }
        }

        if (Schema::hasColumn('services', 'game_name') || Schema::hasColumn('services', 'cost')) {
            foreach (DB::table('services')->select('id', 'name', 'price')->orderBy('id')->cursor() as $service) {
                DB::table('services')
                    ->where('id', $service->id)
                    ->update([
                        'name' => $service->name ?: 'Service '.$service->id,
                        'price' => $service->price,
                    ]);
            }
        }

        Schema::table('assets', function (Blueprint $table) {
            if (Schema::hasColumn('assets', 'category')) {
                $table->dropColumn('category');
            }
        });

        if (Schema::hasColumn('services', 'room_id')) {
            try {
                Schema::table('services', function (Blueprint $table) {
                    $table->dropIndex(['room_id']);
                });
            } catch (\Throwable) {
                // The legacy index may already be absent depending on the database driver and migration history.
            }
        }

        Schema::table('services', function (Blueprint $table) {
            $columnsToDrop = [];

            if (Schema::hasColumn('services', 'game_name')) {
                $columnsToDrop[] = 'game_name';
            }

            if (Schema::hasColumn('services', 'room_id')) {
                $columnsToDrop[] = 'room_id';
            }

            if (Schema::hasColumn('services', 'cost')) {
                $columnsToDrop[] = 'cost';
            }

            if ($columnsToDrop !== []) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('services', 'game_name')) {
            Schema::table('services', function (Blueprint $table) {
                $table->string('game_name')->nullable();
            });
        }

        if (! Schema::hasColumn('services', 'room_id')) {
            Schema::table('services', function (Blueprint $table) {
                $table->unsignedBigInteger('room_id')->nullable();
            });
        }

        if (! Schema::hasColumn('services', 'cost')) {
            Schema::table('services', function (Blueprint $table) {
                $table->decimal('cost', 15, 2)->nullable();
            });
        }

        if (! Schema::hasColumn('assets', 'category')) {
            Schema::table('assets', function (Blueprint $table) {
                $table->string('category')->nullable();
            });
        }

        foreach (DB::table('services')->select('id', 'name', 'price')->orderBy('id')->cursor() as $service) {
            DB::table('services')
                ->where('id', $service->id)
                ->update([
                    'game_name' => $service->name,
                    'cost' => $service->price,
                ]);
        }

        if (Schema::hasColumn('assets', 'service_id')) {
            foreach (DB::table('assets')->select('id', 'service_id')->orderBy('id')->cursor() as $asset) {
                $category = $asset->service_id
                    ? DB::table('services')->where('id', $asset->service_id)->value('name')
                    : null;

                DB::table('assets')
                    ->where('id', $asset->id)
                    ->update([
                        'category' => $category,
                    ]);
            }

            Schema::table('assets', function (Blueprint $table) {
                $table->dropConstrainedForeignId('service_id');
            });
        }

        if (Schema::hasColumn('services', 'price')) {
            Schema::table('services', function (Blueprint $table) {
                $table->dropColumn('price');
            });
        }

        if (Schema::hasColumn('services', 'name')) {
            Schema::table('services', function (Blueprint $table) {
                $table->dropColumn('name');
            });
        }

        if (Schema::hasTable('rooms')) {
            Schema::dropIfExists('rooms');
        }
    }

    protected function legacyRoomName(int|string $legacyRoomNumber): string
    {
        return 'Xona '.$legacyRoomNumber;
    }

    protected function normalizeKey(?string $value): string
    {
        return mb_strtolower(trim((string) $value));
    }
};
