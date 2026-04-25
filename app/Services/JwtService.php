<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Carbon;

class JwtService
{
    public function issue(User $user, int $ttlSeconds = 86400): string
    {
        $now = Carbon::now()->timestamp;

        return $this->encode([
            'iss' => config('app.url'),
            'sub' => $user->id,
            'iat' => $now,
            'exp' => $now + $ttlSeconds,
        ]);
    }

    public function decode(string $token): ?array
    {
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return null;
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
        $header = json_decode($this->base64UrlDecode($encodedHeader), true);
        $payload = json_decode($this->base64UrlDecode($encodedPayload), true);

        if (($header['alg'] ?? null) !== 'HS256' || ! is_array($payload)) {
            return null;
        }

        $expectedSignature = $this->base64UrlEncode(
            hash_hmac('sha256', "{$encodedHeader}.{$encodedPayload}", $this->secret(), true)
        );

        if (! hash_equals($expectedSignature, $encodedSignature)) {
            return null;
        }

        if (($payload['exp'] ?? 0) < Carbon::now()->timestamp) {
            return null;
        }

        return $payload;
    }

    protected function encode(array $payload): string
    {
        $encodedHeader = $this->base64UrlEncode(json_encode([
            'typ' => 'JWT',
            'alg' => 'HS256',
        ], JSON_THROW_ON_ERROR));
        $encodedPayload = $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR));
        $encodedSignature = $this->base64UrlEncode(
            hash_hmac('sha256', "{$encodedHeader}.{$encodedPayload}", $this->secret(), true)
        );

        return "{$encodedHeader}.{$encodedPayload}.{$encodedSignature}";
    }

    protected function secret(): string
    {
        $key = (string) config('app.key');

        if (str_starts_with($key, 'base64:')) {
            $decoded = base64_decode(substr($key, 7), true);

            if ($decoded !== false) {
                return $decoded;
            }
        }

        return $key !== '' ? $key : 'khivo-gaming-hub-testing-key';
    }

    protected function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    protected function base64UrlDecode(string $value): string
    {
        $padding = strlen($value) % 4;

        if ($padding > 0) {
            $value .= str_repeat('=', 4 - $padding);
        }

        return base64_decode(strtr($value, '-_', '+/')) ?: '';
    }
}
