<?php

namespace App\Services;

use App\Models\Warehouse;

class OpenApiSpec
{
    public function toArray(): array
    {
        return [
            'openapi' => '3.0.3',
            'info' => [
                'title' => 'Khivo Gaming Hub API',
                'version' => '2.0.0',
                'description' => 'JWT-protected gaming center management API.',
            ],
            'servers' => [
                ['url' => '/api', 'description' => 'Local API'],
            ],
            'tags' => [
                ['name' => 'Auth'],
                ['name' => 'Dashboard'],
                ['name' => 'Bookings'],
                ['name' => 'Sessions'],
                ['name' => 'Finance'],
                ['name' => 'Rooms'],
                ['name' => 'Assets'],
                ['name' => 'Warehouse'],
                ['name' => 'Manufacturers'],
                ['name' => 'Services'],
            ],
            'components' => $this->components(),
            'paths' => array_merge(
                $this->authPaths(),
                $this->dashboardPaths(),
                $this->bookingPaths(),
                $this->sessionPaths(),
                $this->tradePaths(),
                $this->crudPaths('Rooms', 'Room', '/rooms', 'room'),
                $this->crudPaths('Assets', 'Asset', '/assets', 'asset'),
                $this->crudPaths('Warehouse', 'WarehouseItem', '/warehouse', 'warehouse', 'listWarehouseItems'),
                $this->manufacturerPaths(),
                $this->crudPaths('Services', 'Service', '/services', 'service'),
            ),
        ];
    }

    protected function components(): array
    {
        return [
            'securitySchemes' => [
                'bearerAuth' => [
                    'type' => 'http',
                    'scheme' => 'bearer',
                    'bearerFormat' => 'JWT',
                ],
            ],
            'parameters' => [
                'asset' => $this->idParameter('asset', 'Asset ID'),
                'warehouse' => $this->idParameter('warehouse', 'Warehouse item ID'),
                'manufacturer' => $this->idParameter('manufacturer', 'Manufacturer ID'),
                'room' => $this->idParameter('room', 'Room ID'),
                'service' => $this->idParameter('service', 'Service ID'),
                'booking' => $this->idParameter('booking', 'Booking or session ID'),
            ],
            'schemas' => [
                'MessageResponse' => $this->object(['message' => ['type' => 'string', 'example' => 'Operation completed.']]),
                'ErrorResponse' => $this->object([
                    'message' => ['type' => 'string', 'example' => 'Bad request.'],
                    'errors' => ['type' => 'object', 'additionalProperties' => ['type' => 'array', 'items' => ['type' => 'string']]],
                ]),
                'UserRegisterRequest' => $this->object([
                    'name' => ['type' => 'string', 'example' => 'User One'],
                    'gmail' => ['type' => 'string', 'format' => 'email', 'example' => 'user1 @gmail.com'],
                    'phone_number' => ['type' => 'string', 'example' => '+998901234567'],
                    'password' => ['type' => 'string', 'format' => 'password', 'example' => 'user123'],
                ], ['name', 'gmail', 'phone_number', 'password']),
                'UserLoginRequest' => $this->object([
                    'phone_number' => ['type' => 'string', 'example' => '+998901234567'],
                    'password' => ['type' => 'string', 'format' => 'password', 'example' => 'user123'],
                ], ['phone_number', 'password']),
                'LoginResponse' => $this->object([
                    'token_type' => ['type' => 'string', 'example' => 'Bearer'],
                    'token' => ['type' => 'string', 'example' => 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'],
                    'expires_in' => ['type' => 'integer', 'example' => 86400],
                    'user' => ['$ref' => '#/components/schemas/User'],
                ]),
                'ForgotPasswordRequest' => $this->object([
                    'phone_number' => ['type' => 'string', 'example' => '+998901234567'],
                ], ['phone_number']),
                'VerifyOtpRequest' => $this->object([
                    'phone_number' => ['type' => 'string', 'example' => '+998901234567'],
                    'otp' => ['type' => 'string', 'example' => '123456'],
                ], ['phone_number', 'otp']),
                'ResetPasswordRequest' => $this->object([
                    'phone_number' => ['type' => 'string', 'example' => '+998901234567'],
                    'otp' => ['type' => 'string', 'example' => '123456'],
                    'new_password' => ['type' => 'string', 'format' => 'password', 'example' => 'newpass123'],
                ], ['phone_number', 'otp', 'new_password']),
                'User' => $this->object([
                    'id' => ['type' => 'integer', 'example' => 1],
                    'name' => ['type' => 'string', 'example' => 'User One'],
                    'gmail' => ['type' => 'string', 'format' => 'email', 'example' => 'user1@gmail.com'],
                    'phone_number' => ['type' => 'string', 'example' => '+998901234567'],
                ]),
                'BookingCalculateRequest' => $this->bookingRequest(['asset_ids', 'start_time']),
                'BookingCreateRequest' => $this->bookingRequest(['asset_ids', 'start_time', 'status']),
                'BookingCalculationResponse' => $this->object([
                    'duration_minutes' => ['type' => 'integer', 'example' => 120],
                    'duration_hours' => ['type' => 'number', 'nullable' => true, 'example' => 2],
                    'hourly_rate_total' => ['type' => 'number', 'example' => 55000],
                    'total_cost' => ['type' => 'number', 'example' => 110000],
                    'is_vip' => ['type' => 'boolean', 'example' => false],
                    'end_time' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                    'asset_breakdown' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/SessionAsset']],
                ]),
                'DashboardBootstrapResponse' => $this->object([
                    'user' => ['$ref' => '#/components/schemas/User'],
                    'summary' => $this->object([
                        'active_sessions' => ['type' => 'integer', 'example' => 2],
                        'total_session_devices' => ['type' => 'integer', 'example' => 9],
                        'services_count' => ['type' => 'integer', 'example' => 2],
                        'services_ready' => ['type' => 'boolean', 'example' => true],
                        'rooms_count' => ['type' => 'integer', 'example' => 4],
                        'sales_total_today' => ['type' => 'number', 'example' => 365000],
                    ]),
                    'services' => ['type' => 'array', 'items' => ['type' => 'object']],
                    'sales' => ['type' => 'array', 'items' => ['type' => 'object']],
                    'debts' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/DebtRecord']],
                    'sessions' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/Session']],
                    'companies' => ['type' => 'array', 'items' => ['type' => 'object']],
                    'assets' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/Asset']],
                    'sections' => ['type' => 'array', 'items' => $this->object([
                        'key' => ['type' => 'string'],
                        'name' => ['type' => 'string'],
                        'path' => ['type' => 'string'],
                    ])],
                ]),
                'Booking' => $this->object([
                    'id' => ['type' => 'integer', 'example' => 1],
                    'start_time' => ['type' => 'string', 'format' => 'date-time'],
                    'end_time' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                    'ended_at' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                    'duration_minutes' => ['type' => 'integer', 'example' => 120],
                    'requested_duration_hours' => ['type' => 'number', 'nullable' => true, 'example' => 2],
                    'total_cost' => ['type' => 'number', 'example' => 110000],
                    'status' => ['type' => 'string', 'enum' => ['submitted', 'debt_closed'], 'example' => 'submitted'],
                    'session_status' => ['type' => 'string', 'enum' => ['active', 'completed', 'cancelled'], 'example' => 'active'],
                    'debt_name' => ['type' => 'string', 'nullable' => true],
                    'debt_phone_number' => ['type' => 'string', 'nullable' => true],
                    'is_vip' => ['type' => 'boolean', 'example' => false],
                    'assets' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/SessionAsset']],
                    'pricing' => ['$ref' => '#/components/schemas/PricingSummary'],
                ]),
                'Session' => $this->object([
                    'id' => ['type' => 'integer', 'example' => 1],
                    'status' => ['type' => 'string', 'enum' => ['submitted', 'debt_closed'], 'example' => 'submitted'],
                    'session_status' => ['type' => 'string', 'enum' => ['active', 'completed', 'cancelled'], 'example' => 'active'],
                    'start_time' => ['type' => 'string', 'format' => 'date-time'],
                    'end_time' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                    'ended_at' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                    'duration_minutes' => ['type' => 'integer', 'example' => 120],
                    'requested_duration_hours' => ['type' => 'number', 'nullable' => true, 'example' => 2],
                    'total_cost' => ['type' => 'number', 'example' => 110000],
                    'debt_name' => ['type' => 'string', 'nullable' => true],
                    'debt_phone_number' => ['type' => 'string', 'nullable' => true],
                    'is_vip' => ['type' => 'boolean', 'example' => false],
                    'pricing' => ['$ref' => '#/components/schemas/PricingSummary'],
                    'assets' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/SessionAsset']],
                    'assets_count' => ['type' => 'integer', 'example' => 2],
                    'room_label' => ['type' => 'string', 'example' => 'Xona 1'],
                    'trade_exists' => ['type' => 'boolean', 'example' => false],
                    'can_delete' => ['type' => 'boolean', 'example' => false],
                    'trade' => ['$ref' => '#/components/schemas/SessionTrade'],
                ]),
                'SessionTrade' => $this->object([
                    'id' => ['type' => 'integer', 'example' => 12],
                    'status' => ['type' => 'string', 'enum' => ['submitted', 'debt_closed'], 'example' => 'submitted'],
                    'session_status' => ['type' => 'string', 'enum' => ['completed', 'cancelled'], 'example' => 'completed'],
                    'saved_cost' => ['type' => 'number', 'example' => 110000],
                    'duration_minutes' => ['type' => 'integer', 'example' => 125],
                    'start_time' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                    'end_time' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                ]),
                'TradeLedgerEntry' => $this->object([
                    'id' => ['type' => 'integer', 'example' => 1],
                    'source' => ['type' => 'string', 'enum' => ['trade', 'checkout_sale_item'], 'example' => 'trade'],
                    'booking_id' => ['type' => 'integer', 'nullable' => true, 'example' => 1],
                    'checkout_sale_id' => ['type' => 'integer', 'nullable' => true, 'example' => 1],
                    'checkout_sale_item_id' => ['type' => 'integer', 'nullable' => true, 'example' => 1],
                    'type' => ['type' => 'string', 'enum' => ['Income', 'Debt', 'Product Sale'], 'example' => 'Income'],
                    'amount' => ['type' => 'number', 'example' => 240000],
                    'status' => ['type' => 'string', 'enum' => ['submitted', 'debt_closed'], 'example' => 'submitted'],
                    'session_status' => ['type' => 'string', 'enum' => ['completed', 'cancelled'], 'example' => 'completed'],
                    'payment_method' => ['type' => 'string', 'enum' => ['cash', 'terminal', 'click', 'payme', 'debt'], 'example' => 'cash'],
                    'cashier_name' => ['type' => 'string', 'nullable' => true, 'example' => 'Cashier User'],
                    'created_at' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                    'details' => ['type' => 'object'],
                    'pricing_label' => ['type' => 'string', 'example' => 'Service pricing'],
                    'pricing' => ['$ref' => '#/components/schemas/PricingSummary'],
                    'assets' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/Asset']],
                ]),
                'ServiceFinanceSummary' => $this->object([
                    'total_duration_seconds' => ['type' => 'integer', 'example' => 45030],
                    'total_duration_formatted' => ['type' => 'string', 'example' => '12:30:30'],
                    'total_income' => ['type' => 'number', 'example' => 250000],
                    'total_earned_amount' => ['type' => 'number', 'example' => 250000],
                    'total_records' => ['type' => 'integer', 'example' => 8],
                    'total_session_records' => ['type' => 'integer', 'example' => 18],
                ]),
                'ServiceFinanceAssetSession' => $this->object([
                    'session_id' => ['type' => 'integer', 'nullable' => true, 'example' => 7],
                    'trade_id' => ['type' => 'integer', 'example' => 5],
                    'start_time' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                    'end_time' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                    'completed_at' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                    'duration_seconds' => ['type' => 'integer', 'example' => 5400],
                    'duration_formatted' => ['type' => 'string', 'example' => '01:30:00'],
                    'amount' => ['type' => 'number', 'example' => 82500],
                    'payment_status' => ['type' => 'string', 'enum' => ['paid', 'debt'], 'example' => 'debt'],
                    'payment_status_code' => ['type' => 'string', 'enum' => ['submitted', 'debt_closed'], 'example' => 'debt_closed'],
                    'payment_status_label' => ['type' => 'string', 'example' => 'Qarz'],
                    'payment_method' => ['type' => 'string', 'enum' => ['cash', 'debt'], 'example' => 'cash'],
                    'payment_method_label' => ['type' => 'string', 'example' => 'Naqd'],
                    'debtor_name' => ['type' => 'string', 'nullable' => true, 'example' => 'Ali'],
                    'debtor_phone' => ['type' => 'string', 'nullable' => true, 'example' => '+998901234567'],
                ]),
                'ServiceFinanceAsset' => $this->object([
                    'asset_id' => ['type' => 'integer', 'nullable' => true, 'example' => 1],
                    'asset_name' => ['type' => 'string', 'example' => 'computer1'],
                    'room_name' => ['type' => 'string', 'example' => 'Opshiy zal'],
                    'service_name' => ['type' => 'string', 'example' => 'Computer'],
                    'asset_order' => ['type' => 'integer', 'nullable' => true, 'example' => 1],
                    'total_duration_seconds' => ['type' => 'integer', 'example' => 45000],
                    'total_duration_formatted' => ['type' => 'string', 'example' => '12:30:00'],
                    'total_income' => ['type' => 'number', 'example' => 250000],
                    'sessions' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/ServiceFinanceAssetSession']],
                ]),
                'ServiceFinanceDetailsResponse' => $this->object([
                    'summary' => ['$ref' => '#/components/schemas/ServiceFinanceSummary'],
                    'assets' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/ServiceFinanceAsset']],
                ]),
                'DebtRecord' => $this->object([
                    'id' => ['type' => 'string', 'example' => 'trade-5'],
                    'source' => ['type' => 'string', 'enum' => ['booking', 'trade'], 'example' => 'trade'],
                    'booking_id' => ['type' => 'integer', 'nullable' => true, 'example' => 7],
                    'trade_id' => ['type' => 'integer', 'nullable' => true, 'example' => 5],
                    'session_id' => ['type' => 'integer', 'nullable' => true, 'example' => 7],
                    'debtor_name' => ['type' => 'string', 'nullable' => true, 'example' => 'Ali'],
                    'debtor_phone_number' => ['type' => 'string', 'nullable' => true, 'example' => '+998901234567'],
                    'debt_amount' => ['type' => 'number', 'example' => 25000],
                    'final_cost' => ['type' => 'number', 'example' => 25000],
                    'session_state' => ['type' => 'string', 'enum' => ['active', 'ended'], 'example' => 'ended'],
                    'payment_state' => ['type' => 'string', 'enum' => ['paid', 'unpaid'], 'example' => 'unpaid'],
                    'session_status' => ['type' => 'string', 'example' => 'completed'],
                    'payment_status' => ['type' => 'string', 'enum' => ['submitted', 'debt_closed'], 'example' => 'debt_closed'],
                    'can_delete' => ['type' => 'boolean', 'example' => false],
                    'created_at' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                    'session_date' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                    'start_time' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                    'end_time' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                    'duration_minutes' => ['type' => 'integer', 'nullable' => true, 'example' => 90],
                    'room_label' => ['type' => 'string', 'example' => 'Opshiy zal'],
                    'pricing_label' => ['type' => 'string', 'example' => 'Service pricing'],
                    'reference_label' => ['type' => 'string', 'example' => 'Trade #5'],
                ]),
                'AssetCreateRequest' => $this->object([
                    'name' => ['type' => 'string', 'example' => 'computer1'],
                    'service_id' => ['type' => 'integer', 'example' => 1],
                    'room_id' => ['type' => 'integer', 'example' => 1],
                    'total_usage_duration_minutes' => ['type' => 'integer', 'example' => 0],
                    'total_earned_money' => ['type' => 'number', 'example' => 0],
                ], ['name', 'service_id', 'room_id']),
                'AssetUpdateRequest' => $this->object([
                    'name' => ['type' => 'string', 'example' => 'ps5(1)'],
                    'service_id' => ['type' => 'integer', 'example' => 2],
                    'room_id' => ['type' => 'integer', 'example' => 2],
                    'total_usage_duration_minutes' => ['type' => 'integer', 'example' => 120],
                    'total_earned_money' => ['type' => 'number', 'example' => 120000],
                ]),
                'Asset' => $this->object([
                    'id' => ['type' => 'integer', 'example' => 1],
                    'name' => ['type' => 'string', 'example' => 'computer1'],
                    'category' => ['type' => 'string', 'example' => 'Computer'],
                    'service_id' => ['type' => 'integer', 'nullable' => true, 'example' => 1],
                    'service_name' => ['type' => 'string', 'nullable' => true, 'example' => 'Computer'],
                    'service_price' => ['type' => 'number', 'nullable' => true, 'example' => 20000],
                    'room_id' => ['type' => 'integer', 'nullable' => true, 'example' => 1],
                    'room_name' => ['type' => 'string', 'nullable' => true, 'example' => 'Opshiy zal'],
                    'total_usage_duration_minutes' => ['type' => 'integer', 'example' => 0],
                    'total_earned_money' => ['type' => 'number', 'example' => 0],
                ]),
                'SessionAsset' => $this->object([
                    'id' => ['type' => 'integer', 'nullable' => true, 'example' => 1],
                    'name' => ['type' => 'string', 'nullable' => true, 'example' => 'computer1'],
                    'category' => ['type' => 'string', 'nullable' => true, 'example' => 'Computer'],
                    'room_id' => ['type' => 'integer', 'nullable' => true, 'example' => 101],
                    'room_name' => ['type' => 'string', 'nullable' => true, 'example' => 'Opshiy zal'],
                    'room_number' => ['type' => 'string', 'nullable' => true, 'example' => 'Opshiy zal'],
                    'hourly_price' => ['type' => 'number', 'nullable' => true, 'example' => 20000],
                ]),
                'RoomCreateRequest' => $this->object([
                    'name' => ['type' => 'string', 'example' => 'Opshiy zal'],
                ], ['name']),
                'RoomUpdateRequest' => $this->object([
                    'name' => ['type' => 'string', 'example' => '2-xona'],
                ]),
                'Room' => $this->object([
                    'id' => ['type' => 'integer', 'example' => 1],
                    'name' => ['type' => 'string', 'example' => 'Opshiy zal'],
                    'assets' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/Asset']],
                ]),
                'WarehouseItemCreateRequest' => $this->object([
                    'manufacturer' => ['type' => 'string', 'example' => 'Asus'],
                    'product_name' => ['type' => 'string', 'example' => 'Gaming Mouse'],
                    'shtrix_code' => ['type' => 'string', 'example' => 'WH-10001'],
                    'unit' => ['type' => 'string', 'enum' => Warehouse::allowedUnits(), 'example' => 'piece'],
                    'count' => ['type' => 'integer', 'example' => 10],
                    'purchase_price' => ['type' => 'number', 'example' => 20],
                    'sell_price' => ['type' => 'number', 'example' => 35],
                ], ['manufacturer', 'product_name', 'shtrix_code', 'unit', 'count', 'purchase_price', 'sell_price']),
                'WarehouseItemUpdateRequest' => $this->object([
                    'manufacturer' => ['type' => 'string', 'example' => 'Asus'],
                    'product_name' => ['type' => 'string', 'example' => 'Gaming Mouse Pro'],
                    'shtrix_code' => ['type' => 'string', 'example' => 'WH-10001'],
                    'unit' => ['type' => 'string', 'enum' => Warehouse::allowedUnits(), 'example' => 'piece'],
                    'count' => ['type' => 'integer', 'example' => 12],
                    'purchase_price' => ['type' => 'number', 'example' => 20],
                    'sell_price' => ['type' => 'number', 'example' => 40],
                ]),
                'WarehouseItem' => $this->object([
                    'id' => ['type' => 'integer', 'example' => 1],
                    'manufacturer' => ['type' => 'string', 'example' => 'Asus'],
                    'product_name' => ['type' => 'string', 'example' => 'Gaming Mouse'],
                    'shtrix_code' => ['type' => 'string', 'example' => 'WH-10001'],
                    'unit' => ['type' => 'string', 'enum' => Warehouse::allowedUnits(), 'example' => 'piece'],
                    'count' => ['type' => 'integer', 'example' => 10],
                    'purchase_price' => ['type' => 'number', 'example' => 20],
                    'sell_price' => ['type' => 'number', 'example' => 35],
                    'profit_percentage' => ['type' => 'number', 'readOnly' => true, 'example' => 75],
                ]),
                'CheckoutSaleCreateRequest' => $this->object([
                    'payment_method' => ['type' => 'string', 'enum' => ['cash', 'terminal', 'click', 'payme'], 'example' => 'cash'],
                    'items' => [
                        'type' => 'array',
                        'items' => $this->object([
                            'warehouse_id' => ['type' => 'integer', 'example' => 1],
                            'quantity' => ['type' => 'integer', 'example' => 2],
                        ], ['warehouse_id', 'quantity']),
                    ],
                ], ['payment_method', 'items']),
                'CheckoutSaleResponse' => $this->object([
                    'id' => ['type' => 'integer', 'example' => 1],
                    'payment_method' => ['type' => 'string', 'enum' => ['cash', 'terminal', 'click', 'payme'], 'example' => 'cash'],
                    'total_amount' => ['type' => 'number', 'example' => 18000],
                    'cashier_name' => ['type' => 'string', 'nullable' => true, 'example' => 'Cashier User'],
                    'created_at' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                    'items' => [
                        'type' => 'array',
                        'items' => $this->object([
                            'id' => ['type' => 'integer', 'example' => 1],
                            'warehouse_id' => ['type' => 'integer', 'nullable' => true, 'example' => 1],
                            'manufacturer_name' => ['type' => 'string', 'example' => 'Pepsi'],
                            'product_name' => ['type' => 'string', 'example' => 'Pepsi 0.5L'],
                            'barcode' => ['type' => 'string', 'example' => '4780099999999'],
                            'unit' => ['type' => 'string', 'enum' => Warehouse::allowedUnits(), 'example' => 'bottle'],
                            'quantity' => ['type' => 'integer', 'example' => 2],
                            'unit_price' => ['type' => 'number', 'example' => 9000],
                            'total_price' => ['type' => 'number', 'example' => 18000],
                        ]),
                    ],
                ]),
                'ServiceCreateRequest' => $this->object([
                    'name' => ['type' => 'string', 'example' => 'Computer'],
                    'price' => ['type' => 'number', 'example' => 20000],
                ], ['name', 'price']),
                'ServiceUpdateRequest' => $this->object([
                    'name' => ['type' => 'string', 'example' => 'PS5'],
                    'price' => ['type' => 'number', 'example' => 35000],
                ]),
                'Service' => $this->object([
                    'id' => ['type' => 'integer', 'example' => 1],
                    'name' => ['type' => 'string', 'example' => 'Computer'],
                    'price' => ['type' => 'number', 'example' => 20000],
                ]),
                'PricingSummary' => $this->object([
                    'label' => ['type' => 'string', 'example' => 'Service pricing'],
                    'hourly_rate' => ['type' => 'number', 'example' => 55000],
                ]),
                'SimpleMessageResponse' => $this->object([
                    'message' => ['type' => 'string', 'example' => 'Action required.'],
                ]),
            ],
            'responses' => [
                'BadRequest' => $this->errorResponse('Bad request', 'ErrorResponse'),
                'Unauthorized' => $this->errorResponse('Unauthorized', 'SimpleMessageResponse'),
                'NotFound' => $this->errorResponse('Not found', 'SimpleMessageResponse'),
                'NoContent' => ['description' => 'Deleted successfully'],
            ],
        ];
    }

    protected function authPaths(): array
    {
        return [
            '/auth/register' => ['post' => $this->operation('Auth', 'Register user', 'registerUser', 'UserRegisterRequest', 'MessageResponse', 201, false, true)],
            '/auth/login' => ['post' => $this->operation('Auth', 'Login and receive JWT', 'loginUser', 'UserLoginRequest', 'LoginResponse', 200, false, true, true)],
            '/auth/forgot-password' => ['post' => $this->operation('Auth', 'Generate password reset OTP', 'forgotPassword', 'ForgotPasswordRequest', 'MessageResponse', 200, false, true, false, true)],
            '/auth/verify-otp' => ['post' => $this->operation('Auth', 'Verify password reset OTP', 'verifyOtp', 'VerifyOtpRequest', 'MessageResponse', 200, false, true)],
            '/auth/reset-password' => ['post' => $this->operation('Auth', 'Reset password with OTP', 'resetPassword', 'ResetPasswordRequest', 'MessageResponse', 200, false, true)],
        ];
    }

    protected function dashboardPaths(): array
    {
        return [
            '/dashboard/bootstrap' => [
                'get' => $this->operation('Dashboard', 'Get dashboard bootstrap data', 'getDashboardBootstrap', null, 'DashboardBootstrapResponse'),
            ],
        ];
    }

    protected function bookingPaths(): array
    {
        return [
            '/bookings/calculate' => [
                'post' => $this->operation('Bookings', 'Calculate booking cost', 'calculateBooking', 'BookingCalculateRequest', 'BookingCalculationResponse'),
            ],
            '/bookings' => [
                'post' => $this->operation('Bookings', 'Create booking as active session', 'createBooking', 'BookingCreateRequest', 'Session', 201),
            ],
        ];
    }

    protected function sessionPaths(): array
    {
        return [
            '/sessions' => [
                'get' => $this->listOperation('Sessions', 'List active and ended sessions', 'listSessions', 'Session'),
            ],
            '/sessions/{booking}' => [
                'parameters' => [['$ref' => '#/components/parameters/booking']],
                'get' => $this->operation('Sessions', 'Get session', 'getSession', null, 'Session', 200, true, true, false, true),
                'delete' => $this->deleteOperation('Sessions', 'Delete ended session', 'deleteSession'),
            ],
            '/sessions/{booking}/end' => [
                'parameters' => [['$ref' => '#/components/parameters/booking']],
                'post' => $this->operation('Sessions', 'End an active session manually', 'endSession', null, 'Session'),
            ],
        ];
    }

    protected function tradePaths(): array
    {
        $operation = $this->operation('Finance', 'List financial ledger entries', 'listTrades', null, null);
        $operation['parameters'] = [
            ['name' => 'status', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'enum' => ['submitted', 'debt_closed']]],
            ['name' => 'type', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'enum' => ['Income', 'Debt', 'Product Sale']]],
        ];
        $operation['responses']['200'] = [
            'description' => 'Ledger entries',
            'content' => [
                'application/json' => [
                    'schema' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/TradeLedgerEntry']],
                ],
            ],
        ];

        $tradeExportOperation = $this->xlsxDownloadOperation('Finance', 'Export financial ledger entries', 'exportTrades');
        $tradeExportOperation['parameters'] = [
            ['name' => 'status', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'enum' => ['submitted', 'debt_closed']]],
            ['name' => 'type', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'enum' => ['Income', 'Debt', 'Product Sale']]],
            ['name' => 'search', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string']],
            ['name' => 'payment_method', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'enum' => ['cash', 'terminal', 'click', 'payme', 'debt']]],
            ['name' => 'date_from', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'format' => 'date']],
            ['name' => 'date_to', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'format' => 'date']],
        ];

        $debtOperation = $this->operation('Finance', 'List debtors and debt records', 'listDebts', null, null);
        $debtOperation['parameters'] = [
            ['name' => 'status', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'enum' => ['active', 'ended', 'paid', 'unpaid']]],
        ];
        $debtOperation['responses']['200'] = [
            'description' => 'Debt records',
            'content' => [
                'application/json' => [
                    'schema' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/DebtRecord']],
                ],
            ],
        ];

        $serviceSummaryOperation = $this->operation(
            'Finance',
            'Get completed service duration and earned amount summary',
            'getServiceFinanceSummary',
            null,
            'ServiceFinanceSummary',
        );

        $serviceDetailsOperation = $this->operation(
            'Finance',
            'List completed service income details',
            'listServiceFinanceDetails',
            null,
            null,
        );
        $serviceDetailsOperation['responses']['200'] = [
            'description' => 'Completed service records',
            'content' => [
                'application/json' => [
                    'schema' => ['$ref' => '#/components/schemas/ServiceFinanceDetailsResponse'],
                ],
            ],
        ];

        return [
            '/trades' => ['get' => $operation],
            '/finance/service-summary' => ['get' => $serviceSummaryOperation],
            '/finance/service-details' => ['get' => $serviceDetailsOperation],
            '/trades/export' => ['get' => $tradeExportOperation],
            '/debts' => ['get' => $debtOperation],
            '/checkout-sales' => [
                'post' => $this->operation('Finance', 'Create checkout sale', 'createCheckoutSale', 'CheckoutSaleCreateRequest', 'CheckoutSaleResponse', 201),
            ],
        ];
    }

    protected function manufacturerPaths(): array
    {
        return [
            '/manufacturers/{manufacturer}' => [
                'parameters' => [['$ref' => '#/components/parameters/manufacturer']],
                'delete' => $this->deleteOperation('Manufacturers', 'Delete Manufacturer', 'deleteManufacturer'),
            ],
            '/manufacturers/{manufacturer}/products/export' => [
                'parameters' => [
                    ['$ref' => '#/components/parameters/manufacturer'],
                    ['name' => 'search', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string']],
                ],
                'get' => $this->xlsxDownloadOperation('Manufacturers', 'Export manufacturer products', 'exportManufacturerProducts'),
            ],
        ];
    }

    protected function crudPaths(string $tag, string $schema, string $path, string $parameter, ?string $listOperationId = null): array
    {
        $createSchema = "{$schema}CreateRequest";
        $updateSchema = "{$schema}UpdateRequest";

        return [
            $path => [
                'get' => $this->listOperation($tag, "List {$tag}", $listOperationId ?? 'list'.str_replace(' ', '', $tag), $schema),
                'post' => $this->operation($tag, "Create {$schema}", 'create'.$schema, $createSchema, $schema, 201),
            ],
            "{$path}/{{$parameter}}" => [
                'parameters' => [['$ref' => "#/components/parameters/{$parameter}"]],
                'get' => $this->operation($tag, "Get {$schema}", 'get'.$schema, null, $schema, 200, true, true, false, true),
                'put' => $this->operation($tag, "Replace {$schema}", 'replace'.$schema, $updateSchema, $schema, 200, true, true, false, true),
                'patch' => $this->operation($tag, "Update {$schema}", 'update'.$schema, $updateSchema, $schema, 200, true, true, false, true),
                'delete' => $this->deleteOperation($tag, "Delete {$schema}", 'delete'.$schema),
            ],
        ];
    }

    protected function operation(
        string $tag,
        string $summary,
        string $operationId,
        ?string $requestSchema,
        ?string $responseSchema,
        int $successStatus = 200,
        bool $secured = true,
        bool $badRequest = true,
        bool $unauthorized = false,
        bool $notFound = false,
    ): array {
        $operation = [
            'tags' => [$tag],
            'summary' => $summary,
            'operationId' => $operationId,
            'responses' => [
                (string) $successStatus => [
                    'description' => 'Successful response',
                ],
            ],
        ];

        if ($secured) {
            $operation['security'] = [['bearerAuth' => []]];
            $unauthorized = true;
        }

        if ($requestSchema) {
            $operation['requestBody'] = [
                'required' => true,
                'content' => ['application/json' => ['schema' => ['$ref' => "#/components/schemas/{$requestSchema}"]]],
            ];
        }

        if ($responseSchema) {
            $operation['responses'][(string) $successStatus]['content'] = [
                'application/json' => ['schema' => ['$ref' => "#/components/schemas/{$responseSchema}"]],
            ];
        }

        if ($badRequest) {
            $operation['responses']['400'] = ['$ref' => '#/components/responses/BadRequest'];
        }

        if ($unauthorized) {
            $operation['responses']['401'] = ['$ref' => '#/components/responses/Unauthorized'];
        }

        if ($notFound) {
            $operation['responses']['404'] = ['$ref' => '#/components/responses/NotFound'];
        }

        return $operation;
    }

    protected function xlsxDownloadOperation(string $tag, string $summary, string $operationId): array
    {
        $operation = $this->operation($tag, $summary, $operationId, null, null);
        $operation['responses']['200'] = [
            'description' => 'XLSX file download',
            'content' => [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => [
                    'schema' => [
                        'type' => 'string',
                        'format' => 'binary',
                    ],
                ],
            ],
        ];

        return $operation;
    }

    protected function listOperation(string $tag, string $summary, string $operationId, string $schema): array
    {
        $operation = $this->operation($tag, $summary, $operationId, null, null);
        $operation['responses']['200']['content'] = [
            'application/json' => [
                'schema' => ['type' => 'array', 'items' => ['$ref' => "#/components/schemas/{$schema}"]],
            ],
        ];

        return $operation;
    }

    protected function deleteOperation(string $tag, string $summary, string $operationId): array
    {
        return [
            'tags' => [$tag],
            'summary' => $summary,
            'operationId' => $operationId,
            'security' => [['bearerAuth' => []]],
            'responses' => [
                '204' => ['$ref' => '#/components/responses/NoContent'],
                '401' => ['$ref' => '#/components/responses/Unauthorized'],
                '404' => ['$ref' => '#/components/responses/NotFound'],
            ],
        ];
    }

    protected function idParameter(string $name, string $description): array
    {
        return [
            'name' => $name,
            'in' => 'path',
            'required' => true,
            'description' => $description,
            'schema' => ['type' => 'integer', 'minimum' => 1],
            'example' => 1,
        ];
    }

    protected function bookingRequest(array $required): array
    {
        return $this->object([
            'asset_ids' => ['type' => 'array', 'items' => ['type' => 'integer'], 'example' => [1, 2]],
            'start_time' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-04-25T10:00:00+05:00'],
            'end_time' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true, 'example' => '2026-04-25T12:00:00+05:00'],
            'duration_hours' => ['type' => 'number', 'nullable' => true, 'example' => 2],
            'is_vip' => ['type' => 'boolean', 'example' => false],
            'status' => ['type' => 'string', 'enum' => ['submitted', 'debt_closed'], 'example' => 'submitted'],
            'debt_name' => ['type' => 'string', 'nullable' => true, 'example' => 'Alex Debt'],
            'debt_phone_number' => ['type' => 'string', 'nullable' => true, 'example' => '+998991234567'],
        ], $required);
    }

    protected function object(array $properties, array $required = []): array
    {
        $schema = [
            'type' => 'object',
            'properties' => $properties,
        ];

        if ($required !== []) {
            $schema['required'] = $required;
        }

        return $schema;
    }

    protected function errorResponse(string $description, string $schema = 'ErrorResponse'): array
    {
        return [
            'description' => $description,
            'content' => [
                'application/json' => [
                    'schema' => ['$ref' => "#/components/schemas/{$schema}"],
                ],
            ],
        ];
    }
}
