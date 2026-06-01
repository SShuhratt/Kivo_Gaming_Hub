<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public const OTP_PURPOSE_REGISTRATION = 'registration';
    public const OTP_PURPOSE_PASSWORD_RESET = 'password_reset';

    protected $fillable = [
        'name',
        'gmail',
        'phone_number',
        'password_hash',
        'email_verified_at',
        'otp_code',
        'otp_expiry',
        'otp_code_hash',
        'otp_expires_at',
        'otp_verified_at',
        'otp_purpose',
    ];

    protected $hidden = [
        'password_hash',
        'otp_code',
        'otp_code_hash',
    ];

    /**
     * Override for Laravel's Auth to use password_hash column
     */
    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'otp_expiry' => 'datetime',
            'otp_expires_at' => 'datetime',
            'otp_verified_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
    }

    public function hasVerifiedEmail(): bool
    {
        return $this->email_verified_at !== null;
    }
}
