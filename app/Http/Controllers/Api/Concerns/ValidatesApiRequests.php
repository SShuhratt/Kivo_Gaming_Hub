<?php

namespace App\Http\Controllers\Api\Concerns;

use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

trait ValidatesApiRequests
{
    protected function validateApi(
        Request $request,
        array $rules,
        array $messages = [],
        array $attributes = [],
        int $status = 400,
        string $message = 'Bad request.',
    ): array
    {
        $validator = Validator::make($request->all(), $rules, $messages, $attributes);

        if ($validator->fails()) {
            throw new HttpResponseException(response()->json([
                'message' => $message,
                'errors' => $validator->errors(),
            ], $status));
        }

        return $validator->validated();
    }
}
