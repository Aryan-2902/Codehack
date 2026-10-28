import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign in · Campus Lab Share" };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-4 text-lg font-semibold">Sign in</h1>
      <AuthForm mode="login" />
    </>
  );
}
