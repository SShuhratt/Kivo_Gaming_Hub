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
    ): array
    {
        $validator = Validator::make($request->all(), $rules, $messages, $attributes);

        if ($validator->fails()) {
            throw new HttpResponseException(response()->json([
                'message' => 'Bad request.',
                'errors' => $validator->errors(),
            ], 400));
        }

        return $validator->validated();
    }
}
