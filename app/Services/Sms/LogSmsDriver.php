<?php

namespace App\Services\Sms;

use App\Contracts\SmsServiceInterface;
use Illuminate\Support\Facades\Log;

class LogSmsDriver implements SmsServiceInterface
{
    public function send(string $phoneNumber, string $message): void
    {
        Log::info("SMS Mock to {$phoneNumber}", [
            'driver' => 'log',
            'message' => $message,
        ]);
    }
}
