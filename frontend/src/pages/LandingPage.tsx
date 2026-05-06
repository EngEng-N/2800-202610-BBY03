import { TriangleAlert, FileSearch, MapPin } from 'lucide-react'

export default function LandingPage() {
    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-6 py-10 overflow-hidden">
            
            {/* Background img */}
            <img
                src="/bg.jpg"
                alt="background"
                className="absolute top-0 left-0 w-full h-full object-cover z-0"
            />

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/60 z-0" />

            {/* Hero text */}
             <div className="relative w-full max-w-sm mx-auto flex flex-col items-center text-center text-white mt-8 z-10">
                <h1 className="text-6xl font-bold tracking-tight drop-shadow-lg">
                    App Name
                </h1>
                <p className="mt-3 text-base font-light text-white/70 max-w-xs">
                    The go-to tool for contractors and city planners alike
                </p>
            </div>

            { /* Feature icons*/ }
            <div className="relative w-full max-w-sm mx-auto flex flex-col items-center gap-8 z-10">

                {/* Feature 1 */}
                <div className="flex flex-col items-center text-center text-white gap-2">
                    <TriangleAlert size={44} strokeWidth={1.5} />
                    <p className="text-lg font-medium">Find high vulnerability areas</p>
                </div>

                {/* Feature 2 */}
                <div className="flex flex-col items-center text-center text-white gap-2">
                    <FileSearch size={44} strokeWidth={1.5} />
                    <p className="text-lg font-medium">Generate reports instantly</p>
                </div>

                {/* Feature 3 */}
                <div className="flex flex-col items-center text-center text-white gap-2">
                    <MapPin size={44} strokeWidth={1.5} />
                    <p className="text-lg font-medium">Find your optimal location</p>
                </div>

            </div>

            {/* Proceed button */}
                <div className="relative w-full max-w-sm mx-auto mt-12 z-10">
                    <button className="w-full bg-white text-black font-semibold text-lg py-4 rounded-full shadow-lg hover:bg-white/90 active:scale-95 transition-all duration-200">
                        Get Started For Free
                    </button>
                </div>
        </div>
    )
}