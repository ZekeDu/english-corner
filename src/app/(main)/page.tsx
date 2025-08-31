import Link from 'next/link';

export default function EnglishCornerPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-50 to-white">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-blue-700 mb-2">英语角</h1>
        <p className="text-gray-600">与AI练习英语表达，提升口语能力</p>
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          <p className="text-gray-700 mb-4">
            欢迎来到英语角！这里你可以与AI进行英语对话练习。
          </p>
          <div className="space-y-4">
            <Link
              href="/"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors inline-block text-center"
            >
              开始对话
            </Link>
            <Link
              href="/history"
              className="w-full border border-blue-600 text-blue-600 py-3 px-4 rounded-lg hover:bg-blue-50 transition-colors inline-block text-center"
            >
              查看历史
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}