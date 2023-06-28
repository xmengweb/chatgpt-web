/* eslint-disable no-console */
import type { Database } from 'sqlite3'
import { verbose } from 'sqlite3'
const sqlite3 = verbose()
// interface IConfig {
//   host: string
//   user: string
//   password: string
//   database: string
// }

class SqliteDatabase {
  private connection: Database
  constructor(path) {
    this.connection = new sqlite3.Database(path, (err) => {
      if (err) {
        console.error('Error connecting to SQLite database: ', err.message)
        return
      }
      console.log('Connected to SQLite database!')
    })
  }

  run(sql: string, args?: any) {
    return new Promise((resolve, reject) => {
      this.connection.run(sql, args, (res, err) => {
        if (err)
          reject(err)
        else resolve(res)
      })
    })
  }

  search(sql: string, args?: []) {
    return new Promise((resolve, reject) => {
      this.connection.all(sql, args, (err, rows) => {
        if (err)
          reject(err.message)
        else resolve(rows)
      })
    })
  }

  close() {
    this.connection.close((err) => {
      if (err)
        console.error(err.message)
      console.log('Database connection closed.')
    })
  }
}

// class MysqlDatabase {
//   private connection: any
//   constructor(config: string | IConfig | mysql.ConnectionConfig) {
//     this.connection = mysql.createConnection(config)
//     this.connection.connect((err) => {
//       if (err)
//         throw err

//       console.log('Connected to MySQL database')
//     })
//   }

//   query(sql: any, args?: any) {
//     return new Promise((resolve, reject) => {
//       this.connection.query(sql, args, (err: any, rows: unknown) => {
//         if (err)
//           reject(err)
//         resolve(rows)
//       })
//     })
//   }

//   close() {
//     return new Promise((resolve, reject) => {
//       this.connection.end((err) => {
//         if (err)
//           reject(err)
//         resolve('closed ok')
//       })
//     })
//   }
// }

// const config: IConfig = {
//   host: process.env.MYSQL_HOST,
//   user: process.env.MYSQL_USER,
//   password: process.env.MYSQL_PASSWORD,
//   database: process.env.MYSQL_DATABASE,
// }

export const database = new SqliteDatabase(process.env.SQLITE_PATH)

// module.exports = {
//   database,
// }
