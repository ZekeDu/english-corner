import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { NavigationHeader } from "@/components/layout/NavigationHeader";

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavigationHeader title="账户设置" showBack={true} backHref="/" showLogout={true} />
      
      <div className="max-w-4xl mx-auto px-4 py-4">
        <ProfileSettings />
      </div>
    </div>
  );
}