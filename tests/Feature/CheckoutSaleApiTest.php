<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CheckoutSaleApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_warehouse_accepts_expanded_unit_values(): void
    {
        $this->postJson('/api/warehouse', [
            'manufacturer' => 'Nestle',
            'product_name' => 'Shokolad',
            'shtrix_code' => 'NESTLE-001',
            'unit' => 'dona',
            'count' => 20,
            'purchase_price' => 5000,
            'sell_price' => 7000,
        ], $this->authHeaders())
            ->assertCreated()
            ->assertJsonPath('unit', 'dona');

        $this->assertDatabaseHas('warehouse', [
            'shtrix_code' => 'NESTLE-001',
            'unit' => 'dona',
        ]);
    }

    public function test_checkout_sale_reduces_stock_and_appears_in_trade_and_dashboard_sales(): void
    {
        Carbon::setTestNow('2026-05-09T12:00:00+05:00');

        $product = Warehouse::create([
            'manufacturer' => 'Pepsi',
            'product_name' => 'Pepsi 0.5L',
            'shtrix_code' => '4780099999999',
            'unit' => 'shisha',
            'count' => 10,
            'purchase_price' => 6000,
            'sell_price' => 9000,
        ]);

        $this->postJson('/api/checkout-sales', [
            'payment_method' => 'cash',
            'items' => [
                [
                    'warehouse_id' => $product->id,
                    'quantity' => 2,
                ],
            ],
        ], $this->authHeaders())
            ->assertCreated()
            ->assertJsonPath('payment_method', 'cash')
            ->assertJsonPath('total_amount', 18000)
            ->assertJsonPath('items.0.product_name', 'Pepsi 0.5L')
            ->assertJsonPath('items.0.quantity', 2)
            ->assertJsonPath('items.0.total_price', 18000);

        $this->assertDatabaseHas('warehouse', [
            'id' => $product->id,
            'count' => 8,
        ]);

        $this->assertDatabaseHas('checkout_sales', [
            'payment_method' => 'cash',
            'total_amount' => 18000,
        ]);

        $this->assertDatabaseHas('checkout_sale_items', [
            'warehouse_id' => $product->id,
            'product_name' => 'Pepsi 0.5L',
            'quantity' => 2,
            'total_price' => 18000,
        ]);

        $this->getJson('/api/trades', $this->authHeaders())
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.type', 'Product Sale')
            ->assertJsonPath('0.payment_method', 'cash')
            ->assertJsonPath('0.details.product.name', 'Pepsi 0.5L')
            ->assertJsonPath('0.details.product.quantity', 2);

        $this->getJson('/api/dashboard/bootstrap', $this->authHeaders())
            ->assertOk()
            ->assertJsonPath('summary.sales_total_today', 18000)
            ->assertJsonCount(1, 'sales')
            ->assertJsonPath('sales.0.transaction_type', 'product_sale')
            ->assertJsonPath('sales.0.products', 18000)
            ->assertJsonPath('sales.0.product_name', 'Pepsi 0.5L')
            ->assertJsonPath('sales.0.quantity', 2)
            ->assertJsonPath('sales.0.payment_method', 'cash');
    }

    public function test_checkout_sale_does_not_persist_when_stock_is_insufficient(): void
    {
        $product = Warehouse::create([
            'manufacturer' => 'Coca-Cola',
            'product_name' => 'Coke Zero',
            'shtrix_code' => '4780011111111',
            'unit' => 'shisha',
            'count' => 1,
            'purchase_price' => 6000,
            'sell_price' => 9000,
        ]);

        $this->postJson('/api/checkout-sales', [
            'payment_method' => 'cash',
            'items' => [
                [
                    'warehouse_id' => $product->id,
                    'quantity' => 2,
                ],
            ],
        ], $this->authHeaders())
            ->assertStatus(409)
            ->assertJson([
                'message' => 'Not enough stock for this product.',
                'message_uz' => 'Mahsulot omborda yetarli emas.',
            ]);

        $this->assertDatabaseMissing('checkout_sales', [
            'payment_method' => 'cash',
            'total_amount' => 18000,
        ]);

        $this->assertDatabaseHas('warehouse', [
            'id' => $product->id,
            'count' => 1,
        ]);
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
                'name' => 'Checkout User',
                'gmail' => 'checkout-user@example.test',
                'password_hash' => Hash::make('secret123'),
            ],
        );

        return $this->postJson('/api/auth/login', [
            'phone_number' => '+998901234567',
            'password' => 'secret123',
        ])->json('token');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }
}
