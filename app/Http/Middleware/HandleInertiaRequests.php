<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $notifications = ['items' => [], 'unreadCount' => 0];

        if ($request->user()) {
            $notifications = [
                'items' => $request->user()
                    ->notifications()
                    ->latest()
                    ->limit(8)
                    ->get()
                    ->map(fn ($notification) => [
                        'id' => $notification->id,
                        'title' => $notification->data['title'] ?? 'Workflow update',
                        'message' => $notification->data['message'] ?? '',
                        'actionUrl' => $notification->data['action_url'] ?? null,
                        'actionLabel' => $notification->data['action_label'] ?? 'Open',
                        'type' => $notification->data['type'] ?? 'workflow',
                        'status' => $notification->data['status'] ?? null,
                        'readAt' => optional($notification->read_at)?->toIso8601String(),
                        'createdAt' => optional($notification->created_at)?->toIso8601String(),
                    ])
                    ->values(),
                'unreadCount' => $request->user()->unreadNotifications()->count(),
            ];
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'csrf_token' => csrf_token(),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
            ],
            'notifications' => $notifications,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
