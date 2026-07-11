"use client";

import { getActiveDoctors } from '@/apis/admin/admin.api';
import { getAllReviews } from '@/apis/review/review.api';
import { getAllDoctorPosts, increaseDoctorPostView } from '@/apis/doctor-post/doctor-post.api';
import Banner from "@/components/banner";
import Footer from "@/components/footer";
import { getPublicNews } from "@/apis/admin/news.api";
import Navbar from "@/components/navbar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Play, Eye } from "lucide-react";

// Fallback static names used when API returns no doctors
const fallbackNames = ["Chí", "Daniel", "Hiếu", "Minh"];

export default function Home() {
  const router = useRouter();

  const [apiDoctors, setApiDoctors] = useState<any[]>([]);
  const [apiReviews, setApiReviews] = useState<any[]>([]);
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [doctorPosts, setDoctorPosts] = useState<any[]>([]);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [trackedPostIds, setTrackedPostIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // fetch a small set of active doctors to display on homepage
    const fetch = async () => {
      try {
        const res = await getActiveDoctors({ page: 1, limit: 8 });
        // Response may be wrapped or direct array; support common shapes
        const docs = res?.data?.items ?? res?.items ?? res?.data ?? [];
        setApiDoctors(Array.isArray(docs) ? docs : []);
      } catch (e) {
        console.error('Failed to load active doctors for homepage', e);
      }
    };
    fetch();
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await getPublicNews();
        const items = res?.data ?? [];
        setNewsItems(Array.isArray(items) ? items : []);
      } catch (e) {
        console.error('Failed to load public news', e);
      }
    };
    fetchNews();
  }, []);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await getAllReviews();
        // DataResponse wrapper: res?.data may be the array, or res itself may be the array
        const items = res?.data ?? res ?? [];
        setApiReviews(Array.isArray(items) ? items : []);
      } catch (e) {
        console.error('Failed to load reviews for homepage', e);
      }
    };
    fetchReviews();
  }, []);

  useEffect(() => {
    const fetchDoctorPosts = async () => {
      try {
        const res = await getAllDoctorPosts({ page: 1, limit: 6 });
        const items = res?.data?.items ?? res?.data ?? [];
        setDoctorPosts(Array.isArray(items) ? items : []);
      } catch (e) {
        console.error('Failed to load doctor posts for homepage', e);
      }
    };
    fetchDoctorPosts();
  }, []);

  useEffect(() => {
    // Track views for newly loaded posts
    doctorPosts.forEach((post: any) => {
      if (post._id && !trackedPostIds.has(post._id)) {
        // Mark as tracked
        setTrackedPostIds(prev => new Set(prev).add(post._id));
        
        // Increment view count
        const incrementView = async () => {
          try {
            await increaseDoctorPostView(post._id);
            setViewCounts(prev => ({
              ...prev,
              [post._id]: (prev[post._id] ?? post?.viewCount ?? 0) + 1
            }));
          } catch (error) {
            console.error('Failed to increment view:', error);
          }
        };
        
        incrementView();
      }
    });
  }, [doctorPosts, trackedPostIds]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const role = (localStorage.getItem('role') || '').toUpperCase();
    // If no role, stay on public homepage
    if (!role) return;

    // Redirect based on role
    if (role === 'ADMIN') {
      router.replace('/admin/patients');
    } else if (role === 'DOCTOR') {
      router.replace('/doctor/patients');
    } else if (role === 'RECEPTIONIST') {
      router.replace('/receptionist/visits');
    }
  }, [router]);

  return (
    <main className="bg-background text-foreground">
      {/* Banner */}
      <div className="w-full bg-[url('/assets/banner-bg.jpg')] bg-cover bg-center">
        <div className="w-full h-full bg-background/80">
          <div className="max-w-7xl mx-auto">
            <Navbar />
            <Banner />
          </div>
        </div>
      </div>

      {/* About Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-3xl font-bold mb-4">
            Về <span className="text-blue-600 dark:text-blue-400">Doctor+</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Doctor+ là nền tảng chăm sóc sức khỏe toàn diện, cung cấp dịch vụ khám
            chữa bệnh trực tuyến và trực tiếp, kết nối bác sĩ với bệnh nhân nhanh chóng,
            an toàn và hiệu quả.
          </p>
          <a
            href="/gioi-thieu"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
          >
            Tìm hiểu thêm
          </a>
        </div>
        <Image
          src="/assets/about-hospital.png"
          alt="Hospital"
          width={700}
          height={400}
          className="rounded-xl shadow-lg"
        />
      </section>

      {/* Services */}
      <section className="bg-gray-50 dark:bg-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-10">Dịch vụ nổi bật</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Khám tổng quát",
                desc: "Dịch vụ khám sức khỏe định kỳ, phát hiện bệnh sớm.",
                img: "/assets/kham-tong-quat.jpg",
              },
              {
                title: "Khám từ xa",
                desc: "Kết nối với bác sĩ qua video call mọi lúc, mọi nơi.",
                img: "/assets/kham-tu-xa.jpg",
              },
              {
                title: "Xét nghiệm",
                desc: "Dịch vụ xét nghiệm máu, nước tiểu và nhiều hơn nữa.",
                img: "/assets/xet-nghiem.jpg",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow hover:shadow-lg transition"
              >
                <Image
                  src={s.img}
                  alt={s.title}
                  width={400}
                  height={250}
                  className="rounded-lg mb-4"
                />
                <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-10">Đội ngũ bác sĩ</h2>
        <Carousel>
          <CarouselContent>
            {(function renderDoctors() {
              return (apiDoctors.length ? apiDoctors : fallbackNames).map((d: any, idx: number) => {
                const avatarUrl = d?.profile?.avatarUrl ?? d?.profileId?.avatarUrl ?? d?.avatar ?? null;
                const name = d?.doctorName ?? d?.profile?.name ?? d?.profileId?.name ?? (typeof d === 'string' ? d : `Bác sĩ ${idx + 1}`);
                const specialty = d?.chuyenKhoa?.name ?? d?.chuyenKhoaId?.name ?? d?.specialty ?? 'Chuyên khoa';
                const fallbackImg = `/assets/bs/bs-${(name || '').toString().split(' ')[1] || `default-${idx}`}.jpg`;
                return (
                  <CarouselItem key={d?._id ?? d?.id ?? `fallback-${idx}`} className="basis-1/1 md:basis-1/2 lg:basis-1/3">
                    <div className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow text-center h-[450px] flex flex-col items-center justify-center">
                      <div className="w-[200px] h-[350px] mb-4">
                        {avatarUrl ? (

                          <img src={String(avatarUrl)} alt={name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <Image src={fallbackImg} alt={name} width={200} height={200} className="w-full h-full object-cover rounded-xl" />
                        )}
                      </div>
                      <h3 className="font-semibold text-lg">{name}</h3>
                      <p className="text-gray-500 text-sm">{specialty}</p>
                    </div>
                  </CarouselItem>
                );
              });
            })()}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </section>


      <section className="bg-gray-50 dark:bg-gray-800 py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-10">Phản hồi bệnh nhân</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {apiReviews && apiReviews.length > 0 ? (
              apiReviews.map((r: any, i: number) => {
                const comment = r?.comment ?? r?.message ?? '';
                const patientName = r?.patientId?.profileId?.name ?? r?.patientId?.name ?? `Bệnh nhân ${i + 1}`;
                return (
                  <div key={r._id ?? i} className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow">
                    <p className="italic">“{comment}”</p>
                    <div className="mt-4 text-sm font-semibold">- {patientName}</div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Chưa có phản hồi nào.</p>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-10">Video & Bài viết từ Bác sĩ</h2>
        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctorPosts && doctorPosts.length > 0 ? (
              doctorPosts.map((post: any) => {
                const doctorName = post?.doctorId?.doctorName ?? 'Bác sĩ';
                const title = post?.title ?? 'Không có tiêu đề';
                const description = post?.description ?? '';
                const videoUrl = post?.postLink ?? '';
                const currentViewCount = viewCounts[post._id] ?? (post?.viewCount ?? 0);
                
                return (
                  <div
                    key={post._id}
                    className="group bg-white dark:bg-gray-900 rounded-b-3xl shadow-lg hover:shadow-2xl transition overflow-hidden flex flex-col mx-auto w-full max-w-[320px] aspect-[8.94/19]"
                  >
                    <div className="relative flex-1 bg-gray-300 dark:bg-gray-800 overflow-hidden">
                      {videoUrl ? (
                        <video
                          controls
                          preload="metadata"
                          src={videoUrl}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col gap-2">
                      <div>
                        <h3 className="font-bold text-sm mb-1 line-clamp-2 group-hover:text-blue-600 transition">
                          {title}
                        </h3>
                        
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                          {description}
                        </p>
                      </div>

                      {/* Doctor Name & Stats */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                          {doctorName}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Eye className="w-3 h-3" />
                          <span>{currentViewCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 text-lg">Chưa có bài viết nào.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {(newsItems.length ? newsItems : []).map((n) => (
            <Link
              key={n._id}
              href={`/tin-tuc/${n._id}`}
              className="block text-left bg-white dark:bg-gray-900 rounded-xl shadow hover:shadow-lg transition overflow-hidden"
            >
              {n.imageUrl ? (
                <Image
                  src={n.imageUrl}
                  alt={n.title}
                  width={400}
                  height={250}
                  className="w-full h-[250px] object-cover"
                />
              ) : (
                <div className="w-full h-[250px] bg-gray-200 dark:bg-gray-800" />
              )}
              <div className="p-4">
                <h3 className="font-semibold mb-2">{n.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {new Date(n.startDate).toLocaleDateString()} - {new Date(n.endDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 whitespace-pre-line">
                  {n.content}
                </p>
              </div>
            </Link>
          ))}
        </div>

      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}
