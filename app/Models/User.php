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

    protected $fillable = [
        'name',
        'gmail',
        'phone_number',
        'password_hash',
        'otp_code',
        'otp_expiry',
    ];

    protected $hidden = [
        'password_hash',
        'otp_code',
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
            'otp_expiry' => 'datetime',
        ];
    }
}
