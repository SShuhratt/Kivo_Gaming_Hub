<?php

namespace Tests\Feature;

use App\Mail\PasswordResetOtpMail;
use App\Mail\RegistrationOtpMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AuthRegistrationMailTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_sends_otp_and_user_stays_unverified_until_the_code_is_confirmed(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/register', [
            'name' => 'User3',
            'email' => 'user3@gmail.com',
            'phone_number' => '+998777777777',
            'password' => 'User$H123',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('message', 'Tasdiqlash kodi emailingizga yuborildi')
            ->assertJsonPath('email', 'user3@gmail.com')
            ->assertJsonPath('requires_verification', true);

        $user = User::where('gmail', 'user3@gmail.com')->firstOrFail();

        $this->assertNull($user->email_verified_at);
        $this->assertSame(User::OTP_PURPOSE_REGISTRATION, $user->otp_purpose);
        $this->assertNotNull($user->otp_code_hash);
        $this->assertNull($user->otp_code);

        $otp = $this->latestOtpFromSentMail(RegistrationOtpMail::class, 'user3@gmail.com');

        $this->postJson('/api/auth/login', [
            'phone_number' => '+998777777777',
            'password' => 'User$H123',
        ])->assertStatus(403);

        $this->postJson('/api/auth/verify-registration-otp', [
            'email' => 'user3@gmail.com',
            'otp' => '111111',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Invalid OTP.');

        $this->postJson('/api/auth/verify-registration-otp', [
            'email' => 'user3@gmail.com',
            'otp' => $otp,
        ])->assertOk()
            ->assertJsonPath('message', 'Registration OTP verified successfully.');

        $user->refresh();

        $this->assertNotNull($user->email_verified_at);
        $this->assertNull($user->otp_code_hash);
        $this->assertNull($user->otp_purpose);

        $this->postJson('/api/auth/login', [
            'phone_number' => '+998777777777',
            'password' => 'User$H123',
        ])->assertOk();

        $this->postJson('/api/auth/verify-registration-otp', [
            'email' => 'user3@gmail.com',
            'otp' => $otp,
        ])->assertStatus(422);
    }

    public function test_resending_registration_otp_replaces_the_previous_code(): void
    {
        Mail::fake();

        $this->postJson('/api/auth/register', [
            'name' => 'User4',
            'email' => 'user4@gmail.com',
            'phone_number' => '+998777777778',
            'password' => 'User$H123',
        ])->assertCreated();

        $firstOtp = $this->latestOtpFromSentMail(RegistrationOtpMail::class, 'user4@gmail.com');

        $this->postJson('/api/auth/resend-registration-otp', [
            'email' => 'user4@gmail.com',
        ])->assertOk()
            ->assertJsonPath('message', 'Tasdiqlash kodi emailingizga yuborildi');

        $secondOtp = $this->latestOtpFromSentMail(RegistrationOtpMail::class, 'user4@gmail.com');

        $this->assertNotSame($firstOtp, $secondOtp);

        $this->postJson('/api/auth/verify-registration-otp', [
            'email' => 'user4@gmail.com',
            'otp' => $firstOtp,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Invalid OTP.');

        $this->postJson('/api/auth/verify-registration-otp', [
            'email' => 'user4@gmail.com',
            'otp' => $secondOtp,
        ])->assertOk();
    }

    public function test_registration_is_blocked_if_the_otp_email_cannot_be_sent(): void
    {
        Mail::shouldReceive('to')
            ->once()
            ->andThrow(new \RuntimeException('SMTP failed'));

        $this->postJson('/api/auth/register', [
            'name' => 'User5',
            'email' => 'user5@gmail.com',
            'phone_number' => '+998777777779',
            'password' => 'User$H123',
        ])->assertStatus(503)
            ->assertJsonPath('message', 'Tasdiqlash emailini yuborib bo\'lmadi. SMTP sozlamalarini tekshirib, qayta urining.');

        $this->assertDatabaseHas('users', [
            'gmail' => 'user5@gmail.com',
        ]);
    }

    public function test_registering_again_with_existing_unverified_email_reissues_otp_instead_of_failing(): void
    {
        Mail::fake();

        $user = User::create([
            'name' => 'Existing Pending',
            'gmail' => 'pending.user@gmail.com',
            'phone_number' => '+998777777780',
            'password_hash' => Hash::make('OldPass123!'),
            'email_verified_at' => null,
        ]);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Updated Pending',
            'email' => 'pending.user@gmail.com',
            'phone_number' => '+998777777780',
            'password' => 'NewPass123!',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Tasdiqlash kodi emailingizga yuborildi')
            ->assertJsonPath('email', 'pending.user@gmail.com');

        $user->refresh();

        $this->assertSame('Updated Pending', $user->name);
        $this->assertTrue(Hash::check('NewPass123!', $user->password_hash));
        $this->assertNotNull($user->otp_code_hash);

        Mail::assertSent(RegistrationOtpMail::class, fn (RegistrationOtpMail $mail) => $mail->hasTo('pending.user@gmail.com'));
    }

    public function test_password_reset_uses_email_otp_and_updates_the_password(): void
    {
        Mail::fake();

        $user = User::create([
            'name' => 'Reset User',
            'gmail' => 'reset.user@gmail.com',
            'phone_number' => '+998901234500',
            'password_hash' => Hash::make('OldPassword1!'),
            'email_verified_at' => now(),
        ]);

        $this->postJson('/api/auth/forgot-password/send-otp', [
            'email' => $user->gmail,
        ])->assertOk()
            ->assertJsonPath('message', 'Password reset OTP sent to your email.');

        $otp = $this->latestOtpFromSentMail(PasswordResetOtpMail::class, $user->gmail);

        $this->postJson('/api/auth/forgot-password/verify-otp', [
            'email' => $user->gmail,
            'otp' => '654321',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Invalid OTP.');

        $this->postJson('/api/auth/forgot-password/verify-otp', [
            'email' => $user->gmail,
            'otp' => $otp,
        ])->assertOk()
            ->assertJsonPath('message', 'Password reset OTP verified successfully.');

        $this->postJson('/api/auth/forgot-password/reset', [
            'email' => $user->gmail,
            'otp' => $otp,
            'password' => 'NewPassword1!',
            'password_confirmation' => 'NewPassword1!',
        ])->assertOk()
            ->assertJsonPath('message', 'Password reset successfully.');

        $user->refresh();

        $this->assertTrue(Hash::check('NewPassword1!', $user->password_hash));
        $this->assertNull($user->otp_code_hash);
        $this->assertNull($user->otp_purpose);

        $this->postJson('/api/auth/login', [
            'phone_number' => $user->phone_number,
            'password' => 'OldPassword1!',
        ])->assertStatus(401);

        $this->postJson('/api/auth/login', [
            'phone_number' => $user->phone_number,
            'password' => 'NewPassword1!',
        ])->assertOk();

        $this->postJson('/api/auth/forgot-password/reset', [
            'email' => $user->gmail,
            'otp' => $otp,
            'password' => 'AnotherPass1!',
            'password_confirmation' => 'AnotherPass1!',
        ])->assertStatus(422);
    }

    public function test_registration_succeeds_with_fallback_for_test_users_if_email_fails(): void
    {
        Mail::shouldReceive('to')
            ->once()
            ->andThrow(new \RuntimeException('SMTP failed'));

        // Register with a test user email ending in @example.com
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User Fallback',
            'email' => 'fallback-test-user@example.com',
            'phone_number' => '+998777777799',
            'password' => 'User$H123',
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('message', 'Tasdiqlash kodi emailingizga yuborildi')
            ->assertJsonPath('email', 'fallback-test-user@example.com')
            ->assertJsonPath('requires_verification', true)
            ->assertJsonStructure(['debug_otp']);

        $debugOtp = $response->json('debug_otp');

        $this->assertNotEmpty($debugOtp);

        $user = User::where('gmail', 'fallback-test-user@example.com')->firstOrFail();
        $this->assertNull($user->email_verified_at);

        // Verify using the debug OTP returned in the response
        $this->postJson('/api/auth/verify-registration-otp', [
            'email' => 'fallback-test-user@example.com',
            'otp' => $debugOtp,
        ])->assertOk()
            ->assertJsonPath('message', 'Registration OTP verified successfully.');

        $user->refresh();
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_resend_registration_otp_succeeds_with_fallback_for_test_users_if_email_fails(): void
    {
        // 1. Register normally using Mail::fake
        Mail::fake();
        $this->postJson('/api/auth/register', [
            'name' => 'Resend Fallback User',
            'email' => 'fallback-resend@test.com',
            'phone_number' => '+998777777899',
            'password' => 'User$H123',
        ])->assertCreated();

        // 2. Mock Mail to throw exception for the resend call
        Mail::shouldReceive('to')
            ->once()
            ->andThrow(new \RuntimeException('SMTP failed'));

        $response = $this->postJson('/api/auth/resend-registration-otp', [
            'email' => 'fallback-resend@test.com',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Tasdiqlash kodi emailingizga yuborildi')
            ->assertJsonPath('email', 'fallback-resend@test.com')
            ->assertJsonPath('requires_verification', true)
            ->assertJsonStructure(['debug_otp']);

        $debugOtp = $response->json('debug_otp');
        $this->assertNotEmpty($debugOtp);

        $this->postJson('/api/auth/verify-registration-otp', [
            'email' => 'fallback-resend@test.com',
            'otp' => $debugOtp,
        ])->assertOk();
    }

    public function test_send_forgot_password_otp_succeeds_with_fallback_for_test_users_if_email_fails(): void
    {
        // 1. Create a verified test user
        $user = User::create([
            'name' => 'Forgot Fallback User',
            'gmail' => 'fallback-forgot@test.com',
            'phone_number' => '+998777777999',
            'password_hash' => Hash::make('User$H123'),
            'email_verified_at' => now(),
        ]);

        // 2. Mock Mail to throw exception
        Mail::shouldReceive('to')
            ->once()
            ->andThrow(new \RuntimeException('SMTP failed'));

        $response = $this->postJson('/api/auth/forgot-password/send-otp', [
            'email' => 'fallback-forgot@test.com',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Password reset OTP sent to your email.')
            ->assertJsonPath('email', 'fallback-forgot@test.com')
            ->assertJsonStructure(['debug_otp']);

        $debugOtp = $response->json('debug_otp');
        $this->assertNotEmpty($debugOtp);

        $this->postJson('/api/auth/forgot-password/verify-otp', [
            'email' => 'fallback-forgot@test.com',
            'otp' => $debugOtp,
        ])->assertOk();
    }

    protected function latestOtpFromSentMail(string $mailableClass, string $email): string
    {
        $sentMail = collect(Mail::sent($mailableClass))
            ->filter(fn (object $mail) => $mail->hasTo($email))
            ->last();

        $this->assertNotNull($sentMail, "Expected {$mailableClass} to be sent to {$email}.");

        return $sentMail->otp;
    }
}
