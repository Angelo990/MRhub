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
        $users = User::with('roles')->get();
        $roles = Role::all();
        return Inertia::render('Admin/Users/Index', compact('users', 'roles'));
    }

    // Show create user form
    public function create()
    {
        $roles = Role::all();
        return Inertia::render('Admin/Users/Create', compact('roles'));
    }

    // Store new user
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'roles' => 'array',
        ]);
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);
        if (!empty($data['roles'])) {
            $user->syncRoles($data['roles']);
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
        ]);
        $user->name = $data['name'];
        $user->email = $data['email'];
        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }
        $user->save();
        $user->syncRoles($data['roles'] ?? []);
        return Redirect::route('admin.users.index');
    }

    // Delete user
    public function destroy(User $user)
    {
        $user->delete();
        return Redirect::route('admin.users.index');
    }
}
