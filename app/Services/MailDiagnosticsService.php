<?php

namespace App\Services;

class MailDiagnosticsService
{
    public function safeConfig(): array
    {
        $defaultMailer = (string) config('mail.default');
        $defaultMailerConfig = config("mail.mailers.{$defaultMailer}", []);
        $smtpConfig = config('mail.mailers.smtp', []);
        $username = $defaultMailerConfig['username'] ?? $smtpConfig['username'] ?? null;
        $fromAddress = config('mail.from.address');
        $scheme = $defaultMailerConfig['scheme'] ?? $smtpConfig['scheme'] ?? null;
        $requireTls = (bool) ($defaultMailerConfig['require_tls'] ?? $smtpConfig['require_tls'] ?? false);
        $encryption = match (true) {
            $requireTls => 'tls',
            $scheme === 'smtps' => 'ssl',
            default => null,
        };

        return [
            'mailer' => $defaultMailer,
            'host' => $defaultMailerConfig['host'] ?? $smtpConfig['host'] ?? null,
            'port' => $defaultMailerConfig['port'] ?? $smtpConfig['port'] ?? null,
            'encryption' => $encryption,
            'scheme' => $scheme,
            'require_tls' => $requireTls,
            'username_configured' => filled($username),
            'from_address' => $fromAddress,
            'from_name' => config('mail.from.name'),
            'from_matches_username' => filled($username) && filled($fromAddress)
                ? mb_strtolower((string) $username) === mb_strtolower((string) $fromAddress)
                : null,
        ];
    }

    public function safeContext(array $context = []): array
    {
        return array_merge($this->safeConfig(), $context);
    }
}
