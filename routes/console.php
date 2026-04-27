<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Notifications\DatabaseNotification;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('notifications:prune-read {--days= : Number of retention days for read notifications}', function () {
    $configuredDays = (int) config('notifications.read_retention_days', 30);
    $requestedDays = (int) $this->option('days');
    $days = $requestedDays > 0 ? $requestedDays : $configuredDays;

    $cutoff = now()->subDays($days);

    $deleted = DatabaseNotification::query()
        ->whereNotNull('read_at')
        ->where('created_at', '<', $cutoff)
        ->delete();

    $this->info("Pruned {$deleted} read notifications older than {$days} day(s).");
})->purpose('Delete read notifications older than the retention period.');

Schedule::command('notifications:prune-read')->daily();
