import path, { resolve } from 'path'
import fs from 'fs'
import express from 'express'
import jwt from 'jsonwebtoken'
import axios from 'axios'
import multer from 'multer'
import sharp from 'sharp'
import xlsx from 'xlsx'
import { MD5 } from 'crypto-js'
import type { ChatContext, ChatMessage } from './chatgpt'
import { chatConfig, chatReplyProcess, chatReplyProcess2, createApi, createApi2 } from './chatgpt'
import { auth, verifyToken } from './middleware/auth'
import { database } from './utils/mysql'
import type { IRequestCallBody } from './utils/draw'
import { drawClient } from './utils/draw'
import { put } from './utils/oss'

const app = express()
app.use(express.static('uploads'))
const router = express.Router()
const upload = multer()
const columnArrays = []

function readExcel() {
// 读取 Excel 文件
  const workbook = xlsx.readFile(resolve(__dirname, './midjourney_prompt.xlsx'))

  // 获取第一个工作表
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]

  // 将工作表转换为 JSON 对象
  const jsonData = xlsx.utils.sheet_to_json(worksheet)

  // 遍历 JSON 对象的属性
  Object.keys(jsonData[0]).forEach((key) => {
  // 将每一列的数据存入数组中
    const columnArray = jsonData.map(row => row[key])
    columnArrays.push(columnArray.filter(item => item !== undefined))
  })
}
readExcel()

app.use(express.static('public'))
app.use(express.json())

app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')
  next()
})

function generate_activation_code() {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  let code = ''
  for (let i = 0; i < 8; i++)
    code += chars[Math.floor(Math.random() * chars.length)]
  return code
}
async function getKeyAll() {
  const sql = 'SELECT type,token,bl,isUse,baseUrl FROM system GROUP BY id'
  const resData: any = await database.search(sql)
  createApi2(resData[2].token, 'gpt-4-0613', resData[2].baseUrl)
  createApi(resData[0].token, 'gpt-3.5-turbo-16k', resData[0].baseUrl)
  drawClient.token = resData[1].token
}
getKeyAll()

const logFilePath = path.join(__dirname, 'access.log')

function logAccess(req, res, next) {
  const ip = req.headers['x-real-ip']
  const { method, url, headers } = req
  const timestamp = new Date().toISOString()
  const logEntry = `${timestamp} ${ip} ${method} ${url} ${JSON.stringify(headers)}\n`

  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err)
      console.error(`Failed to log access: ${err}`)
  })

  next()
}

const requestCounter = new Map()
const requestLimit = 30 // 每个 IP 和设备的请求限制
const requestTimeRange = 60 * 1000 // 请求时间范围，单位为毫秒
function checkRequestLimit(req, res, next) {
  const ip = req.headers['x-real-ip']
  const device = req.headers['user-agent'] || ip // 如果没有提供设备标识符，则使用 IP

  const now = Date.now()
  const counterKey = `${ip}-${device}`

  let counter = requestCounter.get(counterKey)
  if (!counter) {
    counter = {
      count: 1,
      lastTime: now,
    }
    requestCounter.set(counterKey, counter)
  }
  else {
    const elapsedTime = now - counter.lastTime
    if (elapsedTime > requestTimeRange) {
      // 如果超过时间范围，则重置计数器
      counter.count = 1
      counter.lastTime = now
    }
    else {
      counter.count++
      counter.lastTime = now
      if (counter.count > requestLimit)
        return res.status(429).send('Too many requests')
    }
  }
  next()
}

router.post('/chat-process', auth, logAccess, async (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream')
  try {
    const { prompt, options = {}, model } = req.body as { prompt: string; options?: ChatContext; model: string }
    const sql = 'SELECT type,token,bl,isUse,baseUrl FROM system GROUP BY id'
    const resData: any = await database.search(sql)
    if (model === 'gpt3' && !resData[0].isUse)
      throw new Error('管理员未开启GPT3.5对话功能')
    else if (model === 'gpt4' && !resData[2].isUse)
      throw new Error('管理员未开启GPT4对话功能')
    let firstChunk = true
    if (model === 'gpt4') {
      await chatReplyProcess2(prompt, options, (chat: ChatMessage) => {
        res.write(firstChunk ? JSON.stringify(chat) : `\n${JSON.stringify(chat)}`)
        firstChunk = false
      })
    }
    else {
      await chatReplyProcess(prompt, options, (chat: ChatMessage) => {
        res.write(firstChunk ? JSON.stringify(chat) : `\n${JSON.stringify(chat)}`)
        firstChunk = false
      })
    }
  }
  catch (error) {
    res.write(error.message ? JSON.stringify({ message: error.message }) : JSON.stringify(error))
  }
  finally {
    res.end()
  }
})

router.post('/config', async (req, res) => {
  try {
    const response = await chatConfig()
    res.send(response)
  }
  catch (error) {
    res.send(error)
  }
})

// 来判读本地是否设置了验证码
router.post('/session', async (req, res) => {
  try {
    const AUTH_CODE = process.env.AUTH_CODE
    const hasAuth = typeof AUTH_CODE === 'string' && AUTH_CODE.length > 0
    res.send({ status: 'Success', message: '', data: { auth: hasAuth } })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

// 验证激活码
router.post('/code', async (req, res) => {
  const { token } = req.body as { token: string }
  const code = token
  try {
    const resData: any = await database.search(`SELECT * FROM codeForm WHERE code = '${code}'`)
    if (resData.length === 0)
      res.json({ status: 'Fail', message: '验证失败, 激活码无效!', data: null })
    else if (resData[0].remain === 0)
      res.json({ status: 'Fail', message: `激活码已用完! 总次数:${resData[0].total} 次, 剩余:${resData[0].remain}次`, data: null })
    else if (resData[0].state === 0)
      res.json({ status: 'Fail', message: '激活码被禁用,请联系管理员', data: null })
    else res.json({ status: 'Success', message: `验证成功!总次数:${resData[0].total} 次, 剩余:${resData[0].remain}次`, data: null })
  }
  catch (error) {
    res.json({ status: 'Fail', message: '验证失败, 激活码无效!', data: null })
  }
})

// 查询激活码
router.post('/getCodeInfo', verifyToken, async (req, res) => {
  const { info, state, remain } = req.body as { info: string; state: number | undefined; remain: number | undefined }
  try {
    let sql = `SELECT * FROM codeform WHERE Id || code || total || remain || notes LIKE '%${info}%'`
    if (typeof state === 'number')
      sql += ` AND state = ${state}`
    if (typeof remain === 'number')
      sql += (remain === 0 ? ' AND remain = 0' : ' AND remain>0')
    const resData: any = await database.search(sql)
    res.json({ status: 'Success', message: '获取成功!', list: resData })
  }
  catch (error) {
    res.json({ status: 'Fail', message: '操作失败!', data: null })
  }
})
// 修改激活码
router.patch('/editCondeInfo', verifyToken, async (req, res) => {
  try {
    const { id, code, total, remain, notes, state } = req.body as { id: string | number; code: string; total: number | undefined; remain: number | undefined;notes: string;state: number | undefined }
    const resDataSearch = await database.search(`SELECT COUNT(*) FROM codeform WHERE code = '${code}'`)
    if (resDataSearch[0]['COUNT(*)'] >= 1) {
      res.json({ status: 'Fail', message: '不允许有重复邀请码!', data: null })
      return
    }
    const sql = 'UPDATE codeform SET code = ?, total = ?, remain = ?, notes = ?, state = ? WHERE Id = ?;'
    const resData: any = await database.run(sql, [code, total, remain, notes || '无备注', state, id])
    res.json({ status: 'Success', message: '更新成功!', info: resData })
  }
  catch (error) {
    res.json({ status: 'Fail', message: '操作失败!', data: null })
  }
})
// 删除激活码
router.post('/deleteCode', verifyToken, async (req, res) => {
  try {
    const { idArray } = req.body as { idArray: [] }
    const placeholders = idArray.map(() => '?').join(', ')
    const sql = `DELETE FROM codeForm WHERE id IN (${placeholders})`
    const resData: any = await database.run(sql, [...idArray])
    res.json({ status: 'Success', message: '删除成功!', info: resData })
    const sqlStatements = [
      'SELECT MAX(id) FROM codeform;',
      'UPDATE codeform SET id = (SELECT COUNT(*) FROM codeform c2 WHERE c2.id <= codeform.id);',
      'UPDATE SQLITE_SEQUENCE SET seq = (SELECT MAX(id) FROM codeform) WHERE name = \'codeform\';',
    ]
    sqlStatements.forEach(async (value) => {
      await database.run(value)
    })
  }
  catch (error) {
    res.json({ status: 'Fail', message: '操作失败!', data: null })
  }
})
// 增加激活码
router.post('/addCode', verifyToken, async (req, res) => {
  try {
    const { code, total, remain, notes, state } = req.body as { code: string; total: number | undefined; remain: number | undefined;notes: string;state: number | undefined }
    const resDataSearch = await database.search(`SELECT COUNT(*) FROM codeform WHERE code = '${code}'`)
    if (resDataSearch[0]['COUNT(*)'] >= 1) {
      res.json({ status: 'Fail', message: '不允许有重复邀请码!', data: null })
      return
    }
    const sql = `INSERT INTO codeform (code, total,remain,notes,state) VALUES ('${code}', ${total}, ${remain},'${notes || '无备注'}',${state})`
    const resData: any = await database.run(sql)
    res.json({ status: 'Success', message: '添加成功!', info: resData })
  }
  catch (error) {
    res.json({ status: 'Fail', message: '操作失败!', data: null })
  }
})
// 一下子增加很多邀请码
router.post('/addManyCode', verifyToken, async (req, res) => {
  const { amount, total, remain, notes, state } = req.body as { amount: number; total: number | undefined; remain: number | undefined;notes: string;state: number | undefined }
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const codes = new Set<string>()
  while (codes.size < amount) {
    let code = ''
    for (let i = 0; i < 8; i++)
      code += chars[Math.floor(Math.random() * chars.length)]
    codes.add(code)
  }
  const myCodes = Array.from(codes)
  let sql = 'INSERT INTO codeform (id, code, total,remain,notes,state) '
  for (let i = 0; i < myCodes.length - 1; i++) {
    sql += `SELECT NULL, '${myCodes[i]}', ${total} ,${remain},'${notes || '无备注'}',${state}
    UNION `
  }
  sql += `SELECT NULL, '${myCodes[myCodes.length - 1]}', ${total} ,${remain},'${notes || '无备注'}',${state}`
  const resData: any = await database.run(sql)
  res.json({ status: 'Success', message: '添加成功!', info: resData })
  await database.run('DELETE FROM codeform WHERE rowid NOT IN (SELECT MIN(rowid) FROM codeform GROUP BY code)')
})
// 查询是否有重复的邀请码
router.get('/isCodeIn/:code', async (req, res) => {
  const { code } = req.params
  const resData = await database.search(`SELECT COUNT(*) FROM codeform WHERE code = '${code}'`)
  res.json({ code: 200, message: resData[0]['COUNT(*)'] >= 1 })
})
// 获取激活码的信息
router.post('/codeRemain', async (req, res) => {
  try {
    const { code } = req.body as { code: string }
    const sql = `SELECT * FROM codeForm WHERE code = "${code}"`
    const resData: any = await database.search(sql)
    if (resData.length === 0)
      res.json({ status: 'Fail', message: '验证失败, 激活码无效!', data: null })
    else if (resData[0].remain === 0)
      res.json({ status: 'Fail', message: `激活码已用完! 总次数:${resData[0].total} 次, 剩余:${resData[0].remain}次`, data: null })
    else if (resData[0].state === 0)
      res.json({ status: 'Fail', message: '激活码被禁用,请联系管理员', data: null })
    else res.json({ status: 'Success', message: '获取成功!', info: resData[0] })
  }
  catch (error) {
    res.json({ status: 'Fail', message: '获取失败!', data: null })
  }
})
const BaseUrl = process.env.SERVER_BASE_URL
// 使用激活码
router.post('/codeUse', async (req, res) => {
  try {
    const { code, type } = req.body as { code: string; type: string }
    const resInfo = (await axios.get('/getArguments', { baseURL: BaseUrl, timeout: 600000 })).data
    let money = 1
    if (type === 'draw')
      money = resInfo.list[1].bl
    else if (type === 'gpt4')
      money = resInfo.list[2].bl
    else money = resInfo.list[0].bl
    const sql = `UPDATE codeForm SET remain = remain-${money} WHERE code = ?`
    await database.run(sql, [code])
    res.json({ status: 'Success', message: '使用成功!', info: null })
  }
  catch (error) {
    res.json({ status: 'Fail', message: '使用失败!', data: error })
  }
})
// 生成一个随机激活码
router.get('/getNewcode', (req, res) => {
  const code = generate_activation_code()
  res.json({ status: 'Success', message: '生成成功!', info: code })
})

router.post('/login', logAccess, (req, res) => {
  const { username, password } = req.body
  // 验证用户名和密码
  if (username === process.env.USER_NAME && password === process.env.USER_PASSWORD) {
    // 生成token
    const token = jwt.sign({ username }, 'secret', { expiresIn: '120h' })
    res.json({ token })
  }
  else {
    res.status(401).send('Invalid username or password')
  }
})

router.get('/veryToken', verifyToken, (req: any, res) => {
  res.json({ status: 'Success', message: '验证成功!', info: req.decoded })
})

router.post('/createImage', auth, logAccess, checkRequestLimit, async (req, res) => {
  const requestBody = req.body as IRequestCallBody
  const { action, fast, prompt, imageId, index } = requestBody
  try {
    const resData = await drawClient.callApi(action, fast, prompt, imageId, index)
    res.json(resData)
  }
  catch (error) {
    res.json({ code: 500, msg: error })
  }
})
router.get('/getImage/:taskId', auth, async (req, res) => {
  const { taskId } = req.params
  try {
    const resData2 = await drawClient.getWebhookStatus(taskId)
    res.json(resData2)
  }
  catch (error) {
    res.json({
      code: 500,
      err: '画图端错误',
    })
  }
})

router.get('/translate/:words', auth, async (req, res) => {
  const { words } = req.params
  const url = 'https://fanyi-api.baidu.com/api/trans/vip/translate'
  const appid = process.env.APPLE_ID
  const key = process.env.TRANSLATE_MY
  const salt = (new Date()).getTime()
  const query = words
  // 多个query可以用\n连接  如 query='apple\norange\nbanana\npear'
  const from = 'auto'
  const to = 'en'
  const str1 = appid + query + salt + key
  const sign = MD5(str1)
  const fy = (await axios.get(url, {
    timeout: 600000,
    params: {
      q: query,
      appid,
      salt,
      from,
      to,
      sign,
    },
  })).data.trans_result[0].dst
  res.json({ ans: fy })
})
router.post('/uploadImg', checkRequestLimit, upload.single('image'), async (req, res) => {
  const response = await put(req.file.originalname, req.file.buffer)
  res.json({ data: { url: response.url } })
})
router.post('/uploadImgUrl', async (req, res) => {
  const urlImg = req.body.urlImg.replace('https://cdn.discordapp.com/', 'http://cg230328.cnns.net/')
  try {
    const response = await axios.get(urlImg, { responseType: 'arraybuffer' })
    const inputBuffer = Buffer.from(response.data, 'binary')
    const segments = urlImg.split('/')
    const imageName = segments[segments.length - 1]
    sharp(inputBuffer)
      .webp()
      .toBuffer(async (err, outputBuffer) => {
        if (!err) {
          const ossres = await put(imageName, outputBuffer)
          res.json({ data: { info: imageName, url: ossres.url } })
        }
      })
  }
  catch (error) {
    res.json({ code: 400, err: '超时' })
  }
})
router.get('/getArguments', async (req, res) => {
  try {
    const sql = 'SELECT type,token,bl,isUse,baseUrl FROM system GROUP BY id'
    const resData: any = await database.search(sql)
    res.json({ status: 'Success', message: '获取成功!', list: resData })
  }
  catch (error) {
    res.json({ status: 'Fail', message: '操作失败!', data: null })
  }
})
router.post('/updateArguments', auth, async (req, res) => {
  const { gpt3, gpt4, draw } = req.body
  const sqls = [
    `UPDATE system SET token = '${gpt3.api}', bl = ${gpt3.fee}, isUse = ${gpt3.isUse}, baseUrl = '${gpt3.baseUrl}' WHERE id = 1`,
    `UPDATE system SET token = '${draw.api}', bl = ${draw.fee}, isUse = ${draw.isUse}, baseUrl = '${draw.baseUrl}' WHERE id = 2`,
    `UPDATE system SET token = '${gpt4.api}', bl = ${gpt4.fee}, isUse = ${gpt4.isUse}, baseUrl = '${gpt4.baseUrl}' WHERE id = 3`,
  ]
  const sendAll = sqls.map((sql) => {
    return new Promise<any>((resolve) => {
      database.run(sql).then(res => resolve(res))
    })
  })
  const resData = await Promise.all(sendAll)
  if (gpt4.api && gpt4.isUse)
    createApi2(gpt4.api, 'gpt-4-0613', gpt4.baseUrl)
  else createApi(gpt3.api, 'gpt-3.5-turbo-16k', gpt3.baseUrl)
  drawClient.token = draw.api
  res.json({ code: 200, message: resData })
})
function getRandomNumber(max) {
  return Math.floor(Math.random() * max)
}
router.post('/getPrompt', checkRequestLimit, async (req, res) => {
  const { arr } = req.body
  let str = ''
  if (arr[0] === 1) {
    str += columnArrays[1][getRandomNumber(columnArrays[1].length)]
    // 物体+地点
    if (arr[1] === 3)
      str += `在${columnArrays[3][getRandomNumber(columnArrays[3].length)]}`
    for (let i = 2; i < arr.length; i++)
      str += `,${columnArrays[arr[i]][getRandomNumber(columnArrays[arr[i]].length)]}`
    res.json({ code: 200, message: str })
  }
  else {
    str += columnArrays[arr[0]][getRandomNumber(columnArrays[arr[0]].length)]
    if (arr.includes(3) && arr.includes(4)) {
      str += `在${columnArrays[3][getRandomNumber(columnArrays[3].length)]}${columnArrays[4][getRandomNumber(columnArrays[4].length)]}`
      for (let i = 3; i < arr.length; i++)
        str += `,${columnArrays[arr[i]][getRandomNumber(columnArrays[arr[i]].length)]}`

      res.json({ code: 200, message: str })
    }
    else if (arr.includes(3) || arr.includes(4)) {
      str += `在${columnArrays[arr[1]][getRandomNumber(columnArrays[arr[1]].length)]}`
      for (let i = 2; i < arr.length; i++)
        str += `,${columnArrays[arr[i]][getRandomNumber(columnArrays[arr[i]].length)]}`
      res.json({ code: 200, message: str })
    }
    else {
      for (let i = 1; i < arr.length; i++)
        str += `,${columnArrays[arr[i]][getRandomNumber(columnArrays[arr[i]].length)]}`
      res.json({ code: 200, message: str })
    }
  }
})
app.use('', router)
app.use('/api', router)

app.listen(3002, () => globalThis.console.log('Server is running on port 3002'))
