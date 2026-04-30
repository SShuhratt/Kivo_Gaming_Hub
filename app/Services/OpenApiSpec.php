<?php

namespace App\Services;

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
                ['name' => 'Assets'],
                ['name' => 'Warehouse'],
                ['name' => 'Manufacturers'],
                ['name' => 'Services'],
                ['name' => 'Tariffs'],
            ],
            'components' => $this->components(),
            'paths' => array_merge(
                $this->authPaths(),
                $this->dashboardPaths(),
                $this->bookingPaths(),
                $this->sessionPaths(),
                $this->tradePaths(),
                $this->crudPaths('Assets', 'Asset', '/assets', 'asset'),
                $this->crudPaths('Warehouse', 'WarehouseItem', '/warehouse', 'warehouse', 'listWarehouseItems'),
                $this->manufacturerPaths(),
                $this->crudPaths('Services', 'Service', '/services', 'service'),
                $this->crudPaths('Tariffs', 'Tariff', '/tariffs', 'tariff'),
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
                'service' => $this->idParameter('service', 'Service ID'),
                'tariff' => $this->idParameter('tariff', 'Tariff ID'),
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
                'BookingCalculateRequest' => $this->bookingRequest(['tariff_id', 'asset_ids', 'start_time', 'end_time']),
                'BookingCreateRequest' => $this->bookingRequest(['tariff_id', 'asset_ids', 'start_time', 'end_time', 'status']),
                'BookingCalculationResponse' => $this->object([
                    'duration_minutes' => ['type' => 'integer', 'example' => 120],
                    'total_cost' => ['type' => 'number', 'example' => 240000],
                ]),
                'DashboardBootstrapResponse' => $this->object([
                    'user' => ['$ref' => '#/components/schemas/User'],
                    'summary' => $this->object([
                        'active_sessions' => ['type' => 'integer', 'example' => 2],
                        'total_session_devices' => ['type' => 'integer', 'example' => 9],
                        'pending_sessions' => ['type' => 'integer', 'example' => 1],
                        'rooms_count' => ['type' => 'integer', 'example' => 4],
                        'sales_total_today' => ['type' => 'number', 'example' => 365000],
                    ]),
                    'services' => ['type' => 'array', 'items' => ['type' => 'object']],
                    'tariffs' => ['type' => 'array', 'items' => ['type' => 'object']],
                    'sales' => ['type' => 'array', 'items' => ['type' => 'object']],
                    'sessions' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/Session']],
                    'companies' => ['type' => 'array', 'items' => ['type' => 'object']],
                    'sections' => ['type' => 'array', 'items' => $this->object([
                        'key' => ['type' => 'string'],
                        'name' => ['type' => 'string'],
                        'path' => ['type' => 'string'],
                    ])],
                ]),
                'Booking' => $this->object([
                    'id' => ['type' => 'integer', 'example' => 1],
                    'tariff_id' => ['type' => 'integer', 'example' => 1],
                    'start_time' => ['type' => 'string', 'format' => 'date-time'],
                    'end_time' => ['type' => 'string', 'format' => 'date-time'],
                    'ended_at' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                    'duration_minutes' => ['type' => 'integer', 'example' => 120],
                    'total_cost' => ['type' => 'number', 'example' => 240000],
                    'status' => ['type' => 'string', 'enum' => ['submitted', 'debt_closed'], 'example' => 'submitted'],
                    'session_status' => ['type' => 'string', 'enum' => ['active', 'completed', 'cancelled'], 'example' => 'active'],
                    'debt_name' => ['type' => 'string', 'nullable' => true],
                    'debt_phone_number' => ['type' => 'string', 'nullable' => true],
                    'assets' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/Asset']],
                    'tariff' => ['$ref' => '#/components/schemas/Tariff'],
                ]),
                'Session' => $this->object([
                    'id' => ['type' => 'integer', 'example' => 1],
                    'status' => ['type' => 'string', 'enum' => ['submitted', 'debt_closed'], 'example' => 'submitted'],
                    'session_status' => ['type' => 'string', 'enum' => ['active', 'completed', 'cancelled'], 'example' => 'active'],
                    'start_time' => ['type' => 'string', 'format' => 'date-time'],
                    'end_time' => ['type' => 'string', 'format' => 'date-time'],
                    'ended_at' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                    'duration_minutes' => ['type' => 'integer', 'example' => 120],
                    'total_cost' => ['type' => 'number', 'example' => 240000],
                    'debt_name' => ['type' => 'string', 'nullable' => true],
                    'debt_phone_number' => ['type' => 'string', 'nullable' => true],
                    'tariff' => ['type' => 'object'],
                    'assets' => ['type' => 'array', 'items' => ['type' => 'object']],
                    'assets_count' => ['type' => 'integer', 'example' => 2],
                    'room_label' => ['type' => 'string', 'example' => 'Xona 1'],
                    'trade_exists' => ['type' => 'boolean', 'example' => false],
                    'can_delete' => ['type' => 'boolean', 'example' => false],
                ]),
                'TradeLedgerEntry' => $this->object([
                    'id' => ['type' => 'integer', 'example' => 1],
                    'booking_id' => ['type' => 'integer', 'nullable' => true, 'example' => 1],
                    'type' => ['type' => 'string', 'enum' => ['Income', 'Debt'], 'example' => 'Income'],
                    'amount' => ['type' => 'number', 'example' => 240000],
                    'status' => ['type' => 'string', 'enum' => ['submitted', 'debt_closed'], 'example' => 'submitted'],
                    'session_status' => ['type' => 'string', 'enum' => ['completed', 'cancelled'], 'example' => 'completed'],
                    'details' => ['type' => 'object'],
                    'tariff_data' => ['$ref' => '#/components/schemas/Tariff'],
                    'assets' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/Asset']],
                ]),
                'AssetCreateRequest' => $this->object([
                    'category' => ['type' => 'string', 'enum' => ['Computer', 'PS'], 'example' => 'Computer'],
                    'room_id' => ['type' => 'integer', 'example' => 101],
                    'total_usage_duration_minutes' => ['type' => 'integer', 'example' => 0],
                    'total_earned_money' => ['type' => 'number', 'example' => 0],
                ], ['category', 'room_id']),
                'AssetUpdateRequest' => $this->object([
                    'category' => ['type' => 'string', 'enum' => ['Computer', 'PS'], 'example' => 'PS'],
                    'room_id' => ['type' => 'integer', 'example' => 102],
                    'total_usage_duration_minutes' => ['type' => 'integer', 'example' => 120],
                    'total_earned_money' => ['type' => 'number', 'example' => 120000],
                ]),
                'Asset' => $this->object([
                    'id' => ['type' => 'integer', 'example' => 1],
                    'category' => ['type' => 'string', 'enum' => ['Computer', 'PS'], 'example' => 'Computer'],
                    'room_id' => ['type' => 'integer', 'example' => 101],
                    'total_usage_duration_minutes' => ['type' => 'integer', 'example' => 0],
                    'total_earned_money' => ['type' => 'number', 'example' => 0],
                ]),
                'WarehouseItemCreateRequest' => $this->object([
                    'manufacturer' => ['type' => 'string', 'example' => 'Asus'],
                    'product_name' => ['type' => 'string', 'example' => 'Gaming Mouse'],
                    'shtrix_code' => ['type' => 'string', 'example' => 'WH-10001'],
                    'unit' => ['type' => 'string', 'enum' => ['bottle', 'box', 'container', 'bag'], 'example' => 'box'],
                    'count' => ['type' => 'integer', 'example' => 10],
                    'purchase_price' => ['type' => 'number', 'example' => 20],
                    'sell_price' => ['type' => 'number', 'example' => 35],
                ], ['manufacturer', 'product_name', 'shtrix_code', 'unit', 'count', 'purchase_price', 'sell_price']),
                'WarehouseItemUpdateRequest' => $this->object([
                    'manufacturer' => ['type' => 'string', 'example' => 'Asus'],
                    'product_name' => ['type' => 'string', 'example' => 'Gaming Mouse Pro'],
                    'shtrix_code' => ['type' => 'string', 'example' => 'WH-10001'],
                    'unit' => ['type' => 'string', 'enum' => ['bottle', 'box', 'container', 'bag'], 'example' => 'box'],
                    'count' => ['type' => 'integer', 'example' => 12],
                    'purchase_price' => ['type' => 'number', 'example' => 20],
                    'sell_price' => ['type' => 'number', 'example' => 40],
                ]),
                'WarehouseItem' => $this->object([
                    'id' => ['type' => 'integer', 'example' => 1],
                    'manufacturer' => ['type' => 'string', 'example' => 'Asus'],
                    'product_name' => ['type' => 'string', 'example' => 'Gaming Mouse'],
                    'shtrix_code' => ['type' => 'string', 'example' => 'WH-10001'],
                    'unit' => ['type' => 'string', 'enum' => ['bottle', 'box', 'container', 'bag'], 'example' => 'box'],
                    'count' => ['type' => 'integer', 'example' => 10],
                    'purchase_price' => ['type' => 'number', 'example' => 20],
                    'sell_price' => ['type' => 'number', 'example' => 35],
                    'profit_percentage' => ['type' => 'number', 'readOnly' => true, 'example' => 75],
                ]),
                'ServiceCreateRequest' => $this->object([
                    'game_name' => ['type' => 'string', 'example' => 'Counter-Strike 2'],
                    'room_id' => ['type' => 'integer', 'example' => 101],
                ], ['game_name', 'room_id']),
                'ServiceUpdateRequest' => $this->object([
                    'game_name' => ['type' => 'string', 'example' => 'Valorant'],
                    'room_id' => ['type' => 'integer', 'example' => 102],
                ]),
                'Service' => $this->object([
                    'id' => ['type' => 'integer', 'example' => 1],
                    'game_name' => ['type' => 'string', 'example' => 'Counter-Strike 2'],
                    'room_id' => ['type' => 'integer', 'example' => 101],
                ]),
                'TariffCreateRequest' => $this->object([
                    'name' => ['type' => 'string', 'example' => 'Standard Hour'],
                    'hourly_cost' => ['type' => 'number', 'example' => 60000],
                ], ['name', 'hourly_cost']),
                'TariffUpdateRequest' => $this->object([
                    'name' => ['type' => 'string', 'example' => 'VIP Hour'],
                    'hourly_cost' => ['type' => 'number', 'example' => 90000],
                ]),
                'Tariff' => $this->object([
                    'id' => ['type' => 'integer', 'example' => 1],
                    'name' => ['type' => 'string', 'example' => 'Standard Hour'],
                    'hourly_cost' => ['type' => 'number', 'example' => 60000],
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
            ['name' => 'type', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'enum' => ['Income', 'Debt']]],
        ];
        $operation['responses']['200'] = [
            'description' => 'Ledger entries',
            'content' => [
                'application/json' => [
                    'schema' => ['type' => 'array', 'items' => ['$ref' => '#/components/schemas/TradeLedgerEntry']],
                ],
            ],
        ];

        return ['/trades' => ['get' => $operation]];
    }

    protected function manufacturerPaths(): array
    {
        return [
            '/manufacturers/{manufacturer}' => [
                'parameters' => [['$ref' => '#/components/parameters/manufacturer']],
                'delete' => $this->deleteOperation('Manufacturers', 'Delete Manufacturer', 'deleteManufacturer'),
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
            'tariff_id' => ['type' => 'integer', 'example' => 1],
            'asset_ids' => ['type' => 'array', 'items' => ['type' => 'integer'], 'example' => [1, 2]],
            'start_time' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-04-25T10:00:00+05:00'],
            'end_time' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-04-25T12:00:00+05:00'],
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
