import React, { useState, useMemo } from 'react';
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
	SortingState,
	ColumnDef,
} from '@tanstack/react-table';
import AppLayout from '@/layouts/app-layout';
import { usePage } from '@inertiajs/react';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Role {
	id: number;
	name: string;
}

interface Department {
	id: number;
	name: string;
}

interface User {
	id: number;
	name: string;
	email: string;
	roles: Role[];
	department?: Department;
}

interface PageProps {
	users: User[];
	roles: Role[];
	departments: Department[];
}


const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'Dashboard', href: dashboard().url },
	{ title: 'User Management', href: '/admin/users' },
];



const ManageUser: React.FC = () => {
	const { users, departments } = (usePage().props as unknown as PageProps);
	const [showModal, setShowModal] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [roles, setRoles] = useState<Role[]>([]);
	const [modalDepartments, setModalDepartments] = useState<Department[]>(departments || []);
	const [form, setForm] = useState({ id: null as number | null, name: '', email: '', password: '', roles: [] as number[], department_id: '' });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [globalFilter, setGlobalFilter] = useState('');
	const [sorting, setSorting] = useState<SortingState>([]);
	const [pageSize, setPageSize] = useState(10);
	const [pageIndex, setPageIndex] = useState(0);

	const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

	const handleDelete = async (id: number) => {
		if (window.confirm('Are you sure you want to delete this user?')) {
			setLoading(true);
			setError(null);
			const res = await fetch(`/admin/users/${id}`, {
				method: 'DELETE',
				credentials: 'same-origin',
				headers: {
					'X-CSRF-TOKEN': token,
					'Accept': 'application/json',
					'X-Requested-With': 'XMLHttpRequest',
				},
			});
			setLoading(false);
			if (res.ok) {
				window.location.reload();
			} else {
				setError('Failed to delete user.');
			}
		}
	};

	const openModal = async (user?: User) => {
		setLoading(true);
		setError(null);
		const res = await fetch('/admin/users/create', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
		const data = await res.json();
		setRoles(data.roles);
		setModalDepartments(data.departments);
		if (user) {
			setEditMode(true);
			setForm({
				id: user.id,
				name: user.name,
				email: user.email,
				password: '',
				roles: user.roles.map(r => r.id),
				department_id: user.department?.id ? String(user.department.id) : '',
			});
		} else {
			setEditMode(false);
			setForm({ id: null, name: '', email: '', password: '', roles: [], department_id: '' });
		}
		setLoading(false);
		setShowModal(true);
	};

	const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value, type } = e.target;
		if (type === 'checkbox') {
			const checked = (e.target as HTMLInputElement).checked;
			setForm((prev) => {
				const roleId = parseInt(value);
				return {
					...prev,
					roles: checked
						? [...prev.roles, roleId]
						: prev.roles.filter((id) => id !== roleId),
				};
			});
		} else {
			setForm((prev) => ({ ...prev, [name]: value }));
		}
	};

	// Helper to check if department head role is selected
	const isDepartmentHead = () => {
		const deptHeadRole = roles.find(r => r.name === 'department-head');
		return deptHeadRole ? form.roles.includes(deptHeadRole.id) : false;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		const url = editMode && form.id ? `/admin/users/${form.id}` : '/admin/users';
		const method = editMode ? 'PUT' : 'POST';
		const res = await fetch(url, {
			method,
			credentials: 'same-origin',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
				'X-CSRF-TOKEN': token,
				'X-Requested-With': 'XMLHttpRequest',
			},
			body: JSON.stringify(form),
		});
		setLoading(false);
		if (res.ok) {
			setShowModal(false);
			window.location.reload();
		} else {
			const err = await res.json().catch(() => ({}));
			setError(err.message || 'Failed to save user.');
		}
	};

	// DataTable columns
	const columns = useMemo<ColumnDef<User, any>[]>(() => [
		{
			accessorKey: 'name',
			header: () => <span>Name</span>,
			cell: info => info.getValue(),
		},
		{
			accessorKey: 'email',
			header: () => <span>Email</span>,
			cell: info => info.getValue(),
		},
		{
			id: 'roles',
			header: () => <span>Roles</span>,
			cell: ({ row }) => (
				row.original.roles.length > 0 ? (
					row.original.roles.map((role: Role) => (
						<Badge key={role.id} className="mr-1" variant="secondary">{role.name}</Badge>
					))
				) : (
					<span className="text-gray-400">No roles</span>
				)
			),
			enableSorting: false,
		},
		{
			id: 'department',
			header: () => <span>Department</span>,
			cell: ({ row }) => (
				row.original.department ? row.original.department.name : <span className="text-gray-400">-</span>
			),
			enableSorting: false,
		},
		{
			id: 'actions',
			header: () => <span>Actions</span>,
			cell: ({ row }) => (
				<div className="flex gap-2">
					<Button size="sm" variant="outline" onClick={() => openModal(row.original)}>Edit</Button>
					<Button size="sm" variant="destructive" onClick={() => handleDelete(row.original.id)}>Delete</Button>
				</div>
			),
			enableSorting: false,
		},
	], [roles]);

	const [tableData, setTableData] = useState(users);
	React.useEffect(() => { setTableData(users); }, [users]);

	const table = useReactTable({
		data: tableData,
		columns,
		state: {
			sorting,
			globalFilter,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
	});

	// Pagination helpers
	const pageRows = useMemo(() => {
		const start = pageIndex * pageSize;
		return table.getRowModel().rows.slice(start, start + pageSize);
	}, [table, pageIndex, pageSize]);

	const pageCount = Math.ceil(table.getRowModel().rows.length / pageSize);

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<div className="flex flex-col gap-4 p-4 dark:bg-gray-900 dark:text-white">
				<div className="flex items-center justify-between mb-2">
					<h1 className="text-2xl font-bold">User Management</h1>
					<Button variant="default" onClick={() => openModal()}>Add User</Button>
				</div>
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
					<label className="mr-2" htmlFor="entries-select">Show</label>
					<select
						id="entries-select"
						className="mx-2 border rounded px-2 py-1 dark:bg-gray-800 dark:text-white"
						value={pageSize}
						onChange={e => {
							setPageSize(Number(e.target.value));
							setPageIndex(0);
						}}
						title="Show entries"
					>
						{[10, 25, 50, 100].map(size => (
							<option key={size} value={size}>{size}</option>
						))}
					</select>
					entries
					<input
						className="search-input border rounded px-2 py-1 dark:bg-gray-800 dark:text-white max-w-xs"
						placeholder="Search..."
						value={globalFilter ?? ''}
						onChange={e => {
							setGlobalFilter(e.target.value);
							setPageIndex(0);
						}}
					/>
				</div>
				<div className="overflow-x-auto rounded-xl shadow dark:bg-gray-800">
					<table className="min-w-full bg-white dark:bg-gray-900">
						<thead>
							{table.getHeaderGroups().map(headerGroup => (
								<tr key={headerGroup.id} className="bg-gray-50 dark:bg-gray-800">
									{headerGroup.headers.map(header => (
										<th
											key={header.id}
											className="py-2 px-4 text-left relative"
											colSpan={header.colSpan}
										>
											{header.isPlaceholder ? null : (
												<div
													{...{
														className: header.column.getCanSort()
															? 'cursor-pointer select-none flex items-center'
															: '',
														onClick: header.column.getToggleSortingHandler(),
													}}
												>
													{flexRender(header.column.columnDef.header, header.getContext())}
													{header.column.getCanSort() && (
														<span className={`sort-arrows ml-1 ${header.column.getIsSorted() ? 'active' : ''}`}>
															<span className={`arrow-up${header.column.getIsSorted() === 'asc' ? ' active' : ''}`}></span>
															<span className={`arrow-down${header.column.getIsSorted() === 'desc' ? ' active' : ''}`}></span>
														</span>
													)}
												</div>
											)}
										</th>
									))}
								</tr>
							))}
						</thead>
						<tbody>
							{pageRows.length > 0 ? pageRows.map(row => (
								<tr key={row.id} className="border-b dark:border-gray-700">
									{row.getVisibleCells().map(cell => (
										<td key={cell.id} className="py-2 px-4">
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</td>
									))}
								</tr>
							)) : (
								<tr><td colSpan={columns.length} className="text-center py-4 text-gray-400">No users found.</td></tr>
							)}
						</tbody>
					</table>
				</div>
				{/* Pagination */}
				<div className="flex justify-between items-center mt-2">
					<div>
						Page {pageIndex + 1} of {pageCount}
					</div>
					<div className="flex gap-2">
						<Button size="sm" variant="outline" onClick={() => setPageIndex(0)} disabled={pageIndex === 0}>First</Button>
						<Button size="sm" variant="outline" onClick={() => setPageIndex(pageIndex - 1)} disabled={pageIndex === 0}>Prev</Button>
						<Button size="sm" variant="outline" onClick={() => setPageIndex(pageIndex + 1)} disabled={pageIndex >= pageCount - 1}>Next</Button>
						<Button size="sm" variant="outline" onClick={() => setPageIndex(pageCount - 1)} disabled={pageIndex >= pageCount - 1}>Last</Button>
					</div>
				</div>
				{/* Modal for create/edit user */}
				<Dialog open={showModal} onOpenChange={setShowModal}>
					<DialogContent className="max-w-md w-full dark:bg-gray-900 dark:text-white">
						<DialogHeader>
							<DialogTitle>{editMode ? 'Edit User' : 'Add User'}</DialogTitle>
						</DialogHeader>
						{error && <div className="text-red-500 mb-2">{error}</div>}
						<form onSubmit={handleSubmit} className="flex flex-col gap-4">
							<input
								type="text"
								name="name"
								placeholder="Name"
								value={form.name}
								onChange={handleFormChange}
								className="border rounded p-2 dark:bg-gray-800 dark:text-white"
								required
							/>
							<input
								type="email"
								name="email"
								placeholder="Email"
								value={form.email}
								onChange={handleFormChange}
								className="border rounded p-2 dark:bg-gray-800 dark:text-white"
								required
							/>
							<input
								type="password"
								name="password"
								placeholder="Password"
								value={form.password}
								onChange={handleFormChange}
								className="border rounded p-2 dark:bg-gray-800 dark:text-white"
								required={!editMode}
							/>
							<div>
								<label className="block mb-2">Roles</label>
								<div className="flex flex-wrap gap-2">
									{roles.map((role) => (
										<label key={role.id} className="flex items-center gap-1">
											<input
												type="checkbox"
												name="roles"
												value={role.id}
												checked={form.roles.includes(role.id)}
												onChange={handleFormChange}
												className="dark:bg-gray-800"
											/>
											<span>{role.name}</span>
										</label>
									))}
								</div>
							</div>
							{/* Department dropdown only if department head role is selected */}
							{isDepartmentHead() && (
								<div>
									<label className="block mb-2">Department</label>
									<select
										name="department_id"
										value={form.department_id}
										onChange={handleFormChange}
										className="border rounded p-2 dark:bg-gray-800 dark:text-white"
										required
										title="Select department"
									>
										<option value="">Select department</option>
										{modalDepartments.map((dept) => (
											<option key={dept.id} value={dept.id}>{dept.name}</option>
										))}
									</select>
								</div>
							)}
							<div className="flex justify-end gap-2">
								<Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
								<Button type="submit" variant="default" disabled={loading}>{editMode ? 'Update' : 'Create'}</Button>
							</div>
						</form>
					</DialogContent>
				</Dialog>
			</div>
		</AppLayout>
	);
};

export default ManageUser;
