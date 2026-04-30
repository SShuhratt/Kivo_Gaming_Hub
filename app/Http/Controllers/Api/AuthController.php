<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Mail\WelcomeRegistrationMail;
use App\Models\User;
use App\Services\JwtService;
use App\Services\MailDiagnosticsService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AuthController extends Controller
{
    use ValidatesApiRequests;

    public function __construct(
        protected JwtService $jwt,
        protected MailDiagnosticsService $mailDiagnostics,
    ) {}

    public function register(Request $request)
    {
        Log::info('Registration attempt started', [
            'input' => $request->except(['password', 'password_confirmation']),
        ]);

        $request->merge([
            'name' => trim((string) $request->input('name')),
            'gmail' => $this->normalizeEmail($request->input('gmail')),
            'phone_number' => $this->normalizePhoneNumber($request->input('phone_number')),
        ]);

        try {
            $validated = $this->validateApi($request, [
                'name' => 'required|string',
                'gmail' => 'required|email|unique:users,gmail',
                'phone_number' => 'required|string|unique:users,phone_number',
                'password' => 'required|string|min:6',
            ]);
        } catch (\Throwable $e) {
            Log::warning('Registration validation failed', [
                'errors' => ($e instanceof \Illuminate\Http\Exceptions\HttpResponseException) ? $e->getResponse()->getContent() : $e->getMessage(),
            ]);
            throw $e;
        }

        $user = User::create([
            'name' => $validated['name'],
            'gmail' => $validated['gmail'],
            'phone_number' => $validated['phone_number'],
            'password_hash' => Hash::make($validated['password']),
        ]);

        Log::info('User created successfully', ['user_id' => $user->id]);

        $email = $user->gmail;

        Log::info('Registration email sending started', $this->mailDiagnostics->safeContext([
            'user_id' => $user->id,
            'email' => $email,
        ]));

        try {
            Mail::to($email)->send(new WelcomeRegistrationMail($user));

            Log::info('Registration email sent successfully', $this->mailDiagnostics->safeContext([
                'user_id' => $user->id,
                'email' => $email,
            ]));
        } catch (\Throwable $e) {
            Log::error('Registration email sending failed', $this->mailDiagnostics->safeContext([
                'user_id' => $user->id ?? null,
                'email' => $email ?? null,
                'error' => $e->getMessage(),
            ]));
        }

        return response()->json([
            'message' => 'User registered successfully',
            'user' => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $request->merge([
            'phone_number' => $this->normalizePhoneNumber($request->input('phone_number')),
        ]);

        $validated = $this->validateApi($request, [
            'phone_number' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('phone_number', $validated['phone_number'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password_hash)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        return response()->json([
            'token_type' => 'Bearer',
            'token' => $this->jwt->issue($user),
            'expires_in' => 86400,
            'user' => $user,
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $request->merge([
            'phone_number' => $this->normalizePhoneNumber($request->input('phone_number')),
        ]);

        $validated = $this->validateApi($request, ['phone_number' => 'required|string']);

        $user = User::where('phone_number', $validated['phone_number'])->firstOrFail();

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
        $request->merge([
            'phone_number' => $this->normalizePhoneNumber($request->input('phone_number')),
        ]);

        $validated = $this->validateApi($request, [
            'phone_number' => 'required|string',
            'otp' => 'required|string',
        ]);

        $user = User::where('phone_number', $validated['phone_number'])
            ->where('otp_code', $validated['otp'])
            ->where('otp_expiry', '>', Carbon::now())
            ->first();

        if (! $user) {
            return response()->json(['message' => 'Invalid or expired OTP'], 400);
        }

        return response()->json(['message' => 'OTP verified successfully']);
    }

    public function resetPassword(Request $request)
    {
        $request->merge([
            'phone_number' => $this->normalizePhoneNumber($request->input('phone_number')),
        ]);

        $validated = $this->validateApi($request, [
            'phone_number' => 'required|string',
            'otp' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        $user = User::where('phone_number', $validated['phone_number'])
            ->where('otp_code', $validated['otp'])
            ->where('otp_expiry', '>', Carbon::now())
            ->first();

        if (! $user) {
            return response()->json(['message' => 'Invalid or expired OTP'], 400);
        }

        $user->update([
            'password_hash' => Hash::make($validated['new_password']),
            'otp_code' => null,
            'otp_expiry' => null,
        ]);

        return response()->json(['message' => 'Password reset successfully']);
    }

    protected function normalizePhoneNumber(?string $phoneNumber): string
    {
        $digitsOnly = preg_replace('/\D+/', '', (string) $phoneNumber) ?? '';

        if ($digitsOnly === '') {
            return '';
        }

        return '+'.$digitsOnly;
    }

    protected function normalizeEmail(?string $email): string
    {
        return mb_strtolower(trim((string) $email));
    }
}
