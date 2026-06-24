import Dashboard from "@/components/admin/Dashboard";
import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="relative">
      <Link
        href="/"
        className="fixed top-5 right-6 z-20 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-violet-600 transition-all shadow-lg hover:shadow-xl"
      >
        Open Chat
      </Link>
      <Dashboard />
    </div>
  );
}
