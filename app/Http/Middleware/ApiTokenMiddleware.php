<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\JwtService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiTokenMiddleware
{
    public function __construct(protected JwtService $jwt)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (! $token) {
            return $this->unauthorizedResponse('JWT bearer token is missing.');
        }

        $payload = $this->jwt->decode($token);
        $user = $payload ? User::find($payload['sub'] ?? null) : null;

        if (! $user) {
            return $this->unauthorizedResponse('JWT bearer token is invalid or expired.');
        }

        $request->setUserResolver(fn (): User => $user);

        return $next($request);
    }

    protected function unauthorizedResponse(string $message): JsonResponse
    {
        return response()->json([
            'message' => $message,
        ], 401);
    }
}
