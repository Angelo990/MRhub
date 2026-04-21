<?php

namespace App\Support;

use App\Models\Request as SupplyRequest;
use App\Models\User;
use App\Notifications\WorkflowNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;

class WorkflowNotifier
{
    public static function requestSubmitted(SupplyRequest $request, ?User $actor = null): void
    {
        self::sendToRole('property-custodian', [
            'title' => 'New request submitted',
            'message' => "Request #{$request->id} from {$request->department?->name} is waiting for endorsement.",
            'action_url' => route('property-custodian.requests.index'),
            'action_label' => 'Open requests',
            'request_id' => $request->id,
            'status' => $request->status,
            'type' => 'request-submitted',
        ], $actor?->id);
    }

    public static function requestEndorsed(SupplyRequest $request, ?User $actor = null): void
    {
        self::sendToRole('vp-finance', [
            'title' => 'Request endorsed',
            'message' => "Request #{$request->id} from {$request->department?->name} is ready for finance approval.",
            'action_url' => route('vp-finance.requests.index'),
            'action_label' => 'Review request',
            'request_id' => $request->id,
            'status' => $request->status,
            'type' => 'request-endorsed',
        ], $actor?->id);

        self::sendToDepartmentHead($request, [
            'title' => 'Request endorsed',
            'message' => "Your request #{$request->id} was endorsed and forwarded to VP Finance.",
            'action_url' => route('department-head.requests.index'),
            'action_label' => 'View request',
            'request_id' => $request->id,
            'status' => $request->status,
            'type' => 'request-endorsed',
        ], $actor?->id);
    }

    public static function requestApproved(SupplyRequest $request, ?User $actor = null): void
    {
        self::sendToRole('property-custodian', [
            'title' => 'Request approved',
            'message' => "Request #{$request->id} was approved and can now be prepared for release.",
            'action_url' => route('property-custodian.requests.index'),
            'action_label' => 'Prepare release',
            'request_id' => $request->id,
            'status' => $request->status,
            'type' => 'request-approved',
        ], $actor?->id);

        self::sendToDepartmentHead($request, [
            'title' => 'Request approved',
            'message' => "Your request #{$request->id} was approved by VP Finance.",
            'action_url' => route('department-head.requests.index'),
            'action_label' => 'View request',
            'request_id' => $request->id,
            'status' => $request->status,
            'type' => 'request-approved',
        ], $actor?->id);
    }

    public static function requestRejected(SupplyRequest $request, ?User $actor = null): void
    {
        self::sendToDepartmentHead($request, [
            'title' => 'Request rejected',
            'message' => "Your request #{$request->id} was rejected by VP Finance.",
            'action_url' => route('department-head.requests.index'),
            'action_label' => 'View request',
            'request_id' => $request->id,
            'status' => $request->status,
            'type' => 'request-rejected',
        ], $actor?->id);
    }

    public static function requestReleased(SupplyRequest $request, ?User $actor = null): void
    {
        self::sendToDepartmentHead($request, [
            'title' => 'Items released',
            'message' => "Request #{$request->id} was released by Property Custodian and is ready for receipt confirmation.",
            'action_url' => route('department-head.requests.index'),
            'action_label' => 'Open receipt',
            'request_id' => $request->id,
            'status' => $request->status,
            'type' => 'request-released',
        ], $actor?->id);
    }

    public static function requestItemsRejected(SupplyRequest $request, array $rejectedItems, ?User $actor = null): void
    {
        $itemList = implode(', ', array_map(fn ($i) => $i['particular'], $rejectedItems));

        self::sendToDepartmentHead($request, [
            'title' => 'Some items were rejected',
            'message' => "Request #{$request->id} was approved but the following items were rejected: {$itemList}. The remaining items will proceed.",
            'action_url' => route('department-head.requests.index'),
            'action_label' => 'View request',
            'request_id' => $request->id,
            'status' => $request->status,
            'type' => 'request-items-rejected',
        ], $actor?->id);

        self::sendToRole('property-custodian', [
            'title' => 'Request approved with item rejections',
            'message' => "Request #{$request->id} is approved. Note: {$itemList} were rejected. Only non-rejected items need fulfillment.",
            'action_url' => route('property-custodian.requests.index'),
            'action_label' => 'View requests',
            'request_id' => $request->id,
            'status' => $request->status,
            'type' => 'request-items-rejected',
        ], $actor?->id);
    }

    public static function requestPartiallyReleased(SupplyRequest $request, ?User $actor = null): void
    {
        self::sendToDepartmentHead($request, [
            'title' => 'Request partially fulfilled',
            'message' => "Request #{$request->id} was partially fulfilled. Some items are still pending release.",
            'action_url' => route('department-head.requests.index'),
            'action_label' => 'View request',
            'request_id' => $request->id,
            'status' => $request->status,
            'type' => 'request-partially-released',
        ], $actor?->id);
    }

    public static function requestCompleted(SupplyRequest $request, ?User $actor = null): void
    {
        self::sendToRole('property-custodian', [
            'title' => 'Receipt confirmed',
            'message' => "Department Head confirmed receipt for request #{$request->id}.",
            'action_url' => route('property-custodian.requests.index'),
            'action_label' => 'View requests',
            'request_id' => $request->id,
            'status' => $request->status,
            'type' => 'request-completed',
        ], $actor?->id);
    }

    protected static function sendToRole(string $role, array $payload, ?int $exceptUserId = null): void
    {
        $users = User::role($role)
            ->when($exceptUserId, fn ($query) => $query->where('id', '!=', $exceptUserId))
            ->get();

        self::send($users, $payload);
    }

    protected static function sendToDepartmentHead(SupplyRequest $request, array $payload, ?int $exceptUserId = null): void
    {
        $users = User::role('department-head')
            ->where('department_id', $request->department_id)
            ->when($exceptUserId, fn ($query) => $query->where('id', '!=', $exceptUserId))
            ->get();

        self::send($users, $payload);
    }

    protected static function send(Collection $users, array $payload): void
    {
        if ($users->isEmpty()) {
            return;
        }

        Notification::send($users, new WorkflowNotification($payload));
    }
}