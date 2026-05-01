<!DOCTYPE html>
<html>
<head>
    <title>Password Reset OTP</title>
</head>
<body>
    <h1>Password Reset Request</h1>
    <p>You have requested to reset your password. Here is your One-Time Password (OTP):</p>
    <h2 style="color: #333; background: #f4f4f4; padding: 10px; display: inline-block; border-radius: 5px;">{{ $otp }}</h2>
    <p>This code will expire in 10 minutes. If you did not request a password reset, please ignore this email.</p>
</body>
</html>
