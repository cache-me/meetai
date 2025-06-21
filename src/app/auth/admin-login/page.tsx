import Image from 'next/image'
import loginBg from '@/assets/login-bg.png'
import { AdminLoginForm } from './_components/admin-login-form'

export default function AdminLoginPage() {
  return (
    <div className="grid min-h-full w-full lg:grid-cols-2">
      <div className="relative flex h-80 flex-col border-b bg-muted p-4 sm:h-80 lg:min-h-screen lg:border-r">
        <Image src={loginBg} alt="" fill className="object-cover object-top" priority />
      </div>

      <div className="col-span-1">
        <AdminLoginForm />
      </div>
    </div>
  )
}
