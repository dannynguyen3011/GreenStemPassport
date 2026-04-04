'use client'

import { useState } from 'react'
import { useProfileStore } from '@/store/useProfileStore'
import { calculateOCS } from '@/lib/ocs'
import { Bell, ChevronDown, Plus, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface TopbarProps {
  title: string
}

export function Topbar({ title }: TopbarProps) {
  const { profile, activities, currentUserId, userOptions, setCurrentUser, createUser } = useProfileStore()
  const { total_ocs } = calculateOCS(activities, profile.target_major)
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [grade, setGrade] = useState<10 | 11 | 12>(10)
  const [schoolName, setSchoolName] = useState('')
  const [province, setProvince] = useState('')
  const [targetMajor, setTargetMajor] = useState<'cntt' | 'toan_thong_ke'>('cntt')

  const canCreate = displayName.trim().length >= 2 && schoolName.trim().length >= 2

  const handleCreate = () => {
    if (!canCreate) return
    createUser({
      display_name: displayName.trim(),
      grade,
      school_name: schoolName.trim(),
      province: province.trim() || 'Chưa cập nhật',
      target_major: targetMajor,
    })
    setDisplayName('')
    setGrade(10)
    setSchoolName('')
    setProvince('')
    setTargetMajor('cntt')
    setOpen(false)
  }

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-3 sm:px-6 shrink-0 gap-2">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <h1 className="text-base sm:text-lg font-semibold text-gray-800 truncate">{title}</h1>
        <label className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
          <Users className="w-4 h-4 text-gray-400 hidden sm:block" />
          <span className="sr-only">Chọn hồ sơ demo</span>
          <select
            value={currentUserId}
            onChange={(e) => setCurrentUser(e.target.value)}
            className="w-[140px] sm:w-[220px] border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            title="Đổi user — mỗi user có dữ liệu profile & portfolio riêng (demo)"
          >
            {userOptions.map((opt) => (
              <option key={opt.user_id} value={opt.user_id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            <Plus className="h-3.5 w-3.5" />
            Tạo user
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tạo user mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <label className="text-xs text-gray-600">Tên hiển thị</label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="VD: Trần Minh Anh" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Lớp</label>
                  <select
                    title="Chọn khối lớp"
                    value={grade}
                    onChange={(e) => setGrade(Number(e.target.value) as 10 | 11 | 12)}
                    className="w-full h-8 rounded-lg border border-gray-200 px-2 text-sm bg-white"
                  >
                    <option value={10}>Lớp 10</option>
                    <option value={11}>Lớp 11</option>
                    <option value={12}>Lớp 12</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Ngành mục tiêu</label>
                  <select
                    title="Chọn ngành mục tiêu"
                    value={targetMajor}
                    onChange={(e) => setTargetMajor(e.target.value as 'cntt' | 'toan_thong_ke')}
                    className="w-full h-8 rounded-lg border border-gray-200 px-2 text-sm bg-white"
                  >
                    <option value="cntt">CNTT</option>
                    <option value="toan_thong_ke">Toán & Thống kê</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-600">Trường</label>
                <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="VD: THPT Chuyên Lam Sơn" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-600">Tỉnh/Thành</label>
                <Input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="VD: Thanh Hóa" />
              </div>
              <button
                onClick={handleCreate}
                disabled={!canCreate}
                className="w-full h-9 rounded-lg bg-green-600 text-white text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-700"
              >
                Tạo và chuyển sang user mới
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-semibold text-green-700">OCS {total_ocs}</span>
          <span className="text-xs text-green-600">/100</span>
        </div>
        <button className="relative text-gray-500 hover:text-gray-700 hidden sm:block">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">2</span>
        </button>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1">
          <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
            {profile.display_name.charAt(0)}
          </div>
          <div className="text-sm hidden md:block">
            <div className="font-medium text-gray-700 leading-tight">{profile.display_name}</div>
            <div className="text-xs text-gray-500">Lớp {profile.grade} · {profile.school_name}</div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </header>
  )
}
