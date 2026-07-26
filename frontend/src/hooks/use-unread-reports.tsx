import { useEffect, useState, useRef } from "react";
import { adminApi } from "@/services/admin.service";
import toast from "react-hot-toast";
import { Flag } from "lucide-react";

export function useUnreadReports() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const previousCount = useRef(0);

  useEffect(() => {
    const fetchUnreadReports = async () => {
      try {
        const { data } = await adminApi.getReports({ 
          page: 1, 
          status: "PENDING" 
        });
        const newCount = data.total || 0;
        
        // Show toast notification if there's a new report
        if (!isLoading && newCount > previousCount.current) {
          const diff = newCount - previousCount.current;
          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                        <Flag className="h-5 w-5 text-red-600" />
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Laporan Baru
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {diff} laporan baru dari pengguna
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-gray-200">
                  <button
                    onClick={() => {
                      toast.dismiss(t.id);
                      window.location.href = '/admin/reports';
                    }}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
                  >
                    Lihat
                  </button>
                </div>
              </div>
            ),
            {
              duration: 5000,
              position: 'top-right',
            }
          );
        }
        
        previousCount.current = newCount;
        setUnreadCount(newCount);
      } catch (error) {
        console.error("Failed to fetch unread reports:", error);
        setUnreadCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnreadReports();

    // Poll every 30 seconds for new reports
    const interval = setInterval(fetchUnreadReports, 30000);

    return () => clearInterval(interval);
  }, [isLoading]);

  return { unreadCount, isLoading };
}
