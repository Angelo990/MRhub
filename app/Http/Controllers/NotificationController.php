<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $readState = $request->string('readState')->toString();
        $statusFilters = collect((array) $request->input('status', []))
            ->filter(fn ($value) => filled($value))
            ->values();
        $typeFilters = collect((array) $request->input('type', []))
            ->filter(fn ($value) => filled($value))
            ->values();

        $fromDate = $this->parseDateBoundary($request->input('fromDate'), false);
        $toDate = $this->parseDateBoundary($request->input('toDate'), true);

        $notificationsQuery = $request->user()
            ->notifications();

        if ($readState === 'read') {
            $notificationsQuery->whereNotNull('read_at');
        } elseif ($readState === 'unread') {
            $notificationsQuery->whereNull('read_at');
        }

        if ($statusFilters->isNotEmpty()) {
            $notificationsQuery->where(function (Builder $query) use ($statusFilters) {
                foreach ($statusFilters as $status) {
                    $query->orWhere('data->status', $status);
                }
            });
        }

        if ($typeFilters->isNotEmpty()) {
            $notificationsQuery->where(function (Builder $query) use ($typeFilters) {
                foreach ($typeFilters as $type) {
                    $query->orWhere('data->type', $type);
                }
            });
        }

        if ($fromDate !== null) {
            $notificationsQuery->where('created_at', '>=', $fromDate);
        }

        if ($toDate !== null) {
            $notificationsQuery->where('created_at', '<=', $toDate);
        }

        $notifications = $notificationsQuery
            ->latest()
            ->paginate(20)
            ->withQueryString()
            ->through(fn ($notification) => [
                'id' => $notification->id,
                'title' => $notification->data['title'] ?? 'Workflow update',
                'message' => $notification->data['message'] ?? '',
                'actionUrl' => $notification->data['action_url'] ?? null,
                'actionLabel' => $notification->data['action_label'] ?? 'Open',
                'type' => $notification->data['type'] ?? 'workflow',
                'typeNormalized' => $this->normalizeValue($notification->data['type'] ?? 'workflow'),
                'status' => $notification->data['status'] ?? null,
                'statusNormalized' => $this->normalizeValue($notification->data['status'] ?? ''),
                'severityColor' => $this->resolveSeverityColor($notification->data['status'] ?? null, $notification->data['type'] ?? null),
                'readAt' => optional($notification->read_at)?->toIso8601String(),
                'createdAt' => optional($notification->created_at)?->toIso8601String(),
            ]);

        return Inertia::render('Notifications/Index', [
            'notificationHistory' => $notifications,
            'activeFilters' => [
                'readState' => in_array($readState, ['read', 'unread'], true) ? $readState : 'all',
                'status' => $statusFilters->values()->all(),
                'type' => $typeFilters->values()->all(),
                'fromDate' => $request->input('fromDate'),
                'toDate' => $request->input('toDate'),
            ],
            'filterOptions' => [
                'statuses' => [
                    'Pending Endorsement',
                    'Pending Approval',
                    'Approved',
                    'Rejected',
                    'Released',
                    'Partially Released',
                    'Ready for Pickup',
                    'Completed',
                ],
                'types' => [
                    'request-submitted',
                    'request-endorsed',
                    'request-approved',
                    'request-rejected',
                    'request-released',
                    'request-partially-released',
                    'request-items-rejected',
                    'request-completed',
                    'workflow',
                ],
            ],
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

    private function normalizeValue(string $value): string
    {
        return Str::of($value)
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/', '-')
            ->trim('-')
            ->value();
    }

    private function resolveSeverityColor(?string $status, ?string $type): string
    {
        $statusKey = $this->normalizeValue((string) $status);
        $typeKey = $this->normalizeValue((string) $type);

        if (in_array($statusKey, ['approved', 'released', 'completed'], true)) {
            return 'success';
        }

        if (in_array($statusKey, ['rejected'], true) || str_contains($typeKey, 'rejected')) {
            return 'danger';
        }

        if (in_array($statusKey, ['pending-endorsement', 'pending-approval', 'partially-released', 'ready-for-pickup'], true)) {
            return 'warning';
        }

        return 'info';
    }

    private function parseDateBoundary(?string $dateValue, bool $endOfDay): ?Carbon
    {
        if (! filled($dateValue)) {
            return null;
        }

        try {
            $date = Carbon::parse($dateValue);
        } catch (\Throwable) {
            return null;
        }

        return $endOfDay ? $date->endOfDay() : $date->startOfDay();
    }
}