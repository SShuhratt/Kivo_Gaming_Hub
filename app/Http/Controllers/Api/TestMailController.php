<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Services\MailDiagnosticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class TestMailController extends Controller
{
    use ValidatesApiRequests;

    public function __invoke(Request $request, MailDiagnosticsService $mailDiagnostics)
    {
        $validated = $this->validateApi($request, [
            'email' => 'required|email',
        ]);

        Log::info('Test mail sending started', $mailDiagnostics->safeContext([
            'email' => $validated['email'],
        ]));

        try {
            Mail::raw('Hello from Kivo Gaming Hub. This message was sent using the configured SMTP mailer.', function ($message) use ($validated) {
                $message->to($validated['email'])
                    ->subject('Kivo Gaming Hub SMTP test');
            });

            Log::info('Test mail sent successfully', $mailDiagnostics->safeContext([
                'email' => $validated['email'],
            ]));

            return response()->json([
                'message' => 'Test email sent successfully.',
                'mail_config' => $mailDiagnostics->safeConfig(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Test mail sending failed', $mailDiagnostics->safeContext([
                'email' => $validated['email'],
                'error' => $e->getMessage(),
            ]));

            return response()->json([
                'message' => 'Test email sending failed.',
                'error' => $e->getMessage(),
                'mail_config' => $mailDiagnostics->safeConfig(),
            ], 500);
        }
    }
}
