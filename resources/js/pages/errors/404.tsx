import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { Home, MoveLeft } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
            <div className="space-y-2">
                <p className="text-7xl font-bold tracking-tight text-muted-foreground/30">404</p>
                <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
                <p className="max-w-sm text-sm text-muted-foreground">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => router.visit('/dashboard')} className="gap-2">
                    <Home className="h-4 w-4" />
                    Go to Dashboard
                </Button>
                <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
                    <MoveLeft className="h-4 w-4" />
                    Go Back
                </Button>
            </div>
        </div>
    );
}
