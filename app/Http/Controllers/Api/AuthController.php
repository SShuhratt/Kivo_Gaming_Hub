<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AuthController extends Controller
{
    /**
     * @OA\Post(
     *     path="/api/v1/auth/register",
     *     summary="Register a new user",
     *     tags={"Auth"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name", "gmail", "phone_number", "password"},
     *             @OA\Property(property="name", type="string", example="John Doe"),
     *             @OA\Property(property="gmail", type="string", format="email", example="john@gmail.com"),
     *             @OA\Property(property="phone_number", type="string", example="+998901234567"),
     *             @OA\Property(property="password", type="string", format="password", example="secret123")
     *         )
     *     ),
     *     @OA\Response(response=201, description="User registered"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'gmail' => 'required|email|unique:users,gmail',
            'phone_number' => 'required|string|unique:users,phone_number',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name' => $request->name,
            'gmail' => $request->gmail,
            'phone_number' => $request->phone_number,
            'password_hash' => Hash::make($request->password),
        ]);

        return response()->json(['message' => 'User registered successfully'], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'phone_number' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('phone_number', $request->phone_number)->first();

        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        // Simplification: In a real app, use Sanctum/Passport for JWT
        $token = 'mock-jwt-token-' . $user->id; 

        return response()->json([
            'token' => $token,
            'user' => $user
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate(['phone_number' => 'required|string']);
        
        $user = User::where('phone_number', $request->phone_number)->firstOrFail();
        
        $otp = (string) rand(100000, 999999);
        $user->update([
            'otp_code' => $otp,
            'otp_expiry' => Carbon::now()->addMinutes(10),
        ]);

        Log::info("SMS MOCK to {$user->phone_number}: Your OTP is {$otp}");

        return response()->json(['message' => 'OTP sent successfully (check logs)']);
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'phone_number' => 'required|string',
            'otp' => 'required|string',
        ]);

        $user = User::where('phone_number', $request->phone_number)
            ->where('otp_code', $request->otp)
            ->where('otp_expiry', '>', Carbon::now())
            ->first();

        if (!$user) {
            return response()->json(['message' => 'Invalid or expired OTP'], 400);
        }

        return response()->json(['message' => 'OTP verified successfully']);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'phone_number' => 'required|string',
            'otp' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        $user = User::where('phone_number', $request->phone_number)
            ->where('otp_code', $request->otp)
            ->where('otp_expiry', '>', Carbon::now())
            ->first();

        if (!$user) {
            return response()->json(['message' => 'Invalid or expired OTP'], 400);
        }

        $user->update([
            'password_hash' => Hash::make($request->new_password),
            'otp_code' => null,
            'otp_expiry' => null,
        ]);

        return response()->json(['message' => 'Password reset successfully']);
    }
}
