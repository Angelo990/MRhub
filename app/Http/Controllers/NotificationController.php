<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->paginate(20)
            ->through(fn ($notification) => [
                'id' => $notification->id,
                'title' => $notification->data['title'] ?? 'Workflow update',
                'message' => $notification->data['message'] ?? '',
                'actionUrl' => $notification->data['action_url'] ?? null,
                'actionLabel' => $notification->data['action_label'] ?? 'Open',
                'type' => $notification->data['type'] ?? 'workflow',
                'status' => $notification->data['status'] ?? null,
                'readAt' => optional($notification->read_at)?->toIso8601String(),
                'createdAt' => optional($notification->created_at)?->toIso8601String(),
            ]);

        return Inertia::render('Notifications/Index', [
            'notificationHistory' => $notifications,
        ]);
    }

    public function markRead(Request $request, string $notification)
    {
        $record = $request->user()
            ->notifications()
            ->whereKey($notification)
            ->firstOrFail();

        if ($record->read_at === null) {
            $record->markAsRead();
        }

        return response()->json(['success' => true]);
    }

    public function markAllRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['success' => true]);
    }
}