import { auth } from "@/auth"

export default auth((req) => {
  // Protected routes - redirect to login if not authenticated
  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    if (!req.auth) {
      const newUrl = new URL("/login", req.nextUrl.origin)
      return Response.redirect(newUrl)
    }
  }
})

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
}
