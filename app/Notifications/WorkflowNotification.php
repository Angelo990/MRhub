<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class WorkflowNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected array $payload,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->payload['title'] ?? 'Workflow update',
            'message' => $this->payload['message'] ?? '',
            'action_url' => $this->payload['action_url'] ?? null,
            'action_label' => $this->payload['action_label'] ?? 'Open',
            'request_id' => $this->payload['request_id'] ?? null,
            'status' => $this->payload['status'] ?? null,
            'type' => $this->payload['type'] ?? 'workflow',
        ];
    }
}