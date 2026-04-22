<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'phone' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::query()
            ->where('phone', $request->string('phone')->toString())
            ->first();

        if (! $user || ! Hash::check($request->string('password')->toString(), $user->password)) {
            return response()->json([
                'message' => 'Phone number or password is incorrect.',
            ], 401);
        }

        $plainTextToken = bin2hex(random_bytes(32));

        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
        ])->save();

        return response()->json([
            'message' => 'Login successful.',
            'token' => $plainTextToken,
            'token_type' => 'Bearer',
            'user' => $user,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        $user->forceFill([
            'api_token' => null,
        ])->save();

        return response()->json([
            'message' => 'Logout successful.',
        ]);
    }
}
