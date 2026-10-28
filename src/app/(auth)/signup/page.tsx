import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Create account · Campus Lab Share" };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-4 text-lg font-semibold">Create your account</h1>
      <AuthForm mode="signup" />
    </>
  );
}
