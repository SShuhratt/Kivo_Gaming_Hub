<?php

declare(strict_types=1);

namespace App\Mail\Transport;

use Google\Client as GoogleClient;
use Google\Service\Gmail;
use Google\Service\Gmail\Message as GmailMessage;
use Symfony\Component\Mailer\Envelope;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\MessageConverter;
use Symfony\Component\Mime\RawMessage;

/**
 * GmailApiTransport
 *
 * Sends email through the Gmail REST API (HTTPS) instead of SMTP,
 * which is required on platforms like Render's free tier that block
 * outbound SMTP ports 25, 465, and 587.
 *
 * The driver is registered under the 'gmail_api' transport key via
 * AppServiceProvider::boot() and resolves its credentials from the
 * 'services.gmail' config stanza.
 */
final class GmailApiTransport extends AbstractTransport
{
    public function __construct(
        /**
         * Pre-configured Google_Client with a valid, refreshed access token
         * injected by AppServiceProvider at boot time.
         */
        private readonly GoogleClient $googleClient,
    ) {
        parent::__construct();
    }

    /**
     * Perform the actual send over the Gmail API.
     *
     * The Gmail API's users.messages.send endpoint requires the raw RFC-2822
     * MIME message to be encoded as Base64URL (RFC 4648 §5):
     *   - Standard Base64 uses '+' and '/'; Base64URL replaces them with '-' and '_'
     *   - Standard Base64 pads with '='; Gmail's API requires '=' padding stripped
     * These two mutations are applied after base64_encode() below.
     */
    protected function doSend(SentMessage $message): void
    {
        // Convert Symfony Email object → raw RFC-2822 MIME string
        $email   = MessageConverter::toEmail($message->getOriginalMessage());
        $rawMime = $email->toString();

        /*
         * Step 1 – base64_encode() produces standard Base64 (uses '+', '/', '=').
         * Step 2 – str_replace('+', '-', ...) satisfies the Base64URL '+' → '-' rule.
         * Step 3 – str_replace('/', '_', ...) satisfies the Base64URL '/' → '_' rule.
         * Step 4 – rtrim(..., '=')             strips the '=' padding Gmail rejects.
         */
        $base64UrlEncoded = rtrim(
            strtr(base64_encode($rawMime), '+/', '-_'),
            '='
        );

        // Build the Gmail API payload object
        $gmailMessage = new GmailMessage();
        $gmailMessage->setRaw($base64UrlEncoded);

        // Instantiate the Gmail service with the already-authorised client
        $gmailService = new Gmail($this->googleClient);

        // 'me' is a Gmail API alias that resolves to the authenticated account
        $gmailService->users_messages->send('me', $gmailMessage);
    }

    /**
     * Returns the DSN string used by Symfony's mailer infrastructure to
     * identify this transport in debug output and log entries.
     */
    public function __toString(): string
    {
        return 'gmail+api://me';
    }
}
