<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Semester;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SemesterController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'label'     => 'required|string|max:120',
            'year'      => 'required|integer|min:2000',
            'semester'  => 'required|in:1,2',
            'starts_at' => 'required|date',
            'ends_at'   => 'required|date|after:starts_at',
        ]);

        $semester = Semester::create($data);

        return back()->with('success', 'Semester created.');
    }

    /**
     * Activate a semester (deactivates all others).
     * Blocks activation if another semester has un-finalized reserved budgets.
     */
    public function activate(Request $request, Semester $semester)
    {
        // Check: no pending reservations on the current active semester
        $activeSemester = Semester::current();
        if ($activeSemester && $activeSemester->id !== $semester->id) {
            $hasPendingReservations = \App\Models\DepartmentBudget::where('semester_id', $activeSemester->id)
                ->where('reserved_amount', '>', 0)
                ->exists();

            if ($hasPendingReservations) {
                return back()->withErrors(['semester' => 'Cannot activate a new semester while there are pending budget reservations. Resolve all endorsed requests first.']);
            }
        }

        DB::transaction(function () use ($semester) {
            Semester::where('id', '!=', $semester->id)->update(['is_active' => false]);
            $semester->update(['is_active' => true]);
        });

        return back()->with('success', "Semester \"{$semester->label}\" activated.");
    }
}
