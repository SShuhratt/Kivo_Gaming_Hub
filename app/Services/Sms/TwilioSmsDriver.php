<?php

namespace App\Services\Sms;

use App\Contracts\SmsServiceInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TwilioSmsDriver implements SmsServiceInterface
{
    public function send(string $phoneNumber, string $message): void
    {
        $sid = config('services.twilio.sid');
        $token = config('services.twilio.token');
        $from = config('services.twilio.from');

        if (!$sid || !$token || !$from) {
            Log::error('Twilio SMS Failed: Missing configuration.');
            return;
        }

        $url = "https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json";

        $response = Http::asForm()->withBasicAuth($sid, $token)->post($url, [
            'To' => $phoneNumber,
            'From' => $from,
            'Body' => $message,
        ]);

        if ($response->failed()) {
            Log::error('Twilio SMS Failed', [
                'response' => $response->json(),
            ]);
        }
    }
}
