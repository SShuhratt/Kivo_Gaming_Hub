<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('mail:test {email}', function (string $email) {
    /** @var \App\Services\MailDiagnosticsService $mailDiagnostics */
    $mailDiagnostics = app(\App\Services\MailDiagnosticsService::class);

    $this->info('Mail diagnostics: '.json_encode($mailDiagnostics->safeConfig(), JSON_UNESCAPED_SLASHES));

    try {
        Mail::raw('Gmail SMTP test successful.', function ($message) use ($email) {
            $message->to($email)
                ->subject('Kivo Gaming Hub test');
        });

        $this->info("Test email sent successfully to {$email}.");

        Log::info('Mail test command sent successfully', $mailDiagnostics->safeContext([
            'email' => $email,
        ]));

        return self::SUCCESS;
    } catch (\Throwable $e) {
        Log::error('Mail test command failed', $mailDiagnostics->safeContext([
            'email' => $email,
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]));

        $this->error($e->getMessage());

        return self::FAILURE;
    }
})->purpose('Send a Gmail SMTP test email using the current Laravel mail configuration');
