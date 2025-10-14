import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { usePage } from '@inertiajs/react';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Role {
	id: number;
	name: string;
}

interface User {
	id: number;
	name: string;
	email: string;
	roles: Role[];
}

interface PageProps {
	users: User[];
	roles: Role[];
	[key: string]: any;
}


const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'Dashboard', href: dashboard().url },
	{ title: 'User Management', href: '/admin/users' },
];

const ManageUser: React.FC = () => {
	const { users, roles } = usePage<PageProps>().props;

	const handleDelete = (id: number) => {
		if (window.confirm('Are you sure you want to delete this user?')) {
			// Replace with your own delete logic (e.g., fetch/axios)
			window.location.href = `/admin/users/${id}/delete`;
		}
	};

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<div className="flex flex-col gap-4 p-4">
				<div className="flex items-center justify-between mb-2">
					<h1 className="text-2xl font-bold">User Management</h1>
								<a href="/admin/users/create">
									<Button variant="default">Add User</Button>
								</a>
				</div>
				<div className="overflow-x-auto rounded-xl shadow">
					<table className="min-w-full bg-white">
						<thead>
							<tr className="bg-gray-50">
								<th className="py-2 px-4 text-left">Name</th>
								<th className="py-2 px-4 text-left">Email</th>
								<th className="py-2 px-4 text-left">Roles</th>
								<th className="py-2 px-4 text-left">Actions</th>
							</tr>
						</thead>
						<tbody>
											{users.map((user: User) => (
												<tr key={user.id} className="border-b">
													<td className="py-2 px-4">{user.name}</td>
													<td className="py-2 px-4">{user.email}</td>
													<td className="py-2 px-4">
														{user.roles.length > 0 ? (
															user.roles.map((role: Role) => (
																<Badge key={role.id} className="mr-1" variant="secondary">{role.name}</Badge>
															))
														) : (
															<span className="text-gray-400">No roles</span>
														)}
													</td>
													<td className="py-2 px-4">
																			<a href={`/admin/users/${user.id}/edit`} className="mr-2">
																				<Button size="sm" variant="outline">Edit</Button>
																			</a>
														<Button size="sm" variant="destructive" onClick={() => handleDelete(user.id)}>Delete</Button>
													</td>
												</tr>
											))}
						</tbody>
					</table>
				</div>
			</div>
		</AppLayout>
	);
};

export default ManageUser;
