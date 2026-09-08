import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Sign In | Property Manager"
        description="Sign in to the Property Manager dashboard to manage properties, tenants, leases, and payments."
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
