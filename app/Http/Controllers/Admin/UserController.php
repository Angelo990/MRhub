<?php

namespace App\Http\Controllers\Admin;

use App\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    // List all users
    public function index()
    {
    $users = User::with(['roles', 'department'])->get();
    $roles = Role::all();
    $departments = \App\Models\Department::all();
    return Inertia::render('Admin/ManageUsers', compact('users', 'roles', 'departments'));
    }

    // Show create user form
    public function create()
    {
    $roles = Role::all();
    $departments = \App\Models\Department::all();
    return response()->json(['roles' => $roles, 'departments' => $departments]);
    }

    // Store new user
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'roles' => 'array',
            'roles.*' => 'exists:roles,id',
            'department_id' => 'nullable|exists:departments,id',
        ]);

        if (in_array('department-head', $data['roles'] ?? [], true) && empty($data['department_id'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'department_id' => 'A department is required when assigning the department-head role.',
            ]);
        }

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'department_id' => $data['department_id'] ?? null,
        ]);
        if (!empty($data['roles'])) {
            $user->syncRoles($data['roles']);
        }

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json(['success' => true, 'user' => $user->load(['roles', 'department'])], 201);
        }

        return Redirect::route('admin.users.index');
    }

    // Show edit user form
    public function edit(User $user)
    {
        $roles = Role::all();
        $user->load('roles');
        return Inertia::render('Admin/Users/Edit', compact('user', 'roles'));
    }

    // Update user
    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:8',
            'roles' => 'array',
            'department_id' => 'nullable|exists:departments,id',
        ]);
        $user->name = $data['name'];
        $user->email = $data['email'];
        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }
        $user->department_id = $data['department_id'] ?? null;
        $user->save();
        $user->syncRoles($data['roles'] ?? []);
        if ($request->expectsJson() || $request->ajax()) {
            return response()->json(['success' => true, 'user' => $user->load(['roles', 'department'])]);
        }
        return Redirect::route('admin.users.index');
    }

    // Delete user
    public function destroy(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'You cannot delete your own account.',
                ], 403);
            }

            abort(403, 'You cannot delete your own account.');
        }

        $user->delete();

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json(['success' => true]);
        }

        return Redirect::route('admin.users.index');
    }
}
