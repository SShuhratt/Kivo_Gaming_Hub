<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiTokenMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (! $token) {
            return $this->unauthorizedResponse('API token is missing.');
        }

        $user = User::query()
            ->where('api_token', hash('sha256', $token))
            ->first();

        if (! $user) {
            return $this->unauthorizedResponse('API token is invalid.');
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
