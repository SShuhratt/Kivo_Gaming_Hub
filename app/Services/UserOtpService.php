<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserOtpService
{
    public const OTP_LENGTH = 6;
    public const OTP_EXPIRY_MINUTES = 10;

    public function generateOtp(): string
    {
        return str_pad((string) random_int(0, 999999), self::OTP_LENGTH, '0', STR_PAD_LEFT);
    }

    public function issueOtp(User $user, string $purpose, ?string $otp = null): string
    {
        $otp ??= $this->generateOtp();
        $expiresAt = now()->addMinutes(self::OTP_EXPIRY_MINUTES);

        $user->forceFill([
            'otp_code' => null,
            'otp_expiry' => $expiresAt,
            'otp_code_hash' => Hash::make($otp),
            'otp_expires_at' => $expiresAt,
            'otp_verified_at' => null,
            'otp_purpose' => $purpose,
        ])->save();

        return $otp;
    }

    public function otpIsExpired(User $user, string $purpose): bool
    {
        if ($user->otp_purpose !== $purpose) {
            return false;
        }

        return $user->otp_expires_at === null || $user->otp_expires_at->isPast();
    }

    public function otpMatches(User $user, string $otp, string $purpose): bool
    {
        if (
            $user->otp_purpose !== $purpose
            || blank($user->otp_code_hash)
            || $user->otp_expires_at === null
            || $user->otp_expires_at->isPast()
        ) {
            return false;
        }

        return Hash::check($otp, $user->otp_code_hash);
    }

    public function markOtpVerified(User $user): void
    {
        $user->forceFill([
            'otp_verified_at' => now(),
        ])->save();
    }

    public function consumeOtp(User $user): void
    {
        $user->forceFill([
            'otp_code' => null,
            'otp_expiry' => null,
            'otp_code_hash' => null,
            'otp_expires_at' => null,
            'otp_purpose' => null,
            'otp_verified_at' => now(),
        ])->save();
    }
}
