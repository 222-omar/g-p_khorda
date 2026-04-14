'use client';

export function ProductCardSkeleton() {
    return (
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700/60 animate-pulse">
            {/* Image Section */}
            <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-700/50 w-full" />

            {/* Content Section */}
            <div className="p-4">
                {/* Title */}
                <div className="h-5 bg-slate-200 dark:bg-slate-700/50 rounded-md w-3/4 mb-3" />
                
                {/* Price and Details */}
                <div className="flex justify-between items-end mb-4">
                    <div className="space-y-2">
                        <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded-md w-10" />
                        <div className="h-6 bg-slate-200 dark:bg-slate-700/50 rounded-md w-24" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded-md w-16" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded-md w-20" />
                    </div>
                </div>

                {/* Seller Footer */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700/50" />
                        <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded-md w-24" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700/50" />
                </div>
            </div>
        </div>
    );
}
