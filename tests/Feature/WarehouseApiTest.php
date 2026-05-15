<?php

namespace Tests\Feature;

use App\Models\Manufacturer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class WarehouseApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_warehouse_requires_jwt_and_returns_401_instead_of_500(): void
    {
        $this->getJson('/api/warehouse')
            ->assertStatus(401)
            ->assertJson([
                'message' => 'JWT bearer token is missing.',
            ]);

        $this->postJson('/api/warehouse', [
            'name' => 'Lays snacks',
        ])
            ->assertStatus(401)
            ->assertJson([
                'message' => 'JWT bearer token is missing.',
            ]);
    }

    public function test_warehouse_options_preflight_is_not_blocked_by_jwt_middleware(): void
    {
        $this->call('OPTIONS', '/api/warehouse', [], [], [], [
            'HTTP_ORIGIN' => 'http://localhost:9002',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
        ])->assertStatus(204);
    }

    public function test_product_creation_under_existing_manufacturer_uses_manufacturer_id_and_frontend_payload_keys(): void
    {
        $manufacturer = Manufacturer::create([
            'name' => 'Pepsi',
        ]);

        $this->postJson('/api/warehouse', [
            'manufacturer_id' => $manufacturer->id,
            'manufacturer' => 'Should Not Override',
            'name' => 'Pepsi 1L',
            'barcode' => 'PEPSI-100',
            'unit' => 'shisha',
            'quantity' => 12,
            'purchase_price' => 7000,
            'sale_price' => 10000,
        ], $this->authHeaders())
            ->assertCreated()
            ->assertJsonPath('manufacturer_id', $manufacturer->id)
            ->assertJsonPath('manufacturer', 'Pepsi')
            ->assertJsonPath('name', 'Pepsi 1L')
            ->assertJsonPath('barcode', 'PEPSI-100')
            ->assertJsonPath('quantity', 12)
            ->assertJsonPath('unit', 'shisha')
            ->assertJsonPath('sale_price', 10000);

        $this->assertDatabaseHas('warehouse', [
            'manufacturer_id' => $manufacturer->id,
            'manufacturer' => 'Pepsi',
            'product_name' => 'Pepsi 1L',
            'shtrix_code' => 'PEPSI-100',
            'count' => 12,
            'sell_price' => 10000,
        ]);

        $this->getJson('/api/dashboard/bootstrap', $this->authHeaders())
            ->assertOk()
            ->assertJsonPath('companies.0.backend_id', $manufacturer->id)
            ->assertJsonPath('companies.0.name', 'Pepsi')
            ->assertJsonPath('companies.0.products.0.name', 'Pepsi 1L')
            ->assertJsonPath('companies.0.products.0.quantity', 12);
    }

    public function test_warehouse_validation_errors_return_422_json(): void
    {
        $manufacturer = Manufacturer::create([
            'name' => 'Nestle',
        ]);

        $this->postJson('/api/warehouse', [
            'manufacturer_id' => $manufacturer->id,
            'name' => '',
            'barcode' => '',
            'unit' => 'invalid-unit',
            'quantity' => 'not-a-number',
            'purchase_price' => -1,
            'sale_price' => -5,
        ], $this->authHeaders())
            ->assertStatus(422)
            ->assertJsonPath('message', 'Validation failed.')
            ->assertJsonPath('errors.product_name.0', 'Mahsulot nomi maydoni majburiy.')
            ->assertJsonPath('errors.shtrix_code.0', 'Shtrix kod maydoni majburiy.')
            ->assertJsonPath('errors.unit.0', "Tanlangan o'lchov birligi noto'g'ri.")
            ->assertJsonPath('errors.count.0', 'Miqdor butun son bo\'lishi kerak.');
    }

    public function test_warehouse_accepts_every_supported_unit_for_create_and_update(): void
    {
        $manufacturer = Manufacturer::create([
            'name' => 'Unit Factory',
        ]);

        foreach ($this->supportedUnits() as $index => $unit) {
            $response = $this->postJson('/api/warehouse', [
                'manufacturer_id' => $manufacturer->id,
                'name' => "Mahsulot {$unit}",
                'barcode' => sprintf('UNIT-%03d', $index + 1),
                'unit' => $unit,
                'quantity' => 10 + $index,
                'purchase_price' => 1000 + $index,
                'sale_price' => 2000 + $index,
            ], $this->authHeaders());

            $response
                ->assertCreated()
                ->assertJsonPath('unit', $unit);

            $productId = (int) $response->json('id');

            $this->assertDatabaseHas('warehouse', [
                'id' => $productId,
                'unit' => $unit,
            ]);

            $nextUnit = $this->supportedUnits()[($index + 1) % count($this->supportedUnits())];

            $this->putJson("/api/warehouse/{$productId}", [
                'unit' => $nextUnit,
            ], $this->authHeaders())
                ->assertOk()
                ->assertJsonPath('unit', $nextUnit);

            $this->assertDatabaseHas('warehouse', [
                'id' => $productId,
                'unit' => $nextUnit,
            ]);
        }
    }

    public function test_warehouse_alias_units_are_normalized_to_canonical_values(): void
    {
        $manufacturer = Manufacturer::create([
            'name' => 'Alias Factory',
        ]);

        $aliases = [
            'kg/kilogramm' => 'kg',
            'g/gramm' => 'g',
            'l/litr' => 'l',
            'millilitr' => 'ml',
            'm/metr' => 'm',
        ];

        foreach ($aliases as $input => $expected) {
            $response = $this->postJson('/api/warehouse', [
                'manufacturer_id' => $manufacturer->id,
                'name' => "Mahsulot {$expected}",
                'barcode' => 'ALIAS-'.strtoupper(str_replace(['/', ' '], '-', $expected)).'-'.substr(md5($input), 0, 6),
                'unit' => $input,
                'quantity' => 5,
                'purchase_price' => 1000,
                'sale_price' => 1500,
            ], $this->authHeaders());

            $response
                ->assertCreated()
                ->assertJsonPath('unit', $expected);

            $this->assertDatabaseHas('warehouse', [
                'id' => $response->json('id'),
                'unit' => $expected,
            ]);
        }
    }

    public function test_xalta_and_bag_are_rejected_with_a_422_validation_error(): void
    {
        $manufacturer = Manufacturer::create([
            'name' => 'Snack Co',
        ]);

        foreach (['xalta', 'bag'] as $unit) {
            $this->postJson('/api/warehouse', [
                'manufacturer_id' => $manufacturer->id,
                'name' => "Mahsulot {$unit}",
                'barcode' => 'REJECT-'.strtoupper($unit),
                'unit' => $unit,
                'quantity' => 5,
                'purchase_price' => 1000,
                'sale_price' => 1500,
            ], $this->authHeaders())
                ->assertStatus(422)
                ->assertJsonPath('message', 'Validation failed.')
                ->assertJsonPath('errors.unit.0', "Tanlangan o'lchov birligi noto'g'ri.");
        }
    }

    public function test_warehouse_index_handles_products_without_a_resolved_manufacturer_relation(): void
    {
        DB::table('warehouse')->insert([
            'manufacturer' => 'Loose Manufacturer',
            'manufacturer_id' => null,
            'product_name' => 'Loose Product',
            'shtrix_code' => 'LOOSE-001',
            'unit' => 'dona',
            'count' => 0,
            'purchase_price' => 0,
            'sell_price' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->getJson('/api/warehouse', $this->authHeaders())
            ->assertOk()
            ->assertJsonPath('0.manufacturer', 'Loose Manufacturer')
            ->assertJsonPath('0.name', 'Loose Product')
            ->assertJsonPath('0.quantity', 0)
            ->assertJsonPath('0.manufacturer_record', null);
    }

    protected function authHeaders(): array
    {
        return ['Authorization' => 'Bearer '.$this->loginToken()];
    }

    protected function loginToken(): string
    {
        User::updateOrCreate(
            ['phone_number' => '+998901234567'],
            [
                'name' => 'Warehouse User',
                'gmail' => 'warehouse-user@example.test',
                'password_hash' => Hash::make('secret123'),
            ],
        );

        return $this->postJson('/api/auth/login', [
            'phone_number' => '+998901234567',
            'password' => 'secret123',
        ])->json('token');
    }

    protected function supportedUnits(): array
    {
        return [
            'dona',
            'kg',
            'g',
            'l',
            'ml',
            'quti',
            'qadoq',
            'shisha',
            'm',
            'idish',
        ];
    }
}
