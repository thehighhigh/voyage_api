const express = require('express')
const app = express()
const port = 3000
const fs = require('fs')
const readline = require('readline')
const mysql = require('mysql2')

const con = mysql.createConnection({
  host: 'mysql',
  user: 'root',
  password: 'root',
  database: 'voyage_api'
})

con.connect((err) => {
  if (err) {
    console.log('error connecting you are wrong: ' + err.stack)
    return
  }
  console.log('sql connect success')
})

let rl = readline.createInterface({
  input: fs.createReadStream(`${__dirname}/sql/create.sql`),
  terminal: false
 })
rl.on('line', function(chunk){
    con.query(chunk.toString(), function(err, sets, fields){
     if(err) console.log(err)
    })
})
rl.on('close', function(){
  console.log("initial sql migration finished")
})


app.use(express.json())

app.get('/recipies', (req, res) => con.query(`SELECT id, title, making_time, serves, ingredients, cost  FROM recipes`,
  (err, result) => {
    for(let el of result) {
      el.cost = el.cost.toString()
    }
    res.json({ recipies: result })
  }))

app.post('/recipies', (req, res, next) => con.query('INSERT INTO recipes(title, making_time, serves, ingredients, cost) VALUES(?, ?, ?, ?, ?)',
    [
      req.body.title,
      req.body.making_time,
      req.body.serves,
      req.body.ingredients,
      req.body.cost,
    ],
    function (error, results, fields) {
      if(error) {
        return res.json(
          {
            "message": "Recipe creation failed!",
            "required": "title, making_time, serves, ingredients, cost"
          }
        )
      }
      con.query(`SELECT * FROM recipes WHERE id = ?`, results.insertId,
        (err, result) => {
          result[0].cost = result[0].cost.toString()
          return res.json(
            {
              message: "Recipe successfully created!",
              recipies: result 
            }
          )
        }
      )
    }
  )
)

app.get('/recipies/:id', (req, res) => con.query(`SELECT id, title, making_time, serves, ingredients, cost  FROM recipes WHERE id = ?`,
  [req.params.id],
  function (err, result) {
    result[0].cost = result[0].cost.toString()
    return res.json(
      {
        message: "Recipe details by id",
        recipie: result
      }
    )
  }
))

app.patch('/recipies/:id', (req, res) => con.query(`UPDATE recipes SET title = ?, making_time = ?, serves = ?, ingredients = ?, cost = ? WHERE id = ?`,
  [
    req.body.title,
    req.body.making_time,
    req.body.serves,
    req.body.ingredients,
    req.body.cost,
    req.params.id,
  ],
  function(err, results) {
    con.query(`SELECT * FROM recipes WHERE id = ?`, [err ? 1 : req.params.id],
      (err, result) => {
        result[0].cost = result[0].cost.toString()
        let { title, making_time, serves, ingredients, cost } = result[0]
        return res.json(
          {
            message: "Recipe successfully updated!",
            recipies: [
              { title, making_time, serves, ingredients, cost }
            ]
          }
        )
      }
    )
  })
)

app.delete('/recipies/:id', (req, res) => con.query('DELETE FROM recipes WHERE id = ?', req.params.id,
  function (err, result) {
    if(result.affectedRows === 0) {
      return res.json(
        { "message":"No Recipe found" }
      )
    }
    return res.json(
      {  "message": "Recipe successfully removed!" }
    )
  }
))


app.listen(port, () => console.log(`Example app listening on port ${port}!`))