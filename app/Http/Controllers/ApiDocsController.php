<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;

class ApiDocsController extends Controller
{
    public function index(): View
    {
        return view('api-docs', [
            'specUrl' => url('/docs/openapi.json'),
        ]);
    }
}
