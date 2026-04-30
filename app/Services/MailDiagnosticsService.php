<?php

namespace App\Services;

class MailDiagnosticsService
{
    public function safeConfig(): array
    {
        $defaultMailer = (string) config('mail.default');
        $defaultMailerConfig = config("mail.mailers.{$defaultMailer}", []);
        $smtpConfig = config('mail.mailers.smtp', []);

        return [
            'mailer' => $defaultMailer,
            'host' => $defaultMailerConfig['host'] ?? $smtpConfig['host'] ?? null,
            'port' => $defaultMailerConfig['port'] ?? $smtpConfig['port'] ?? null,
            'encryption' => $defaultMailerConfig['scheme'] ?? $smtpConfig['scheme'] ?? null,
            'username_configured' => filled($defaultMailerConfig['username'] ?? $smtpConfig['username'] ?? null),
            'from_address' => config('mail.from.address'),
            'from_name' => config('mail.from.name'),
        ];
    }

    public function safeContext(array $context = []): array
    {
        return array_merge($this->safeConfig(), $context);
    }
}
