import React, { useState, useMemo } from 'react';
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	ColumnDef,
} from '@tanstack/react-table';
import AppLayout from '@/layouts/app-layout';
import { usePage } from '@inertiajs/react';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTablePagination, DataTableToolbar } from '@/components/data-table-controls';
import { DataTableShell } from '@/components/data-table-shell';
import { useDataTable } from '@/hooks/use-data-table';
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
	const { users, departments, csrf_token } = (usePage().props as SharedData & PageProps);
	const [showModal, setShowModal] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [roles, setRoles] = useState<Role[]>([]);
	const [modalDepartments, setModalDepartments] = useState<Department[]>(departments || []);
	const [form, setForm] = useState({ id: null as number | null, name: '', email: '', password: '', roles: [] as number[], department_id: '' });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const {
		globalFilter,
		sorting,
		pagination,
		setPagination,
		setSorting,
		handleSearchChange,
		handlePageSizeChange,
		getPaginationSummary,
		globalFilterFn,
	} = useDataTable<User>();

	const handleDelete = async (id: number) => {
		if (window.confirm('Are you sure you want to delete this user?')) {
			setLoading(true);
			setError(null);
			const res = await fetch(`/admin/users/${id}`, {
				method: 'DELETE',
				credentials: 'same-origin',
				headers: {
					'X-CSRF-TOKEN': csrf_token,
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
				'X-CSRF-TOKEN': csrf_token,
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
			pagination,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: handleSearchChange,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		globalFilterFn,
	});

	const { totalRows, totalPages, showingFrom, showingTo } = getPaginationSummary(table);

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<div className="flex flex-col gap-4 p-4 dark:bg-gray-900 dark:text-white">
				<div className="flex items-center justify-between mb-2">
					<h1 className="text-2xl font-bold">User Management</h1>
					<Button variant="default" onClick={() => openModal()}>Add User</Button>
				</div>
				<DataTableToolbar
					pageSize={pagination.pageSize}
					onPageSizeChange={handlePageSizeChange}
					searchValue={globalFilter}
					onSearchChange={handleSearchChange}
				/>
				<DataTableShell table={table} emptyColSpan={columns.length} emptyMessage="No users found." />
				<DataTablePagination
					showingFrom={showingFrom}
					showingTo={showingTo}
					totalRows={totalRows}
					itemLabel="users"
					onFirst={() => table.setPageIndex(0)}
					onPrev={() => table.previousPage()}
					onNext={() => table.nextPage()}
					onLast={() => table.setPageIndex(totalPages - 1)}
					canPrevious={table.getCanPreviousPage()}
					canNext={table.getCanNextPage()}
				/>
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
