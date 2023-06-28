export interface IDrawIng {
  success: boolean
  message: string
  code: number
  result: Result
  timestamp: number
}

interface Result {
  msg: string
  taskId: string
}

export interface IDrawResult {
  success: boolean
  message: string
  code: number
  result: Result2
  timestamp: number
}

interface Result2 {
  id: string
  taskId: string
  status: number
  type: string
  userId: string
  prompt: string
  imageIndex: any
  imageUrl: string
  imageId: string
  msg: string
  createBy: any
  createTime: string
  updateTime: string
  updateBy: any
}


