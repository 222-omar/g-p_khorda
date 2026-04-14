'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { profilesAPI, productsAPI, chatAPI } from '@/lib/api';
import { ProductCard } from '@/components/ui/product-card';
import { Loader2, User as UserIcon, Star, MapPin, Package, ShieldCheck, Calendar, BadgeCheck, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/providers/auth-provider';

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRating, setIsRating] = useState(false);
    const [isContacting, setIsContacting] = useState(false);

    const normaliseCard = (p: any) => ({
        id: p.id.toString(),
        title: p.title,
        price: parseFloat(p.price),
        image: p.primary_image || p.images?.[0]?.image || '/placeholder.png',
        isAuction: p.is_auction || false,
        category: p.category,
        description: p.description || '',
        endTime: p.auction_end_time,
        createdAt: p.created_at,
        status: p.status || 'active',
        seller: p.seller,
    });

    const fetchUserData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Fetch profile data
            const profileData = await profilesAPI.getPublicProfile(resolvedParams.id);
            setProfile(profileData);
            
            // Fetch seller products
            const productsData = await productsAPI.list({ owner: resolvedParams.id });
            const productsList = Array.isArray(productsData) ? productsData : (productsData as any).results || [];
            
            // Just show their active/sold products
            setProducts(productsList.map(normaliseCard));
            
        } catch (err: any) {
            console.error('Error fetching public profile:', err);
            setError('تعذر تحميل بيانات البائع. قد يكون الحساب غير موجود.');
        } finally {
            setLoading(false);
        }
    }, [resolvedParams.id]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const handleContact = async () => {
        if (!user) {
            router.push('/login?redirect=/user/' + resolvedParams.id);
            return;
        }
        try {
            setIsContacting(true);
            const conversation = await chatAPI.getOrCreateConversation(null, resolvedParams.id);
            router.push(`/messages?conversation=${conversation.id}`);
        } catch (err) {
            console.error('Error starting conversation:', err);
            alert('حدث خطأ أثناء فتح المحادثة');
        } finally {
            setIsContacting(false);
        }
    };

    const handleRate = async (rating: number) => {
        if (!user) {
            router.push('/login?redirect=/user/' + resolvedParams.id);
            return;
        }
        try {
            setIsRating(true);
            const res = await profilesAPI.rateUser(resolvedParams.id, rating);
            // Update UI with new rating locally
            setProfile(p => ({
                ...p,
                seller_rating: res.new_rating,
                rating_count: res.rating_count
            }));
            alert('تم تقييم البائع بنجاح!');
        } catch (err: any) {
            alert(err.response?.data?.error || 'حدث خطأ أثناء تقييم البائع');
        } finally {
            setIsRating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center pt-20">
                    <Loader2 className="animate-spin text-primary" size={40} />
                </div>
                <Footer />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center pt-20 text-center px-4">
                    <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4">
                        <UserIcon size={40} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">الملف الشخصي غير متاح</h2>
                    <p className="text-slate-500 max-w-md">{error}</p>
                </div>
                <Footer />
            </div>
        );
    }

    const joinedDate = new Date(profile.joined_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
            <Navbar />
            
            <main className="flex-1 pt-24 pb-12 w-full max-w-6xl mx-auto px-4 lg:px-8">
                {/* Profile Header Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 mb-8"
                >
                    {/* Cover Background */}
                    <div className="h-32 md:h-48 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 w-full relative overflow-hidden border-b border-primary/20">
                        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
                    </div>
                    
                    <div className="px-6 md:px-10 pb-8 flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 md:-mt-20 relative z-10">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-slate-800 overflow-hidden bg-slate-100 shadow-xl">
                                {profile.avatar ? (
                                    <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <UserIcon size={64} />
                                    </div>
                                )}
                            </div>
                            {profile.is_verified && (
                                <div className="absolute bottom-2 right-2 bg-white rounded-full">
                                    <BadgeCheck size={28} className="text-blue-500" />
                                </div>
                            )}
                        </div>
                        
                        {/* Title & Info */}
                        <div className="flex-1 text-center md:text-right mt-2 md:mt-0 md:pb-2">
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex flex-wrap items-center justify-center md:justify-start gap-2">
                                {profile.name}
                            </h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-slate-500 dark:text-slate-400 text-sm">
                                {profile.city && (
                                    <span className="flex items-center gap-1">
                                        <MapPin size={16} /> 
                                        {profile.city}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Calendar size={16} /> 
                                    انضم في {joinedDate}
                                </span>
                            </div>
                        </div>
                        
                        {/* Action Buttons */}
                        {user?.id?.toString() !== profile.user_id?.toString() && (
                            <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                                <button 
                                    onClick={handleContact}
                                    disabled={isContacting}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
                                >
                                    {isContacting ? <Loader2 className="animate-spin" size={20} /> : <MessageCircle size={20} />}
                                    مراسلة البائع
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Stats Sidebar */}
                    <div className="lg:col-span-1 space-y-4">
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700"
                        >
                            <h3 className="font-bold text-lg mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                                إحصائيات البائع
                            </h3>
                            
                            <div className="flex flex-col gap-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-lg">
                                            <Star size={20} />
                                        </div>
                                        <span className="font-medium">التقييم العام</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="font-black text-lg">{profile.seller_rating || 0} / 5</span>
                                        <span className="text-xs text-slate-400">({profile.rating_count || 0} تقييم)</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <span className="font-medium">درجة الموثوقية</span>
                                    </div>
                                    <span className="font-black text-lg">{profile.trust_score || 0}%</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                                            <Package size={20} />
                                        </div>
                                        <span className="font-medium">المبيعات الناجحة</span>
                                    </div>
                                    <span className="font-black text-lg">{profile.total_sales || 0}</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Rating Component */}
                        {user?.id?.toString() !== profile.user_id?.toString() && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mt-6 text-center"
                            >
                                <h4 className="font-bold mb-4 text-slate-800 dark:text-slate-200">قيّم هذا البائع</h4>
                                <div className="flex items-center justify-center gap-2 flex-row-reverse">
                                    {[5, 4, 3, 2, 1].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => handleRate(star)}
                                            disabled={isRating}
                                            className="text-slate-300 dark:text-slate-600 hover:text-yellow-400 transition-colors"
                                        >
                                            <Star size={32} className="hover:fill-yellow-400 peer peer-hover:fill-yellow-400" />
                                        </button>
                                    ))}
                                </div>
                                <style dangerouslySetInnerHTML={{__html: `
                                    .flex-row-reverse > button:hover ~ button > svg { fill: #facc15; color: #facc15; }
                                `}} />
                            </motion.div>
                        )}
                    </div>

                    {/* Products Grid */}
                    <div className="lg:col-span-3">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <Package size={20} />
                            </div>
                            <h2 className="text-xl font-bold">منتجات وإعلانات البائع ({products.length})</h2>
                        </div>

                        {products.length === 0 ? (
                            <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                    <Package size={32} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">لا توجد منتجات</h3>
                                <p className="text-slate-500">هذا البائع لم يقم بإضافة أي منتجات أو إعلانات بعد.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                {products.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        onDelete={() => {}}
                                        isOwner={false}
                                        isAdmin={false}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
            
            <Footer />
        </div>
    );
}
