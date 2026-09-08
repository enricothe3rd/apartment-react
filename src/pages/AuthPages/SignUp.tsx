import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Sign Up | Property Manager"
        description="Create a Property Manager account to manage properties, tenants, leases, and payments."
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
