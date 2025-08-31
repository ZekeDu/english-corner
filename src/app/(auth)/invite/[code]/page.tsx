import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { InviteService } from '@/lib/invite';
import { RegisterForm } from '@/components/auth/RegisterForm';

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const session = await auth();
  
  // 如果用户已登录，重定向到首页
  if (session) {
    redirect('/');
  }

  const { code } = await params;
  
  // 验证邀请码
  const validation = await InviteService.validateInvite(code);
  
  if (!validation.valid || !validation.invite) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">邀请码无效</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{validation.message}</p>
            <a
              href="/register"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              直接注册
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { invite } = validation;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* 邀请信息 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">欢迎加入英语角！</h1>
            <p className="text-gray-600 dark:text-gray-400">
              您收到来自 <span className="font-semibold text-blue-600">{invite.inviter.nickname || invite.inviter.email}</span> 的邀请
            </p>
            <div className="mt-4 p-3 bg-white dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">邀请码</div>
              <div className="text-xl font-mono font-bold text-blue-600">{invite.inviteCode}</div>
            </div>
          </div>

          {/* 注册表单 */}
          <div className="p-6">
            <RegisterForm inviteCode={invite.inviteCode} invitedEmail={invite.invitedEmail} />
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            已有账户？ <a href="/login" className="text-blue-600 hover:text-blue-700">立即登录</a>
          </p>
        </div>
      </div>
    </div>
  );
}