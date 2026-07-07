"use client";

import { useEffect, useState } from "react";
import { getDoctorPostsByDoctor, deleteDoctorPost, createDoctorPost, updateDoctorPostStatus } from "@/apis/doctor-post/doctor-post.api";
import { MoreVertical, Edit2, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type DoctorPost = {
	_id: string;
	doctorId: string;
	postLink: string;
	viewCount: number;
	title?: string;
	description?: string;
	status?: string;
	createdAt?: string;
	updatedAt?: string;
};

type Pagination = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

function formatDate(dateStr?: string) {
	if (!dateStr) return "";
	return new Date(dateStr).toLocaleString("vi-VN", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function DoctorPostsPage() {
	const [items, setItems] = useState<DoctorPost[]>([]);
	const [pagination, setPagination] = useState<Pagination>({
		page: 1,
		limit: 10,
		total: 0,
		totalPages: 1,
	});
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [openMenu, setOpenMenu] = useState<string | null>(null);

	// Create post state
	const [creating, setCreating] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	// doctorId will be read from localStorage when needed
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [file, setFile] = useState<File | null>(null);

	useEffect(() => {
		const fetchPosts = async () => {
			setLoading(true);
			setError(null);
			try {
				const docId = typeof window !== 'undefined' ? localStorage.getItem('doctorId') : null;
				if (!docId) {
					setItems([]);
					setPagination({ page, limit, total: 0, totalPages: 1 });
					setError("Không tìm thấy doctorId trong localStorage");
					return;
				}
				const res = await getDoctorPostsByDoctor(docId, { page, limit });
				// Normalize response: handle both direct and wrapped shapes
				const payload: any = (res as any)?.data ? (res as any).data : res;
				const items: DoctorPost[] = payload?.items ?? [];
				const pgn: Pagination = payload?.pagination ?? {
					page,
					limit,
					total: items.length,
					totalPages: 1,
				};
				setItems(items);
				setPagination(pgn);
			} catch (e: any) {
				setError(e?.message ?? "Không thể tải bài đăng");
			} finally {
				setLoading(false);
			}
		};
		fetchPosts();
	}, [page, limit]);

	const handleDelete = async (id: string) => {
		if (!confirm("Bạn có chắc chắn muốn xóa bài đăng này?")) return;
		
		setActionLoading(id);
		try {
			await deleteDoctorPost(id);
			toast.success("Xóa bài đăng thành công");
			setItems(items.filter(item => item._id !== id));
			setOpenMenu(null);
		} catch (e: any) {
			toast.error("Xóa bài đăng thất bại");
			console.error(e);
		} finally {
			setActionLoading(null);
		}
	};

	const handleToggleStatus = async (post: DoctorPost) => {
		const newStatus: "ACTIVE" | "HIDDEN" = post.status === "ACTIVE" ? "HIDDEN" : "ACTIVE";
		setActionLoading(post._id);
		try {
			await updateDoctorPostStatus(post._id, newStatus);
			toast.success(`Cập nhật trạng thái thành ${newStatus}`);
			setItems(items.map(item => 
				item._id === post._id ? { ...item, status: newStatus } : item
			));
			setOpenMenu(null);
		} catch (e: any) {
			toast.error("Cập nhật trạng thái thất bại");
			console.error(e);
		} finally {
			setActionLoading(null);
		}
	};

	const handleCreate = async () => {
		const docId = typeof window !== 'undefined' ? localStorage.getItem('doctorId') : null;
		if (!file) {
			toast.error("Chưa chọn file video");
			return;
		}
		setCreating(true);
		try {
			await createDoctorPost({ title: title || undefined, description: description || undefined, file });
			toast.success("Tạo bài đăng thành công");
			// Reset form
			setTitle("");
			setDescription("");
			setFile(null);
			// Refresh list when the current doctor id is available in localStorage
			if (docId) {
				const res = await getDoctorPostsByDoctor(docId, { page, limit });
				const payload: any = (res as any)?.data ? (res as any).data : res;
				setItems(payload?.items ?? []);
				setPagination(payload?.pagination ?? { page, limit, total: (payload?.items ?? []).length, totalPages: 1 });
			}
		} catch (e: any) {
			toast.error("Tạo bài đăng thất bại");
			console.error(e);
		} finally {
			setCreating(false);
		}
	};

	const onPrev = () => setPage((p) => Math.max(1, p - 1));
	const onNext = () =>
		setPage((p) => Math.min(pagination.totalPages || 1, p + 1));

	return (
		<div className="px-4 md:px-6 lg:px-8 py-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<p className="text-2xl font-bold">Bài đăng của bác sĩ</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="default" size="sm" onClick={() => setCreateOpen(true)}>
						Tạo bài đăng
					</Button>
				</div>
			</div>

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Tạo bài đăng mới</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div className="flex flex-col gap-1">
								<label className="text-sm text-muted-foreground">Tiêu đề</label>
								<input
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm"
									placeholder="Nhập tiêu đề (tuỳ chọn)"
								/>
							</div>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-sm text-muted-foreground">Mô tả</label>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm"
								placeholder="Nhập mô tả (tuỳ chọn)"
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-sm text-muted-foreground">File video</label>
							<input
								type="file"
								accept="video/*"
								onChange={(e) => setFile(e.target.files?.[0] ?? null)}
								className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm"
							/>
						</div>
					</div>
					<DialogFooter>
						<div className="flex items-center gap-2">
							<Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
								Hủy
							</Button>
							<Button onClick={async () => { await handleCreate(); if (!creating) setCreateOpen(false); }} disabled={creating}>
								{creating ? "Đang tạo..." : "Lưu bài đăng"}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{loading && (
				<div className="py-16 text-center text-muted-foreground">Đang tải...</div>
			)}
			{error && (
				<div className="mb-4 text-red-600">Lỗi: {error}</div>
			)}

			{!loading && items.length === 0 && (
				<div className="py-16 text-center text-muted-foreground">
					Chưa có bài đăng
				</div>
			)}

			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
				{items.map((post) => (
					<div
						key={post._id}
						className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow flex flex-col group relative"
					>
						<div className="aspect-[9/16] bg-black relative">
							<video
								controls
								preload="metadata"
								src={post.postLink}
								className="w-full h-full object-cover"
							/>
							<span className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full border bg-black/70 text-white">
								{post.status || "ACTIVE"}
							</span>

							{/* Action Menu */}
							<div className="absolute top-2 left-2 z-20">
								<button
									onClick={() => setOpenMenu(openMenu === post._id ? null : post._id)}
									className="p-1.5 rounded-full bg-black/70 text-white hover:bg-black/90 transition"
								>
									<MoreVertical className="w-4 h-4" />
								</button>
								
								{openMenu === post._id && (
									<div className="absolute top-10 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-40 overflow-hidden z-30">
										<button
											onClick={() => handleToggleStatus(post)}
											disabled={actionLoading === post._id}
											className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-2 border-b border-gray-100 dark:border-gray-700"
										>
											{post.status === "ACTIVE" ? (
												<>
													<EyeOff className="w-4 h-4" />
													Ẩn bài đăng
												</>
											) : (
												<>
													<Eye className="w-4 h-4" />
													Hiện bài đăng
												</>
											)}
										</button>
										{/* <button
											onClick={() => {
												toast.info("Chức năng sửa sẽ được cập nhật");
												setOpenMenu(null);
											}}
											className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-2 border-b border-gray-100 dark:border-gray-700"
										>
											<Edit2 className="w-4 h-4" />
											Chỉnh sửa
										</button> */}
										<button
											onClick={() => handleDelete(post._id)}
											disabled={actionLoading === post._id}
											className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex items-center gap-2"
										>
											<Trash2 className="w-4 h-4" />
											Xóa
										</button>
									</div>
								)}
							</div>
						</div>
						<div className="p-3 space-y-2 flex-1 flex flex-col">
							<h2 className="font-semibold text-sm line-clamp-2 text-gray-900 dark:text-white">
								{post.title || "Bài đăng"}
							</h2>
							{post.description && (
								<p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 flex-1">
									{post.description}
								</p>
							)}
							<div className="text-xs text-gray-500 dark:text-gray-500 space-y-1 pt-2 border-t border-gray-100 dark:border-gray-800">
								<div className="flex items-center justify-between">
									<span>👁️ {post.viewCount ?? 0}</span>
									<span>{formatDate(post.createdAt)?.split(" ")[1]}</span>
								</div>
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Pagination Controls */}
			<div className="mt-8 flex items-center justify-between">
				<div className="text-sm text-muted-foreground">
					{loading ? 'Đang tải danh sách...' : `Hiển thị trang ${pagination.page} / ${pagination.totalPages}`}
				</div>
				<div className="flex items-center gap-2">
					<select
						value={limit}
						onChange={(e) => {
							setPage(1);
							setLimit(Number(e.target.value));
						}}
						className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm"
					>
						<option value={5}>5 / trang</option>
						<option value={10}>10 / trang</option>
						<option value={20}>20 / trang</option>
					</select>
					<Button
						variant="outline"
						size="sm"
						onClick={onPrev}
						disabled={pagination.page <= 1}
					>
						‹ Trước
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={onNext}
						disabled={pagination.page >= (pagination.totalPages || 1)}
					>
						Sau ›
					</Button>
				</div>
			</div>
		</div>
	);
}

