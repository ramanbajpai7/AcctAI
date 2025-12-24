import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Accountant</h1>
            <p className="text-muted-foreground text-sm">Automation Platform</p>
          </div>

          <Suspense fallback={<div>Loading...</div>}>
            <LoginForm />
          </Suspense>

          <div className="mt-8 pt-8 border-t border-border">
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-3 font-semibold">Demo Credentials:</p>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="font-medium text-foreground">Accountant:</p>
                  <p className="text-muted-foreground">accountant@example.com / demo123</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Junior:</p>
                  <p className="text-muted-foreground">junior@example.com / demo123</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
