import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-4">
                <div className="text-6xl font-black text-saffron-500">404</div>
                <h1 className="text-2xl font-bold text-espresso-900">Page Not Found</h1>
                <p className="text-espresso-600">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <div className="flex gap-3 justify-center pt-2">
                    <Link
                        href="/"
                        className="px-5 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white font-bold text-sm transition shadow-sm"
                    >
                        Back to Home
                    </Link>
                    <Link
                        href="/delivery?branch=1"
                        className="px-5 py-2.5 rounded-xl bg-cream-200 hover:bg-cream-300 text-espresso-800 font-bold text-sm transition"
                    >
                        Order Food
                    </Link>
                </div>
            </div>
        </div>
    );
}
