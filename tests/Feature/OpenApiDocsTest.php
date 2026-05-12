<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class OpenApiDocsTest extends TestCase
{
    public function test_api_docs_page_loads_the_canonical_openapi_spec(): void
    {
        $this->get('/api-docs')
            ->assertOk()
            ->assertSee('openapi.json')
            ->assertSee('"\/docs\/openapi.json"', false)
            ->assertDontSee('http://')
            ->assertSee('tryItOutEnabled: true');

        $this->get('/docs/openapi.json')
            ->assertOk()
            ->assertJsonPath('info.title', 'Khivo Gaming Hub API')
            ->assertJsonPath('servers.0.url', '/api');
    }

    public function test_openapi_spec_documents_all_api_routes_with_editable_inputs(): void
    {
        $spec = $this->getJson('/docs/openapi.json')->json();

        $expectedOperations = [
            ['post', '/auth/register'],
            ['post', '/auth/login'],
            ['post', '/auth/forgot-password'],
            ['post', '/auth/verify-otp'],
            ['post', '/auth/reset-password'],
            ['get', '/dashboard/bootstrap'],
            ['post', '/bookings/calculate'],
            ['post', '/bookings'],
            ['get', '/sessions'],
            ['get', '/sessions/{booking}'],
            ['post', '/sessions/{booking}/end'],
            ['delete', '/sessions/{booking}'],
            ['get', '/trades'],
            ['get', '/finance/service-summary'],
            ['get', '/finance/service-details'],
            ['get', '/trades/export'],
            ['post', '/checkout-sales'],
            ['get', '/rooms'],
            ['post', '/rooms'],
            ['get', '/rooms/{room}'],
            ['put', '/rooms/{room}'],
            ['patch', '/rooms/{room}'],
            ['delete', '/rooms/{room}'],
            ['get', '/assets'],
            ['post', '/assets'],
            ['get', '/assets/{asset}'],
            ['put', '/assets/{asset}'],
            ['patch', '/assets/{asset}'],
            ['delete', '/assets/{asset}'],
            ['get', '/warehouse'],
            ['post', '/warehouse'],
            ['get', '/warehouse/{warehouse}'],
            ['put', '/warehouse/{warehouse}'],
            ['patch', '/warehouse/{warehouse}'],
            ['delete', '/warehouse/{warehouse}'],
            ['delete', '/manufacturers/{manufacturer}'],
            ['get', '/manufacturers/{manufacturer}/products/export'],
            ['get', '/services'],
            ['post', '/services'],
            ['get', '/services/{service}'],
            ['put', '/services/{service}'],
            ['patch', '/services/{service}'],
            ['delete', '/services/{service}'],
        ];

        foreach ($expectedOperations as [$method, $path]) {
            $this->assertArrayHasKey($path, $spec['paths'], "Missing OpenAPI path {$path}");
            $this->assertArrayHasKey($method, $spec['paths'][$path], "Missing OpenAPI operation {$method} {$path}");
        }

        foreach ([
            ['post', '/assets'],
            ['put', '/assets/{asset}'],
            ['patch', '/assets/{asset}'],
            ['post', '/rooms'],
            ['put', '/rooms/{room}'],
            ['patch', '/rooms/{room}'],
            ['post', '/warehouse'],
            ['put', '/warehouse/{warehouse}'],
            ['patch', '/warehouse/{warehouse}'],
            ['post', '/checkout-sales'],
            ['post', '/services'],
            ['put', '/services/{service}'],
            ['patch', '/services/{service}'],
        ] as [$method, $path]) {
            $this->assertArrayHasKey(
                'requestBody',
                $spec['paths'][$path][$method],
                "Missing editable request body for {$method} {$path}",
            );
        }

        $this->assertNotEmpty($spec['paths']['/trades']['get']['parameters'] ?? []);
        $this->assertSame([['bearerAuth' => []]], $spec['paths']['/assets']['get']['security']);
        $this->assertArrayNotHasKey('security', $spec['paths']['/auth/login']['post']);
    }

    public function test_api_routes_have_openapi_operation_decorators(): void
    {
        $operationIds = [];

        foreach (Route::getRoutes() as $route) {
            if (! str_starts_with($route->uri(), 'api/')) {
                continue;
            }

            $operationId = $route->defaults['openapiOperation'] ?? null;

            $this->assertNotNull($operationId, "Route {$route->uri()} is missing an OpenAPI operation decorator.");

            $operationIds[] = $operationId;
        }

        $this->assertContains('createBooking', $operationIds);
        $this->assertContains('loginUser', $operationIds);
    }
}
