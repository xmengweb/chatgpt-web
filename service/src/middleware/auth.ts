import jwt from 'jsonwebtoken'
const auth = async (req, res, next) => {
  try {
    const Authorization = req.header('Authorization')
    if (!Authorization || Authorization.replace('Bearer ', '').trim() === '')
      throw new Error('Error: 无访问权限 | No access rights')
    else next()
  }
  catch (error) {
    res.send({ status: 'Unauthorized', message: error.message ?? 'Please authenticate.', data: null })
  }
}

async function verifyToken(req, res, next) {
  const bearerHeader = req.header('Authorization')
  if (typeof bearerHeader !== 'undefined') {
    // 分离出Bearer令牌
    const bearerToken = bearerHeader.split(' ')[1]
    // 使用jsonwebtoken模块验证JWT令牌
    jwt.verify(bearerToken, 'secret', (err, decoded) => {
      if (err) {
        // 验证失败，返回401错误
        res.status(401).json({ error: 'Failed to authenticate token.' })
      }
      else {
        // 验证成功，将解码后的信息保存到请求对象中
        req.decoded = decoded
        next()
      }
    })
  }
  else { res.status(401).json({ error: 'No token provided.' }) }
  // Authorization头中没有Bearer令牌，返回401错误
}

export { auth, verifyToken }
