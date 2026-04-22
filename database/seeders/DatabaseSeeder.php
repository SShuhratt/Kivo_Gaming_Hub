<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['phone' => '+998 90 123 45 67'],
            [
                'name' => 'Kivo Admin',
                'email' => 'admin@kivo.local',
                'phone' => '+998 90 123 45 67',
                'role' => 'admin',
                'password' => 'admin',
                'api_token' => null,
            ],
        );

        User::query()->updateOrCreate(
            ['phone' => '+998 91 765 43 21'],
            [
                'name' => 'Kivo User',
                'email' => 'user@kivo.local',
                'phone' => '+998 91 765 43 21',
                'role' => 'user',
                'password' => 'user123',
                'api_token' => null,
            ],
        );
    }
}
